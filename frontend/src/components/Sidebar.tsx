import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Upload, History,
  Shield, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'New Analysis' },
  { to: '/history', icon: History, label: 'Analysis History' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: '#15803d',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)'
          }}>
            <Shield size={20} color="white" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
              DeepTrace <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.8rem' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
              Forensic Verification
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav style={{ flex: 1, paddingTop: '1rem' }}>
        <div style={{
          padding: '0 0.5rem 0.5rem',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginLeft: '0.85rem'
        }}>
          Workplace
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: '#ffffff' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.65rem 0.75rem', borderRadius: '8px',
          background: '#f8faf9', border: '1px solid #e2e8f0',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '6px',
            background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, color: '#15803d', flexShrink: 0,
            border: '1px solid #bbf7d0'
          }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Analyst'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button onClick={logout} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
