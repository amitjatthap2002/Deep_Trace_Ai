import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import {
  BarChart2, TrendingUp, AlertTriangle, CheckCircle,
  Upload, Clock, FileText, ArrowRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function getRiskBadge(risk: string) {
  const map: Record<string, string> = {
    'Low Risk': 'badge-low', 'Medium Risk': 'badge-medium',
    'High Risk': 'badge-high', 'Critical Risk': 'badge-critical'
  }
  return map[risk] || 'badge-pending'
}

function getStatusBadge(status: string) {
  return `badge badge-${status}`
}

function getTrustColor(score: number) {
  if (score >= 80) return '#15803d'
  if (score >= 60) return '#b45309'
  if (score >= 35) return '#c2410c'
  return '#b91c1c'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: recent } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => api.get('/dashboard/recent').then(r => r.data),
    refetchInterval: 10000,
  })

  const riskChartData = summary ? [
    { name: 'Low Risk', count: summary.risk_distribution['Low Risk'] || 0, color: '#15803d' },
    { name: 'Medium', count: summary.risk_distribution['Medium Risk'] || 0, color: '#b45309' },
    { name: 'High Risk', count: summary.risk_distribution['High Risk'] || 0, color: '#c2410c' },
    { name: 'Critical', count: summary.risk_distribution['Critical Risk'] || 0, color: '#b91c1c' },
  ] : []

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Verification Overview
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Welcome back, <strong style={{ color: '#0f172a' }}>{user?.name}</strong>. Here is the status of your forensic analysis pipeline.
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>TOTAL ANALYSES</p>
                <p style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>{summary?.total_analyses ?? '—'}</p>
              </div>
              <div style={{ padding: '0.55rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <BarChart2 size={18} color="#15803d" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>COMPLETED</p>
                <p style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d' }}>{summary?.completed_analyses ?? '—'}</p>
              </div>
              <div style={{ padding: '0.55rem', borderRadius: '8px', background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                <CheckCircle size={18} color="#15803d" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>PENDING</p>
                <p style={{ fontSize: '1.85rem', fontWeight: 800, color: '#475569' }}>{summary?.pending_analyses ?? '—'}</p>
              </div>
              <div style={{ padding: '0.55rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                <Clock size={18} color="#475569" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>AVG TRUST SCORE</p>
                <p style={{ fontSize: '1.85rem', fontWeight: 800, color: getTrustColor(summary?.average_trust_score ?? 0) }}>
                  {summary?.average_trust_score ? `${summary.average_trust_score.toFixed(0)}/100` : '—'}
                </p>
              </div>
              <div style={{ padding: '0.55rem', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a' }}>
                <TrendingUp size={18} color="#b45309" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
          {/* Recent Analyses Table */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Recent Analyses</h2>
              <button onClick={() => navigate('/history')} className="btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
                View All <ArrowRight size={13} />
              </button>
            </div>
            {recent?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                <FileText size={44} style={{ margin: '0 auto 0.75rem', color: '#94a3b8', strokeWidth: 1.5 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No forensic analyses recorded yet.</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Upload a media file to start verification.</p>
                <button onClick={() => navigate('/upload')} className="btn-primary" style={{ marginTop: '1.25rem' }}>
                  <Upload size={15} /> Upload Media
                </button>
              </div>
            )}
            {recent?.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Trust Score</th>
                    <th>Risk Level</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent?.map((item: any) => (
                    <tr key={item.media_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/report/${item.media_id}`)}>
                      <td style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</td>
                      <td style={{ color: '#64748b', textTransform: 'capitalize' }}>{item.media_type}</td>
                      <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                      <td style={{ fontWeight: 700, color: getTrustColor(item.trust_score ?? 0) }}>
                        {item.trust_score != null ? `${item.trust_score.toFixed(0)}/100` : '—'}
                      </td>
                      <td>
                        {item.risk_level ? <span className={getRiskBadge(item.risk_level)}>{item.risk_level}</span> : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td><ArrowRight size={15} style={{ color: '#94a3b8' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Risk Distribution Chart */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '1.25rem' }}>Risk Distribution</h2>
            {riskChartData.every(d => d.count === 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: '#94a3b8', flexDirection: 'column', gap: '0.5rem' }}>
                <AlertTriangle size={30} style={{ opacity: 0.4 }} />
                <p style={{ fontSize: '0.85rem' }}>No data available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskChartData} barCategoryGap="25%">
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: 'var(--shadow-md)', fontSize: '12px' }}
                    cursor={{ fill: '#f8faf9' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Quick Upload Panel */}
            <div style={{
              marginTop: 'auto',
              padding: '1.15rem',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0'
            }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#166534', marginBottom: '0.25rem' }}>Verify New Media</p>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.85rem' }}>Upload images, videos, or audio to calculate Trust Score.</p>
              <button onClick={() => navigate('/upload')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
                <Upload size={15} /> New Verification
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
