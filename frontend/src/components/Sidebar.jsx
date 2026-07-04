import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Sidebar({ onNewChat, activeChatId, refreshKey }) {
  const [chats, setChats] = useState([])
  const { user, logout } = useAuth()
  const { palette, dark, toggleDark } = useTheme()
  const navigate = useNavigate()
  const { projectId } = useParams()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await client.get('/chat', { params: projectId ? { project_id: projectId } : {} })
        setChats(res.data)
      } catch (err) {
        console.error('Failed to load chat history', err)
      }
    }
    load()
  }, [refreshKey, projectId])

  const grouped = groupChatsByDate(chats)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ ...styles.sidebar, background: palette.panel, borderColor: palette.border }}>
      <div style={styles.logoRow}>
        <div style={styles.logoBadge}>⚖️</div>
        <div style={{ ...styles.logoText, color: palette.text }}>Law AI</div>
      </div>

      <button style={styles.newChatBtn} onClick={onNewChat}>
        + New Chat
      </button>

      <Link to="/projects" style={styles.dashboardBtn}>
        📁 Project Dashboard
      </Link>

      <div style={styles.historyLabel}>CHAT HISTORY</div>
      <div style={styles.historyList}>
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <div style={styles.groupLabel}>{group}</div>
            {items.map((c) => (
              <div
                key={c.id}
                className="sidebar-item"
                style={{
                  ...styles.historyItem,
                  background: c.id === activeChatId ? '#eef2ff' : 'transparent',
                }}
                onClick={() => navigate(projectId ? `/projects/${projectId}/chat/${c.id}` : `/chat/${c.id}`)}
              >
                💬 {c.title || 'Untitled chat'}
              </div>
            ))}
          </div>
        ))}
        {chats.length === 0 && <div style={styles.emptyHistory}>No conversations yet</div>}
      </div>

      <div style={styles.footer}>
        <div style={styles.userRow}>
          <div style={styles.userAvatar}>{(user?.name || '?')[0].toUpperCase()}</div>
          <div style={{ ...styles.userName, color: palette.text }}>{user?.name}</div>
        </div>
        <div style={{ ...styles.footerLink, color: palette.subtext }} onClick={toggleDark}>
          {dark ? '☀ Light mode' : '🌙 Dark mode'}
        </div>
        <div style={{ ...styles.footerLink, color: palette.subtext }}>⚙ Settings</div>
        <div style={{ ...styles.footerLink, color: palette.subtext }} onClick={handleLogout}>↩ Logout</div>
      </div>
    </div>
  )
}

function groupChatsByDate(chats) {
  const today = new Date().toDateString()
  const groups = { Today: [], Older: [] }
  for (const c of chats) {
    const d = new Date(c.created_at).toDateString()
    if (d === today) groups.Today.push(c)
    else groups.Older.push(c)
  }
  if (groups.Today.length === 0) delete groups.Today
  if (groups.Older.length === 0) delete groups.Older
  return groups
}

const styles = {
  sidebar: {
    width: 260,
    borderRight: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '20px 16px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
  },
  logoText: {
    fontWeight: 700,
    fontSize: 16,
    color: '#0f172a',
  },
  newChatBtn: {
    padding: '10px 0',
    borderRadius: 10,
    border: 'none',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 10,
  },
  dashboardBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '9px 0',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#334155',
    fontSize: 13.5,
    fontWeight: 500,
    textDecoration: 'none',
    marginBottom: 18,
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
  },
  groupLabel: {
    fontSize: 11,
    color: '#94a3b8',
    margin: '10px 0 4px',
  },
  historyItem: {
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    color: '#334155',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: 2,
  },
  emptyHistory: {
    fontSize: 12.5,
    color: '#94a3b8',
    padding: '8px 10px',
  },
  footer: {
    borderTop: '1px solid #eef1f5',
    paddingTop: 14,
    marginTop: 10,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footerLink: {
    fontSize: 13,
    color: '#64748b',
    padding: '7px 4px',
    cursor: 'pointer',
  },
}
