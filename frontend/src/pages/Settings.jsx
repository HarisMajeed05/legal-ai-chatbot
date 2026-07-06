import { useState } from 'react'
import client from '../api/client'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { brand, fonts } from '../styles'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const { palette } = useTheme()

  const [name, setName] = useState(user?.name || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileMessage('')
    if (!name.trim()) {
      setProfileError('Name cannot be empty')
      return
    }
    setProfileSaving(true)
    try {
      const res = await client.put('/auth/me', { name: name.trim() })
      updateUser(res.data)
      setProfileMessage('Profile updated')
    } catch (err) {
      setProfileError(err.response?.data?.detail || 'Could not update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    setPasswordSaving(true)
    try {
      await client.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPasswordMessage('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Could not change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: palette.bg }}>
      <Sidebar onNewChat={() => {}} />

      <div style={styles.main}>
        <div style={{ ...styles.title, color: palette.text }}>Settings</div>
        <div style={{ ...styles.subtitle, color: palette.subtext }}>
          Manage your account details and security
        </div>

        <div style={{ ...styles.card, background: palette.panel, borderColor: palette.border }}>
          <div style={{ ...styles.cardTitle, color: palette.text }}>Profile</div>
          <form onSubmit={handleProfileSave}>
            <label style={{ ...styles.label, color: palette.subtext }}>Name</label>
            <input
              style={{ ...styles.input, background: palette.bg, borderColor: palette.border, color: palette.text }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label style={{ ...styles.label, color: palette.subtext }}>Email</label>
            <input
              style={{ ...styles.input, background: palette.bg, borderColor: palette.border, color: palette.subtext }}
              value={user?.email || ''}
              disabled
              title="Contact support to change your email"
            />
            {profileError && <div style={styles.errorBox}>{profileError}</div>}
            {profileMessage && <div style={styles.successBox}>{profileMessage}</div>}
            <button style={{ ...styles.saveBtn, opacity: profileSaving ? 0.6 : 1 }} disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div style={{ ...styles.card, background: palette.panel, borderColor: palette.border }}>
          <div style={{ ...styles.cardTitle, color: palette.text }}>Change Password</div>
          <form onSubmit={handlePasswordSave}>
            <label style={{ ...styles.label, color: palette.subtext }}>Current Password</label>
            <input
              type="password"
              style={{ ...styles.input, background: palette.bg, borderColor: palette.border, color: palette.text }}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <label style={{ ...styles.label, color: palette.subtext }}>New Password</label>
            <input
              type="password"
              style={{ ...styles.input, background: palette.bg, borderColor: palette.border, color: palette.text }}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            {passwordError && <div style={styles.errorBox}>{passwordError}</div>}
            {passwordMessage && <div style={styles.successBox}>{passwordMessage}</div>}
            <button style={{ ...styles.saveBtn, opacity: passwordSaving ? 0.6 : 1 }} disabled={passwordSaving}>
              {passwordSaving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles = {
  main: { flex: 1, padding: '36px 44px', overflowY: 'auto', maxWidth: 640 },
  title: { fontFamily: fonts.serif, fontSize: 26, fontWeight: 700, marginBottom: 6 },
  subtitle: { fontSize: 13.5, marginBottom: 28 },
  card: { border: '1px solid', borderRadius: 4, padding: '24px 26px', marginBottom: 22 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: 700, marginBottom: 18 },
  label: {
    fontSize: 11.5,
    fontWeight: 700,
    display: 'block',
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '10px 13px',
    borderRadius: 3,
    border: '1px solid',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
  },
  saveBtn: {
    padding: '10px 22px',
    borderRadius: 3,
    border: `1px solid ${brand.gold}`,
    background: `linear-gradient(135deg, ${brand.gold}, ${brand.goldSoft})`,
    color: brand.navyDeep,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  errorBox: {
    background: '#fdf1f1',
    color: '#9a2c2c',
    border: '1px solid #f0c9c9',
    fontSize: 13,
    padding: '9px 13px',
    borderRadius: 3,
    marginBottom: 14,
  },
  successBox: {
    background: '#f0f9f0',
    color: '#2c6b2c',
    border: '1px solid #c9e5c9',
    fontSize: 13,
    padding: '9px 13px',
    borderRadius: 3,
    marginBottom: 14,
  },
}
