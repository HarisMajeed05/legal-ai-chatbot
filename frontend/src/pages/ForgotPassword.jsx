import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { authCardStyle as s } from '../styles'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoBadge}>⚖</div>
        <div style={s.title}>Forgot Password</div>
        <div style={s.subtitle}>Enter your email and we will send you a reset link</div>

        {error && <div style={s.error}>{error}</div>}

        {submitted ? (
          <div style={{ textAlign: 'center', fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
            If an account exists with that email, a reset link has been sent.
            Check your inbox, including spam, over the next few minutes.
          </div>
        ) : (
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
            <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={s.switchText}>
          <Link to="/login" style={s.switchLink}>Back to log in</Link>
        </div>
      </div>
    </div>
  )
}
