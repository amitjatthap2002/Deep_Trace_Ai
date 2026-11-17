import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../lib/api'
import { FileText, ArrowRight, Search, Plus } from 'lucide-react'
import { useState } from 'react'

function getRiskBadge(risk: string) {
  const map: Record<string, string> = {
    'Low Risk': 'badge-low', 'Medium Risk': 'badge-medium',
    'High Risk': 'badge-high', 'Critical Risk': 'badge-critical'
  }
  return map[risk] || 'badge-pending'
}

function getTrustColor(score: number) {
  if (score >= 80) return '#15803d'
  if (score >= 60) return '#b45309'
  if (score >= 35) return '#c2410c'
  return '#b91c1c'
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: mediaList, isLoading } = useQuery({
    queryKey: ['media-history'],
    queryFn: () => api.get('/media').then(r => r.data),
  })

  const filteredList = mediaList?.filter((item: any) => 
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Verification Archive
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Audit log and historical records of all forensic media analyses.
            </p>
          </div>
          <button onClick={() => navigate('/upload')} className="btn-primary">
            <Plus size={16} /> New Verification
          </button>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', minHeight: '560px' }}>
          {/* Search Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search analyses by filename..."
                className="input-field"
                style={{ paddingLeft: '2.4rem', paddingRight: '1rem' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <div className="dot-pulse" style={{ display: 'flex', gap: '6px' }}><span /><span /><span /></div>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
              <FileText size={44} style={{ margin: '0 auto 0.75rem', color: '#94a3b8', strokeWidth: 1.5 }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>No matching analyses found</p>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                {searchTerm ? 'Try adjusting your search criteria.' : 'Upload a media file to populate your verification library.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Submission Date</th>
                    <th>Status</th>
                    <th>Trust Score</th>
                    <th>Risk Classification</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item: any) => (
                    <tr key={item.media_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/report/${item.media_id}`)}>
                      <td style={{ fontWeight: 600, color: '#0f172a', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </td>
                      <td style={{ color: '#64748b', textTransform: 'capitalize' }}>
                        {item.media_type}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.825rem' }}>
                        {item.upload_time ? new Date(item.upload_time).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
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
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td>
                        <ArrowRight size={15} style={{ color: '#94a3b8' }} />
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
