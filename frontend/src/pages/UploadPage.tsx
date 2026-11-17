import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import { Upload, FileImage, FileVideo, FileAudio, X, CheckCircle, AlertCircle, Info, ShieldCheck } from 'lucide-react'

const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp'],
  'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  'audio/*': ['.mp3', '.wav', '.aac', '.flac', '.ogg'],
}

function getFileIcon(type: string) {
  if (type.startsWith('image')) return <FileImage size={32} color="#15803d" />
  if (type.startsWith('video')) return <FileVideo size={32} color="#0f766e" />
  if (type.startsWith('audio')) return <FileAudio size={32} color="#166534" />
  return <Upload size={32} color="#64748b" />
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
      setError('File type not supported or file exceeds maximum allowable size.')
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
    setProgress(15)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const progressInterval = setInterval(() => {
        setProgress(prev => prev < 85 ? prev + 5 : prev)
      }, 250)

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
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Media Intake & Analysis
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Submit digital assets for multi-agent cryptographic and forensic verification.
            </p>
          </div>

          {/* Success state */}
          {uploadedId && (
            <div className="glass-card fade-in-up" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: '#dcfce7', border: '1px solid #bbf7d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <CheckCircle size={32} color="#15803d" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                Analysis Initiated
              </h2>
              <p style={{ color: '#64748b', marginBottom: '1.75rem', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.75rem' }}>
                Your media file has been securely ingested. The parallel forensic pipeline (Metadata, Deepfake, ELA, and Fact-Check) is processing your file.
              </p>

              {/* Agent progress indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
                {['Metadata Agent', 'Deepfake Agent', 'Forensic Agent', 'Fact-Check Agent'].map((agent, i) => (
                  <div key={agent} style={{
                    padding: '0.75rem 1rem', borderRadius: '8px',
                    background: '#f8faf9', border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', gap: '0.65rem'
                  }}>
                    <div className="dot-pulse" style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ animationDelay: `${i * 0.15}s` }} />
                      <span style={{ animationDelay: `${i * 0.15 + 0.2}s` }} />
                      <span style={{ animationDelay: `${i * 0.15 + 0.4}s` }} />
                    </div>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>{agent}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => navigate(`/report/${uploadedId}`)} className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                  <ShieldCheck size={16} /> Open Forensic Report
                </button>
                <button onClick={() => { setFile(null); setUploadedId(null); setProgress(0) }} className="btn-secondary" style={{ padding: '0.65rem 1.25rem' }}>
                  Analyze Another File
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
                style={{ marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}
              >
                <input {...getInputProps()} id="file-dropzone" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '12px',
                    background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '0.5rem', border: '1px solid #bbf7d0'
                  }}>
                    <Upload size={24} color="#15803d" />
                  </div>
                  {isDragActive ? (
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#15803d' }}>Drop your file here to upload</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                        Drag & drop media file here, or <span style={{ color: '#15803d' }}>browse</span>
                      </p>
                      <p style={{ color: '#64748b', fontSize: '0.825rem' }}>
                        Supports JPG, PNG, WEBP, MP4, MOV, MP3, WAV
                      </p>
                    </>
                  )}
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Images up to 25MB • Videos up to 200MB
                  </p>
                </div>
              </div>

              {/* Selected File Preview */}
              {file && (
                <div className="glass-card fade-in-up" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {getFileIcon(file.type)}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', marginBottom: '0.15rem' }}>{file.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {formatBytes(file.size)} • {file.type || 'Binary stream'}
                    </p>
                  </div>
                  <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Error Callout */}
              {error && (
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '8px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '1rem' }}>
                  <AlertCircle size={16} /> <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>{error}</span>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Uploading & computing SHA256 checksum...</span>
                    <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 700 }}>{progress}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div
                      className="progress-shimmer"
                      style={{ height: '100%', width: `${progress}%`, borderRadius: '99px', transition: 'width 0.25s ease' }}
                    />
                  </div>
                </div>
              )}

              <button
                id="upload-submit"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}
              >
                {uploading ? (
                  <div className="dot-pulse" style={{ display: 'flex', gap: '5px' }}><span /><span /><span /></div>
                ) : (
                  <><Upload size={18} /> Run Forensic Pipeline</>
                )}
              </button>

              {/* Institutional Notice */}
              <div style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '1rem', borderRadius: '8px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                marginTop: '1.25rem'
              }}>
                <Info size={16} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.8rem', color: '#166534', lineHeight: 1.55 }}>
                  Media uploads are verified in isolation using hash integrity matching (SHA256), EXIF extraction, deepfake neural classification, and error level compression analysis.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
