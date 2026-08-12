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
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 35) return '#f97316'
  return '#ef4444'
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
    { name: 'Low Risk', count: summary.risk_distribution['Low Risk'] || 0, color: '#22c55e' },
    { name: 'Medium', count: summary.risk_distribution['Medium Risk'] || 0, color: '#f59e0b' },
    { name: 'High Risk', count: summary.risk_distribution['High Risk'] || 0, color: '#f97316' },
    { name: 'Critical', count: summary.risk_distribution['Critical Risk'] || 0, color: '#ef4444' },
  ] : []

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Welcome back, <span className="gradient-text">{user?.name}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Here's a summary of your forensic analysis activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>TOTAL ANALYSES</p>
                <p style={{ fontSize: '2rem', fontWeight: 800 }}>{summary?.total_analyses ?? '—'}</p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(14,165,233,0.1)' }}>
                <BarChart2 size={20} color="#0ea5e9" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>COMPLETED</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>{summary?.completed_analyses ?? '—'}</p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle size={20} color="#22c55e" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>PENDING</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8' }}>{summary?.pending_analyses ?? '—'}</p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(129,140,248,0.1)' }}>
                <Clock size={20} color="#818cf8" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>AVG TRUST SCORE</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: getTrustColor(summary?.average_trust_score ?? 0) }}>
                  {summary?.average_trust_score ? `${summary.average_trust_score.toFixed(0)}` : '—'}
                </p>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)' }}>
                <TrendingUp size={20} color="#f59e0b" />
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
          {/* Recent Analyses Table */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Recent Analyses</h2>
              <button onClick={() => navigate('/history')} className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                View All <ArrowRight size={14} />
              </button>
            </div>
            {recent?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No analyses yet.</p>
                <button onClick={() => navigate('/upload')} className="btn-primary" style={{ marginTop: '1rem' }}>
                  <Upload size={16} /> Run First Analysis
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
                      <td style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</td>
                      <td style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.media_type}</td>
                      <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                      <td style={{ fontWeight: 700, color: getTrustColor(item.trust_score ?? 0) }}>
                        {item.trust_score != null ? `${item.trust_score.toFixed(0)}/100` : '—'}
                      </td>
                      <td>
                        {item.risk_level ? <span className={`badge ${getRiskBadge(item.risk_level)}`}>{item.risk_level}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td><ArrowRight size={16} style={{ color: 'var(--text-muted)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Risk Distribution Chart */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>Risk Distribution</h2>
            {riskChartData.every(d => d.count === 0) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem' }}>
                <AlertTriangle size={32} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={riskChartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {riskChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Quick Upload CTA */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(14,165,233,0.2)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>Ready to analyze?</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Upload an image, video, or audio file.</p>
              <button onClick={() => navigate('/upload')} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}>
                <Upload size={16} /> New Analysis
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
