import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import { Upload, FileImage, FileVideo, FileAudio, X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'],
  'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  'audio/*': ['.mp3', '.wav', '.aac', '.flac', '.ogg'],
}

function getFileIcon(type: string) {
  if (type.startsWith('image')) return <FileImage size={36} color="#0ea5e9" />
  if (type.startsWith('video')) return <FileVideo size={36} color="#8b5cf6" />
  if (type.startsWith('audio')) return <FileAudio size={36} color="#22c55e" />
  return <Upload size={36} color="#64748b" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [uploadedId, setUploadedId] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      setError('File type not supported or file too large.')
      return
    }
    setFile(accepted[0])
    setError('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setProgress(prev => prev < 85 ? prev + 5 : prev)
      }, 300)

      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      clearInterval(progressInterval)
      setProgress(100)
      setUploadedId(res.data.media_id)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>New Analysis</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Upload any image, video, or audio file to begin forensic analysis.
          </p>

          {/* Success state */}
          {uploadedId && (
            <div className="glass-card fade-in-up" style={{ padding: '2rem', textAlign: 'center' }}>
              <CheckCircle size={56} color="#22c55e" style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Analysis Started!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Your file is being processed by our AI forensic agents. This typically takes 30–90 seconds.
              </p>

              {/* Agent progress indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                {['Metadata Agent', 'Deepfake Agent', 'Forensic Agent', 'Fact-Check Agent'].map((agent, i) => (
                  <div key={agent} style={{
                    padding: '0.75rem 1rem', borderRadius: '10px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: '0.6rem'
                  }}>
                    <div className="dot-pulse" style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ animationDelay: `${i * 0.15}s` }} /><span style={{ animationDelay: `${i * 0.15 + 0.2}s` }} /><span style={{ animationDelay: `${i * 0.15 + 0.4}s` }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{agent}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => navigate(`/report/${uploadedId}`)} className="btn-primary">
                  View Report
                </button>
                <button onClick={() => { setFile(null); setUploadedId(null); setProgress(0) }} className="btn-secondary">
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {/* Upload UI */}
          {!uploadedId && (
            <>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                style={{ marginBottom: '1.5rem' }}
              >
                <input {...getInputProps()} id="file-dropzone" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '20px',
                    background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '0.5rem', border: '1px solid rgba(14,165,233,0.2)'
                  }}>
                    <Upload size={32} color="#0ea5e9" />
                  </div>
                  {isDragActive ? (
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>Drop it here!</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '1rem', fontWeight: 600 }}>Drag & drop your file here</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>or click to browse</p>
                    </>
                  )}
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Images up to 25MB • Videos up to 200MB • Audio files
                  </p>
                </div>
              </div>

              {/* Selected File Preview */}
              {file && (
                <div className="glass-card fade-in-up" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {getFileIcon(file.type)}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{file.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatBytes(file.size)} • {file.type}
                    </p>
                  </div>
                  <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', marginBottom: '1rem' }}>
                  <AlertCircle size={18} /> <span style={{ fontSize: '0.875rem' }}>{error}</span>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uploading…</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>{progress}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div
                      className="progress-shimmer"
                      style={{ height: '100%', width: `${progress}%`, borderRadius: '99px', transition: 'width 0.3s ease' }}
                    />
                  </div>
                </div>
              )}

              <button
                id="upload-submit"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', opacity: !file ? 0.5 : 1 }}
              >
                {uploading ? (
                  <div className="dot-pulse" style={{ display: 'flex', gap: '6px' }}><span /><span /><span /></div>
                ) : (
                  <><Upload size={20} /> Start Forensic Analysis</>
                )}
              </button>

              {/* Info box */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem', borderRadius: '10px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', marginTop: '1rem' }}>
                <Info size={16} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  All uploads are processed securely. Analysis uses multi-agent AI including metadata extraction, deepfake detection, forensic consistency checks, and context verification to generate a Trust Score.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
