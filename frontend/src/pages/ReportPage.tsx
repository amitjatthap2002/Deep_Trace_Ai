import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  Tooltip, Cell, BarChart, Bar, XAxis, YAxis
} from 'recharts'
import {
  Download, AlertTriangle, CheckCircle, Clock,
  RefreshCw, ChevronRight, Shield, Eye, Zap, Search, FileText
} from 'lucide-react'

function getTrustColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 35) return '#f97316'
  return '#ef4444'
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

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['report', mediaId],
    queryFn: () => api.get(`/media/${mediaId}/report`).then(r => r.data),
    refetchInterval: (data) => (data?.status === 'completed' || data?.status === 'failed') ? false : 5000,
    enabled: !!mediaId,
  })

  const isProcessing = !report || (report.status !== 'completed' && report.status !== 'failed')
  const trustScore = report?.trust_score ?? 0
  const trustColor = getTrustColor(trustScore)

  const subScoreData = report ? [
    { name: 'Metadata', score: report.metadata?.flags ? 75 : 100, color: '#0ea5e9' },
    { name: 'Deepfake', score: report.deepfake?.deepfake_authenticity_score ?? (100 - (report.deepfake?.probability_fake ?? 0)), color: '#8b5cf6' },
    { name: 'Forensic', score: report.forensic?.forensic_consistency_score ?? 75, color: '#f59e0b' },
    { name: 'Context', score: report.fact_check?.context_verification_score ?? 75, color: '#22c55e' },
  ] : []

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'metadata', label: 'Metadata', icon: FileText },
    { id: 'deepfake', label: 'Deepfake', icon: Eye },
    { id: 'forensic', label: 'Forensic', icon: Zap },
    { id: 'factcheck', label: 'Fact-Check', icon: Search },
    { id: 'summary', label: 'AI Summary', icon: FileText },
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
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem', border: '2px solid rgba(14,165,233,0.3)'
            }}>
              <RefreshCw size={32} color="#0ea5e9" style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Analyzing Media</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Our AI forensic agents are running in parallel...
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '400px' }}>
              {['Metadata Agent', 'Deepfake Agent', 'Forensic Agent', 'Fact-Check Agent'].map((agent, i) => (
                <div key={agent} style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div className="dot-pulse" style={{ display: 'flex', gap: '4px' }}>
                    <span /><span /><span />
                  </div>
                  <span style={{ fontSize: '0.8rem' }}>{agent}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => navigate('/history')}>
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to History
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{report.filename}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              <span className={getRiskBadgeClass(report.risk_level)}>{report.risk_level || 'Unknown'}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{report.media_type}</span>
            </div>
          </div>
          <button onClick={downloadPDF} className="btn-primary">
            <Download size={16} /> Download PDF
          </button>
        </div>

        {/* Trust Score + Sub Scores */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Gauge */}
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trust Score</p>
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[{ value: trustScore }]} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} fill={trustColor} background={{ fill: 'var(--bg-secondary)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: trustColor }}>{trustScore.toFixed(0)}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <span className={getRiskBadgeClass(report.risk_level)}>{report.risk_level || 'Unknown'}</span>
            </div>
          </div>

          {/* Sub Scores Chart */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sub-Score Breakdown</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={subScoreData} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {subScoreData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
              {subScoreData.map(s => (
                <div key={s.name} style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.score.toFixed(0)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="glass-card fade-in-up" style={{ padding: '1.5rem' }}>
          {activeTab === 'overview' && (
            <div>
              <h3 className="section-title">Analysis Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'File Name', value: report.filename },
                  { label: 'Media Type', value: report.media_type },
                  { label: 'Status', value: <span className={`badge badge-${report.status}`}>{report.status}</span> },
                  { label: 'Trust Score', value: <span style={{ color: trustColor, fontWeight: 700 }}>{trustScore.toFixed(1)}/100</span> },
                  { label: 'Risk Level', value: <span className={getRiskBadgeClass(report.risk_level)}>{report.risk_level}</span> },
                  { label: 'Deepfake Verdict', value: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{report.deepfake?.verdict || '—'}</span> },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                    <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div>
              <h3 className="section-title">Metadata Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Camera Make', value: report.metadata?.camera_make || 'Not found' },
                  { label: 'Camera Model', value: report.metadata?.camera_model || 'Not found' },
                  { label: 'Software Used', value: report.metadata?.software_used || 'Not detected' },
                  { label: 'GPS Latitude', value: report.metadata?.gps_lat != null ? `${report.metadata.gps_lat}°` : 'No GPS data' },
                  { label: 'GPS Longitude', value: report.metadata?.gps_lng != null ? `${report.metadata.gps_lng}°` : 'No GPS data' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontSize: '0.9rem' }}>{value}</p>
                  </div>
                ))}
              </div>
              {report.metadata?.flags && Object.keys(report.metadata.flags).length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>⚠️ Metadata Flags Detected</p>
                  <pre style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(report.metadata.flags, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deepfake' && (
            <div>
              <h3 className="section-title">Deepfake Detection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Verdict', value: <span style={{ textTransform: 'capitalize', fontWeight: 700, color: report.deepfake?.verdict === 'fake' ? '#ef4444' : report.deepfake?.verdict === 'real' ? '#22c55e' : '#f59e0b' }}>{report.deepfake?.verdict || '—'}</span> },
                  { label: 'Fake Probability', value: `${report.deepfake?.probability_fake?.toFixed(1) ?? '—'}%` },
                  { label: 'Confidence', value: `${((report.deepfake?.confidence ?? 0) * 100).toFixed(1)}%` },
                  { label: 'Heatmap', value: report.deepfake?.heatmap_path ? '✅ Available' : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                    <div style={{ fontSize: '0.95rem' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'forensic' && (
            <div>
              <h3 className="section-title">Forensic Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'ELA Score', value: report.forensic?.ela_score?.toFixed(2) ?? '—' },
                  { label: 'Shadow Score', value: report.forensic?.shadow_score?.toFixed(1) ?? '—' },
                  { label: 'Lighting Score', value: report.forensic?.lighting_score?.toFixed(1) ?? '—' },
                  { label: 'Compression Score', value: report.forensic?.compression_score?.toFixed(1) ?? '—' },
                  { label: 'Copy-Move Detected', value: report.forensic?.copy_move_detected ? <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ Yes</span> : <span style={{ color: '#22c55e' }}>✅ No</span> },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                    <div style={{ fontSize: '0.95rem' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'factcheck' && (
            <div>
              <h3 className="section-title">Context & Fact-Check</h3>
              {report.fact_check?.ocr_text && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Extracted Text (OCR)</p>
                  <div style={{ padding: '1rem', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.7, maxHeight: '200px', overflow: 'auto' }}>
                    {report.fact_check.ocr_text || 'No text detected in media.'}
                  </div>
                </div>
              )}
              {report.fact_check?.context_flags?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Context Flags</p>
                  {report.fact_check.context_flags.map((flag: any, i: number) => (
                    <div key={i} style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '0.5rem' }}>
                      <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.875rem' }}>⚠️ {flag.type}</p>
                      {flag.keywords?.length > 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Keywords: {flag.keywords.join(', ')}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(!report.fact_check?.context_flags?.length && !report.fact_check?.ocr_text) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No significant context flags detected.</p>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div>
              <h3 className="section-title">AI-Generated Report</h3>
              <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {report.ai_summary || 'Report not yet generated.'}
              </div>
              <button onClick={downloadPDF} className="btn-primary" style={{ marginTop: '1rem' }}>
                <Download size={16} /> Download Full PDF Report
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
