import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authCardStyle as s } from '../styles'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      if (err.response) {
        const detail = err.response.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : `Login failed (server responded with status ${err.response.status}). Check the backend terminal for the full error.`
        )
      } else if (err.request) {
        setError('Could not reach the backend at all. Is it running on port 8000, and does CORS allow this origin?')
      } else {
        setError(`Unexpected error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoBadge}>⚖️</div>
        <div style={s.title}>Welcome back</div>
        <div style={s.subtitle}>Log in to your Law AI Assistant account</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div style={s.switchText}>
          Don't have an account?{' '}
          <Link to="/signup" style={s.switchLink}>Sign up</Link>
        </div>
      </div>
    </div>
  )
}
