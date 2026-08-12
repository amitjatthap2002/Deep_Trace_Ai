import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import { FileText, ArrowRight, Search, Filter } from 'lucide-react'
import { useState } from 'react'

function getRiskBadge(risk: string) {
  const map: Record<string, string> = {
    'Low Risk': 'badge-low', 'Medium Risk': 'badge-medium',
    'High Risk': 'badge-high', 'Critical Risk': 'badge-critical'
  }
  return map[risk] || 'badge-pending'
}

function getTrustColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 35) return '#f97316'
  return '#ef4444'
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: mediaList, isLoading } = useQuery({
    queryKey: ['media-history'],
    queryFn: () => api.get('/media').then(r => r.data),
  })

  // We have a basic /media endpoint. Let's fetch it, which returns the list.
  // Note: the current /media endpoint only returns basic info. 
  // Let's assume it returns trust_score and risk_level if completed.

  const filteredList = mediaList?.filter((item: any) => 
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Analysis History</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              View and manage all your past media forensic analyses.
            </p>
          </div>
          <button onClick={() => navigate('/upload')} className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            New Analysis
          </button>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', minHeight: '600px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by filename..."
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <Filter size={16} /> Filter
            </button>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <div className="dot-pulse" style={{ display: 'flex', gap: '6px' }}><span /><span /><span /></div>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.25rem' }}>No analyses found</p>
              <p style={{ fontSize: '0.9rem' }}>{searchTerm ? 'Try adjusting your search' : 'Upload a file to get started'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th>Trust Score</th>
                    <th>Risk Level</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item: any) => (
                    <tr key={item.media_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/report/${item.media_id}`)}>
                      <td style={{ fontWeight: 500, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </td>
                      <td style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {item.media_type}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(item.upload_time).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge badge-${item.status}`}>{item.status}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: getTrustColor(item.trust_score ?? 0) }}>
                        {item.status === 'completed' ? (item.trust_score != null ? `${item.trust_score.toFixed(0)}/100` : '—') : '—'}
                      </td>
                      <td>
                        {item.status === 'completed' && item.risk_level ? (
                          <span className={`badge ${getRiskBadge(item.risk_level)}`}>{item.risk_level}</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
