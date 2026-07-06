import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authCardStyle as s } from '../styles'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(name, email, password)
      navigate('/')
    } catch (err) {
      if (err.response) {
        const detail = err.response.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : `Signup failed (server responded with status ${err.response.status}). Check the backend terminal for the full error.`
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
        <div style={s.logoBadge}>⚖</div>
        <div style={s.title}>Create your account</div>
        <div style={s.subtitle}>Start using the Law AI Assistant</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Name</label>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
          />
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
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
          <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div style={s.switchText}>
          Already have an account?{' '}
          <Link to="/login" style={s.switchLink}>Log in</Link>
        </div>
      </div>
    </div>
  )
}
