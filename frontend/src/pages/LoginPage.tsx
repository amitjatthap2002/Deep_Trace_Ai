import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Eye, EyeOff, ArrowRight, Lock, Mail, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8faf9' }}>
      {/* Left Column: Formal Overview & Institutional Value */}
      <div style={{
        flex: 1.1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3.5rem 4rem',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%)',
        borderRight: '1px solid #e2e8f0'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '8px',
            background: '#15803d',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(21, 128, 61, 0.25)'
          }}>
            <Shield size={22} color="white" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
              DeepTrace <span style={{ color: '#15803d', fontWeight: 600 }}>AI</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Digital Media Authenticity Verification
            </div>
          </div>
        </div>

        {/* Center Presentation */}
        <div style={{ maxWidth: '480px', margin: '2rem 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.75rem', borderRadius: '999px',
            background: '#dcfce7', border: '1px solid #bbf7d0',
            color: '#15803d', fontSize: '0.75rem', fontWeight: 600,
            marginBottom: '1.25rem'
          }}>
            Multi-Agent Forensic Suite
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Enterprise forensic analysis for digital media authenticity.
          </h1>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Verify images, audio, and video files through structured forensic pipelines: deepfake detection, ELA, copy-move analysis, and automated Trust Score reporting.
          </p>

          {/* Value Points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              'Explainable AI reporting backed by forensic sub-scores',
              'Automated Error Level Analysis (ELA) and noise footprint validation',
              'Compliant with digital integrity and fact-checking workflows',
            ].map((text, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          © {new Date().getFullYear()} DeepTrace AI. Secure forensic pipeline.
        </div>
      </div>

      {/* Right Column: Clean White Formal Sign In Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2.5rem',
        background: '#ffffff'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '0.4rem' }}>
              Sign In
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Enter your credentials to access your verification dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Work Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="analyst@organization.com"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              id="login-submit"
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem 1rem', fontSize: '0.9rem', marginTop: '0.25rem' }}
              disabled={loading}
            >
              {loading ? (
                <div className="dot-pulse" style={{ display: 'flex', gap: '5px' }}>
                  <span /><span /><span />
                </div>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '2rem', paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0', textAlign: 'center',
            fontSize: '0.85rem', color: '#64748b'
          }}>
            Don't have an analyst account?{' '}
            <Link to="/register" style={{ color: '#15803d', textDecoration: 'none', fontWeight: 600 }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
