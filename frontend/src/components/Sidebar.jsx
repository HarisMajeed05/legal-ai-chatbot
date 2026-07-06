import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { brand, fonts } from '../styles'

export default function Sidebar({ onNewChat, activeChatId, refreshKey }) {
  const [chats, setChats] = useState([])
  const [projects, setProjects] = useState([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [hoveredChatId, setHoveredChatId] = useState(null)
  const [deletingChatId, setDeletingChatId] = useState(null)
  const { user, logout } = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate = useNavigate()
  const { projectId } = useParams()

  const loadChats = async () => {
    try {
      const res = await client.get('/chat', { params: projectId ? { project_id: projectId } : {} })
      setChats(res.data)
    } catch (err) {
      console.error('Failed to load chat history', err)
    }
  }

  useEffect(() => {
    loadChats()
  }, [refreshKey, projectId])

  useEffect(() => {
    client.get('/projects').then((res) => setProjects(res.data)).catch(() => { })
  }, [])

  const currentProject = projects.find((p) => p.id === projectId)
  const grouped = groupChatsByDate(chats)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const switchToProject = (id) => {
    setSwitcherOpen(false)
    navigate(`/projects/${id}/chat`)
  }

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation()
    const confirmed = window.confirm('Delete this chat? This cannot be undone.')
    if (!confirmed) return

    setDeletingChatId(chatId)
    try {
      await client.delete(`/chat/${chatId}`)
      await loadChats()
      if (chatId === activeChatId) {
        navigate(projectId ? `/projects/${projectId}/chat` : '/chat')
      }
    } catch (err) {
      console.error('Failed to delete chat', err)
      window.alert('Could not delete this chat. Please try again.')
    } finally {
      setDeletingChatId(null)
    }
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoRow}>
        <div style={styles.logoBadge}>⚖</div>
        <div style={styles.logoText}>Law AI</div>
      </div>

      <div style={styles.breadcrumbWrap}>
        <div style={styles.breadcrumb} onClick={() => setSwitcherOpen((v) => !v)}>
          <span style={styles.breadcrumbRoot}>Workspace</span>
          {currentProject && (
            <>
              <span style={styles.breadcrumbSep}>/</span>
              <span style={styles.breadcrumbActive}>{currentProject.name}</span>
            </>
          )}
          <span style={styles.breadcrumbCaret}>{switcherOpen ? '▲' : '▼'}</span>
        </div>

        {switcherOpen && (
          <div style={styles.switcherMenu}>
            <div
              className="nav-link"
              style={styles.switcherItem}
              onClick={() => {
                setSwitcherOpen(false)
                navigate('/chat')
              }}
            >
              💬 General workspace
            </div>
            {projects.map((p) => (
              <div
                key={p.id}
                className="nav-link"
                style={{ ...styles.switcherItem, fontWeight: p.id === projectId ? 700 : 500 }}
                onClick={() => switchToProject(p.id)}
              >
                📁 {p.name}
              </div>
            ))}
            <Link to="/projects" style={styles.switcherManage} onClick={() => setSwitcherOpen(false)}>
              Manage all projects →
            </Link>
          </div>
        )}
      </div>

      <button style={styles.newChatBtn} onClick={onNewChat}>
        + New Chat
      </button>

      <Link to="/projects" className="nav-link" style={styles.dashboardBtn}>
        Project Dashboard
      </Link>

      <div style={styles.historyLabel}>Chat History</div>
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
                  background: c.id === activeChatId ? 'rgba(201, 162, 39, 0.14)' : 'transparent',
                  borderLeft: c.id === activeChatId ? `2px solid ${brand.gold}` : '2px solid transparent',
                  opacity: deletingChatId === c.id ? 0.5 : 1,
                }}
                onMouseEnter={() => setHoveredChatId(c.id)}
                onMouseLeave={() => setHoveredChatId((h) => (h === c.id ? null : h))}
                onClick={() => navigate(projectId ? `/projects/${projectId}/chat/${c.id}` : `/chat/${c.id}`)}
              >
                <span style={styles.historyItemTitle}>{c.title || 'Untitled chat'}</span>
                {(hoveredChatId === c.id || c.id === activeChatId) && (
                  <button
                    style={styles.deleteBtn}
                    title="Delete chat"
                    onClick={(e) => handleDeleteChat(e, c.id)}
                    disabled={deletingChatId === c.id}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
        {chats.length === 0 && <div style={styles.emptyHistory}>No conversations yet</div>}
      </div>

      <div style={styles.footer}>
        <div style={styles.userRow}>
          <div style={styles.userAvatar}>{(user?.name || '?')[0].toUpperCase()}</div>
          <div style={styles.userName}>{user?.name}</div>
        </div>
        <div className="nav-link" style={styles.footerLink} onClick={toggleDark}>
          {dark ? '☀ Light mode' : '☾ Dark mode'}
        </div>
        <div className="nav-link" style={styles.footerLink}>⚙ Settings</div>
        <div className="nav-link" style={styles.footerLink} onClick={handleLogout}>↩ Logout</div>
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
    width: 272,
    background: brand.navyDeep,
    borderRight: `1px solid ${brand.navySoft}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '22px 16px',
    color: brand.ivory,
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${brand.navyMid}, ${brand.navySoft})`,
    border: `1px solid ${brand.gold}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    color: brand.gold,
  },
  logoText: { fontFamily: fonts.serif, fontWeight: 700, fontSize: 18, color: brand.ivory, letterSpacing: 0.3 },
  breadcrumbWrap: { position: 'relative', marginBottom: 16 },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11.5,
    color: '#a8b3c7',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: 3,
    border: `1px solid ${brand.navySoft}`,
  },
  breadcrumbRoot: { color: '#a8b3c7' },
  breadcrumbSep: { color: '#4a5c80' },
  breadcrumbActive: { color: brand.goldSoft, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  breadcrumbCaret: { marginLeft: 'auto', fontSize: 8, color: '#a8b3c7' },
  switcherMenu: {
    position: 'absolute',
    top: '110%',
    left: 0,
    right: 0,
    background: brand.navyMid,
    border: `1px solid ${brand.navySoft}`,
    borderRadius: 4,
    padding: 6,
    zIndex: 20,
    boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
  },
  switcherItem: { fontSize: 13, color: brand.ivory, padding: '8px 10px', borderRadius: 3, cursor: 'pointer' },
  switcherManage: { display: 'block', fontSize: 11.5, color: brand.goldSoft, padding: '8px 10px', textDecoration: 'none' },
  newChatBtn: {
    padding: '11px 0',
    borderRadius: 3,
    border: `1px solid ${brand.gold}`,
    background: `linear-gradient(135deg, ${brand.gold}, ${brand.goldSoft})`,
    color: brand.navyDeep,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    cursor: 'pointer',
    marginBottom: 10,
  },
  dashboardBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '9px 0',
    borderRadius: 3,
    border: `1px solid ${brand.navySoft}`,
    color: brand.ivory,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    marginBottom: 20,
  },
  historyLabel: {
    fontFamily: fonts.serif,
    fontSize: 11.5,
    fontWeight: 700,
    color: brand.goldSoft,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  historyList: { flex: 1, overflowY: 'auto' },
  groupLabel: { fontSize: 10.5, color: '#6b7ba0', margin: '10px 0 4px' },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '8px 6px 8px 10px',
    borderRadius: 3,
    fontSize: 13,
    color: '#d6dcea',
    cursor: 'pointer',
    marginBottom: 2,
  },
  historyItemTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#a8b3c7',
    fontSize: 12.5,
    cursor: 'pointer',
    padding: '2px 6px',
    flexShrink: 0,
    borderRadius: 3,
  },
  emptyHistory: { fontSize: 12.5, color: '#6b7ba0', padding: '8px 10px' },
  footer: { borderTop: `1px solid ${brand.navySoft}`, paddingTop: 14, marginTop: 10 },
  userRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  userAvatar: {
    width: 27,
    height: 27,
    borderRadius: '50%',
    background: brand.gold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: brand.navyDeep,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: brand.ivory,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footerLink: { fontSize: 13, color: '#a8b3c7', padding: '7px 4px', borderRadius: 3, cursor: 'pointer' },
}