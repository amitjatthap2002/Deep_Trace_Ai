from minio import Minio
from minio.error import S3Error
from app.config import settings

def get_minio_client():
    # Remove http:// or https:// from MINIO_URL if present because minio python client expects just the endpoint
    endpoint = settings.MINIO_URL.replace("http://", "").replace("https://", "")
    client = Minio(
        endpoint,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=False  # Set to True if using HTTPS
    )
    return client

def ensure_bucket_exists():
    client = get_minio_client()
    try:
        found = client.bucket_exists(settings.MINIO_BUCKET_NAME)
        if not found:
            client.make_bucket(settings.MINIO_BUCKET_NAME)
            print(f"Created MinIO bucket: {settings.MINIO_BUCKET_NAME}")
    except S3Error as exc:
        print(f"Error checking/creating MinIO bucket: {exc}")

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
    except S3Error as exc:
        print(f"Error uploading to MinIO: {exc}")
        raise exc
