import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Eye, EyeOff, ArrowRight, Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (Array.isArray(detail) && detail.length > 0) {
        setError(detail.map((d: any) => d.msg || d.message).join(', '))
      } else {
        setError('Registration failed. Please check your information.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #f8faf9 40%, #ffffff 100%)',
      padding: '2.5rem 1.5rem'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '8px',
            background: '#15803d',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(21, 128, 61, 0.2)'
          }}>
            <Shield size={20} color="white" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              DeepTrace <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.9rem' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Account Registration</div>
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>
          Create an Account
        </h1>
        <p style={{ color: '#64748b', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
          Set up access to the multi-agent media verification pipeline.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Dr. Sarah Johnson"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Work Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="analyst@agency.org"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input-field"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 0.9rem', borderRadius: '8px',
              background: '#fee2e2', border: '1px solid #fecaca',
              color: '#b91c1c', fontSize: '0.825rem', fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <button
            id="reg-submit"
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? (
              <div className="dot-pulse" style={{ display: 'flex', gap: '5px' }}>
                <span /><span /><span />
              </div>
            ) : (
              <>Register Account <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem', paddingTop: '1.25rem',
          borderTop: '1px solid #e2e8f0', textAlign: 'center',
          fontSize: '0.85rem', color: '#64748b'
        }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: '#15803d', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
