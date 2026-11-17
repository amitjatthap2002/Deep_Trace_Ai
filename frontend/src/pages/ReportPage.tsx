import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  Tooltip, Cell, BarChart, Bar, XAxis, YAxis
} from 'recharts'
import {
  Download, RefreshCw, ChevronRight, Shield, Eye, Zap, Search, FileText, AlertTriangle
} from 'lucide-react'

function getTrustColor(score: number) {
  if (score >= 80) return '#15803d'
  if (score >= 60) return '#b45309'
  if (score >= 35) return '#c2410c'
  return '#b91c1c'
}

function getRiskBadgeClass(risk: string) {
  if (risk?.includes('Low')) return 'badge badge-low'
  if (risk?.includes('Medium')) return 'badge badge-medium'
  if (risk?.includes('High')) return 'badge badge-high'
  if (risk?.includes('Critical')) return 'badge badge-critical'
  return 'badge badge-pending'
}

type TabId = 'overview' | 'metadata' | 'deepfake' | 'forensic' | 'factcheck' | 'summary'

export default function ReportPage() {
  const { mediaId } = useParams<{ mediaId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', mediaId],
    queryFn: () => api.get(`/media/${mediaId}/report`).then(r => r.data),
    refetchInterval: (query) => {
      const data = query?.state?.data as any
      return (data?.status === 'completed' || data?.status === 'failed') ? false : 4000
    },
    enabled: !!mediaId,
  })

  const isProcessing = !report || (report.status !== 'completed' && report.status !== 'failed')
  const trustScore = report?.trust_score ?? 0
  const trustColor = getTrustColor(trustScore)

  const subScoreData = report ? [
    { name: 'Metadata', score: report.metadata?.flags && Object.keys(report.metadata.flags).length > 0 ? 75 : 100, color: '#15803d' },
    { name: 'Deepfake', score: report.deepfake?.deepfake_authenticity_score ?? Math.max(0, 100 - (report.deepfake?.probability_fake ?? 0)), color: '#0f766e' },
    { name: 'Forensic', score: report.forensic?.forensic_consistency_score ?? 75, color: '#b45309' },
    { name: 'Context', score: report.fact_check?.context_verification_score ?? 75, color: '#16a34a' },
  ] : []

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'metadata', label: 'Metadata & EXIF', icon: FileText },
    { id: 'deepfake', label: 'Deepfake Analysis', icon: Eye },
    { id: 'forensic', label: 'Forensic & ELA', icon: Zap },
    { id: 'factcheck', label: 'Context & OCR', icon: Search },
    { id: 'summary', label: 'Formal Report', icon: FileText },
  ]

  const downloadPDF = () => {
    window.open(`/api/media/${mediaId}/report/pdf`, '_blank')
  }

  // Processing state
  if (isLoading || isProcessing) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 3rem', maxWidth: '520px', width: '100%' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem', border: '1px solid #bbf7d0'
            }}>
              <RefreshCw size={28} color="#15803d" style={{ animation: 'spin 1.8s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
              Forensic Analysis In Progress
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.55 }}>
              The multi-agent system is examining metadata, ELA compression, frequency GAN artifacts, and OCR claims.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'left' }}>
              {['Metadata Agent', 'Deepfake Agent', 'Forensic Agent', 'Fact-Check Agent'].map((agent, i) => (
                <div key={agent} style={{
                  padding: '0.75rem 0.9rem', borderRadius: '8px',
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
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <div
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => navigate('/history')}
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Verification Archive
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {report.filename}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.4rem' }}>
              <span className={getRiskBadgeClass(report.risk_level)}>{report.risk_level || 'Evaluated'}</span>
              <span style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'capitalize', fontWeight: 500 }}>
                Format: {report.media_type}
              </span>
            </div>
          </div>
          <button onClick={downloadPDF} className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            <Download size={15} /> Export Audit Report (PDF)
          </button>
        </div>

        {/* Top Summary Metrics: Gauge & Sub-Score Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Trust Score Gauge Card */}
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overall Trust Score
            </p>
            <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0.5rem auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[{ value: trustScore }]} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} fill={trustColor} background={{ fill: '#f1f5f9' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: trustColor, letterSpacing: '-0.03em' }}>{trustScore.toFixed(0)}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>/ 100</span>
              </div>
            </div>
            <div>
              <span className={getRiskBadgeClass(report.risk_level)}>{report.risk_level || 'Unknown'}</span>
            </div>
          </div>

          {/* Sub-Scores Chart Card */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Component Sub-Score Breakdown
              </p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={subScoreData} layout="vertical" barCategoryGap="20%">
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}
                    cursor={{ fill: '#f8faf9' }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {subScoreData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
              {subScoreData.map(s => (
                <div key={s.name} style={{ padding: '0.55rem', borderRadius: '8px', background: '#f8faf9', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.score.toFixed(0)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{s.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="glass-card fade-in-up" style={{ padding: '1.75rem' }}>
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div>
              <h3 className="section-title">Forensic Assessment Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'File Name', value: report.filename },
                  { label: 'Media Type', value: report.media_type },
                  { label: 'Processing Status', value: <span className={`badge badge-${report.status}`}>{report.status}</span> },
                  { label: 'Overall Trust Score', value: <span style={{ color: trustColor, fontWeight: 700 }}>{trustScore.toFixed(1)} / 100</span> },
                  { label: 'Risk Classification', value: <span className={getRiskBadgeClass(report.risk_level)}>{report.risk_level}</span> },
                  { label: 'Deepfake Model Verdict', value: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{report.deepfake?.verdict || 'Unspecified'}</span> },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: '#f8faf9', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                    <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#0f172a' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Metadata */}
          {activeTab === 'metadata' && (
            <div>
              <h3 className="section-title">EXIF & Device Header Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Camera Manufacturer', value: report.metadata?.camera_make || 'No hardware signature' },
                  { label: 'Device Model', value: report.metadata?.camera_model || 'No model recorded' },
                  { label: 'Editing Software Signature', value: report.metadata?.software_used || 'None detected' },
                  { label: 'GPS Latitude', value: report.metadata?.gps_lat != null ? `${report.metadata.gps_lat}°` : 'No geographic coordinates' },
                  { label: 'GPS Longitude', value: report.metadata?.gps_lng != null ? `${report.metadata.gps_lng}°` : 'No geographic coordinates' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: '#f8faf9', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{value}</p>
                  </div>
                ))}
              </div>
              {report.metadata?.flags && Object.keys(report.metadata.flags).length > 0 && (
                <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={16} color="#b45309" />
                    <span style={{ color: '#92400e', fontWeight: 700, fontSize: '0.85rem' }}>Metadata Anomaly Flags Detected</span>
                  </div>
                  <pre style={{ fontSize: '0.8rem', color: '#78350f', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(report.metadata.flags, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Deepfake */}
          {activeTab === 'deepfake' && (
            <div>
              <h3 className="section-title">Deepfake & Synthetic Artifact Detection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Model Verdict', value: <span style={{ textTransform: 'capitalize', fontWeight: 700, color: report.deepfake?.verdict === 'fake' ? '#b91c1c' : report.deepfake?.verdict === 'real' ? '#15803d' : '#b45309' }}>{report.deepfake?.verdict || 'Uncertain'}</span> },
                  { label: 'Synthetic Manipulation Probability', value: `${report.deepfake?.probability_fake?.toFixed(1) ?? '0.0'}%` },
                  { label: 'Model Confidence', value: `${((report.deepfake?.confidence ?? 0) * 100).toFixed(1)}%` },
                  { label: 'Spectral Heatmap', value: report.deepfake?.heatmap_path ? 'Generated & Stored' : 'Not generated' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: '#f8faf9', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                    <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#0f172a' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Forensic */}
          {activeTab === 'forensic' && (
            <div>
              <h3 className="section-title">Cryptographic & Forensic Consistency</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Error Level Analysis (ELA) Variance', value: report.forensic?.ela_score?.toFixed(2) ?? '—' },
                  { label: 'Shadow Geometry Score', value: report.forensic?.shadow_score != null ? `${report.forensic.shadow_score.toFixed(1)} / 100` : '—' },
                  { label: 'Lighting Gradient Coherence', value: report.forensic?.lighting_score != null ? `${report.forensic.lighting_score.toFixed(1)} / 100` : '—' },
                  { label: 'DCT Compression Variance', value: report.forensic?.compression_score != null ? `${report.forensic.compression_score.toFixed(1)} / 100` : '—' },
                  { label: 'Copy-Move Cloning Detected', value: report.forensic?.copy_move_detected ? <span style={{ color: '#b91c1c', fontWeight: 700 }}>Positive (Cloned regions identified)</span> : <span style={{ color: '#15803d', fontWeight: 700 }}>Negative (No duplicated keypoints)</span> },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.85rem 1rem', borderRadius: '8px', background: '#f8faf9', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                    <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#0f172a' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Fact-Check */}
          {activeTab === 'factcheck' && (
            <div>
              <h3 className="section-title">Optical Character Recognition & Context Flags</h3>
              {report.fact_check?.ocr_text && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Extracted Media Text (OCR)</p>
                  <div style={{ padding: '0.9rem 1rem', borderRadius: '8px', background: '#f8faf9', border: '1px solid #e2e8f0', fontSize: '0.85rem', lineHeight: 1.6, maxHeight: '180px', overflow: 'auto', color: '#334155' }}>
                    {report.fact_check.ocr_text}
                  </div>
                </div>
              )}
              {report.fact_check?.context_flags?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Contextual Warnings</p>
                  {report.fact_check.context_flags.map((flag: any, i: number) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a', marginBottom: '0.5rem' }}>
                      <p style={{ color: '#92400e', fontWeight: 700, fontSize: '0.85rem' }}>{flag.type}</p>
                      {flag.keywords?.length > 0 && <p style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '0.2rem' }}>Keywords: {flag.keywords.join(', ')}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(!report.fact_check?.context_flags?.length && !report.fact_check?.ocr_text) && (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No contextual anomalies or text detected in media file.</p>
              )}
            </div>
          )}

          {/* Tab 6: Summary / AI Report */}
          {activeTab === 'summary' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Executive Forensic Summary</h3>
                <button onClick={downloadPDF} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.825rem' }}>
                  <Download size={14} /> Download PDF
                </button>
              </div>
              <div style={{
                padding: '1.5rem',
                borderRadius: '8px',
                background: '#f8faf9',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #15803d',
                lineHeight: 1.75,
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                color: '#334155'
              }}>
                {report.ai_summary || 'Report narrative could not be compiled.'}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
