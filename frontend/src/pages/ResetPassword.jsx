import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import client from '../api/client'
import { authCardStyle as s } from '../styles'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is missing its token. Please request a new one.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await client.post('/auth/reset-password', { token, new_password: newPassword })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not reset your password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoBadge}>⚖</div>
        <div style={s.title}>Reset Password</div>
        <div style={s.subtitle}>Choose a new password for your account</div>

        {error && <div style={s.error}>{error}</div>}

        {success ? (
          <div style={{ textAlign: 'center', fontSize: 13.5, color: '#334155' }}>
            Password reset successfully. Taking you to log in...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={s.label}>New Password</label>
            <input
              style={s.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
            <button style={{ ...s.button, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
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
