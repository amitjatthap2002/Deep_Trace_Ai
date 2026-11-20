import os
import shutil
import socket
from pathlib import Path
from minio import Minio
from minio.error import S3Error
from app.config import settings

# Base directory for local fallback storage (when MinIO is not running)
LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent / "uploads"


class LocalStorageClient:
    """Fallback local disk storage when MinIO is not running."""

    def __init__(self, base_dir=LOCAL_STORAGE_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, bucket: str, object_name: str) -> Path:
        p = self.base_dir / bucket / object_name
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def bucket_exists(self, bucket: str) -> bool:
        return (self.base_dir / bucket).exists()

    def make_bucket(self, bucket: str):
        (self.base_dir / bucket).mkdir(parents=True, exist_ok=True)

    def put_object(self, bucket: str, object_name: str, data, length: int, content_type: str = "application/octet-stream"):
        target_path = self._get_path(bucket, object_name)
        with open(target_path, "wb") as f:
            if hasattr(data, "read"):
                shutil.copyfileobj(data, f)
            elif isinstance(data, bytes):
                f.write(data)
            else:
                f.write(bytes(data))

    def fget_object(self, bucket: str, object_name: str, file_path: str):
        source_path = self._get_path(bucket, object_name)
        if not source_path.exists():
            raise FileNotFoundError(f"Object {bucket}/{object_name} not found in local storage")
        shutil.copyfile(source_path, file_path)

    def get_object(self, bucket: str, object_name: str):
        source_path = self._get_path(bucket, object_name)
        if not source_path.exists():
            raise FileNotFoundError(f"Object {bucket}/{object_name} not found in local storage")
        return open(source_path, "rb")

    def remove_object(self, bucket: str, object_name: str):
        source_path = self._get_path(bucket, object_name)
        if source_path.exists():
            try:
                source_path.unlink()
            except Exception:
                pass


_minio_checked = False
_minio_available = False


def is_minio_running() -> bool:
    global _minio_checked, _minio_available
    if _minio_checked:
        return _minio_available

    endpoint_val = getattr(settings, "MINIO_ENDPOINT", "") or settings.MINIO_URL
    endpoint = endpoint_val.replace("http://", "").replace("https://", "")
    host = endpoint.split(":")[0]
    port = int(endpoint.split(":")[1]) if ":" in endpoint else 9000

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.4)
        s.connect((host, port))
        s.close()
        _minio_available = True
    except Exception:
        _minio_available = False

    _minio_checked = True
    mode = "MinIO Object Storage" if _minio_available else "Local Disk Storage (fallback)"
    print(f"[Storage] Using {mode} at {LOCAL_STORAGE_DIR}")
    return _minio_available


def get_minio_client():
    if is_minio_running():
        endpoint_val = getattr(settings, "MINIO_ENDPOINT", "") or settings.MINIO_URL
        endpoint = endpoint_val.replace("http://", "").replace("https://", "")
        return Minio(
            endpoint,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False
        )
    return LocalStorageClient()


def ensure_bucket_exists():
    client = get_minio_client()
    try:
        found = client.bucket_exists(settings.MINIO_BUCKET_NAME)
        if not found:
            client.make_bucket(settings.MINIO_BUCKET_NAME)
            print(f"[Storage] Created bucket/directory: {settings.MINIO_BUCKET_NAME}")
    except Exception as exc:
        print(f"[Storage] Note during bucket check: {exc}")


def upload_file_to_minio(file_stream, file_name, file_size, content_type):
    client = get_minio_client()
    try:
        client.put_object(
            settings.MINIO_BUCKET_NAME,
            file_name,
            file_stream,
            file_size,
            content_type=content_type
        )
        return f"{settings.MINIO_BUCKET_NAME}/{file_name}"
    except Exception as exc:
        print(f"[Storage] Error uploading file: {exc}")
        raise exc
