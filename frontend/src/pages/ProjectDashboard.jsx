import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { brand, fonts } from '../styles'

export default function ProjectDashboard() {
  const [projects, setProjects] = useState([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const { palette } = useTheme()

  const loadProjects = async () => {
    const res = await client.get('/projects')
    setProjects(res.data)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      await client.post('/projects', { name: newName.trim() })
      setNewName('')
      setShowNewForm(false)
      await loadProjects()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: palette.bg }}>
      <Sidebar onNewChat={() => navigate('/chat')} />

      <div style={styles.main}>
        <div style={styles.headerRow}>
          <div>
            <div style={{ ...styles.title, color: palette.text }}>Case Projects</div>
            <div style={{ ...styles.subtitle, color: palette.subtext }}>
              Organize your research and documents by case or client
            </div>
          </div>
          <button style={styles.newProjectBtn} onClick={() => setShowNewForm((v) => !v)}>
            + New Project
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} style={styles.newForm}>
            <input
              style={{ ...styles.newInput, background: palette.panel, borderColor: palette.border, color: palette.text }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name, e.g. Smith v. Johnson"
              autoFocus
            />
            <button style={styles.createBtn} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
        )}

        <div style={styles.grid}>
          {projects.map((p) => (
            <div key={p.id} className="doc-card" style={{ ...styles.card, background: palette.panel, borderColor: palette.border }}>
              <div style={styles.cardTopRule} />
              <div style={styles.cardIcon}>⚖</div>
              <div style={{ ...styles.cardTitle, color: palette.text }}>{p.name}</div>
              <div style={{ ...styles.cardMeta, color: palette.subtext }}>
                Opened {new Date(p.created_at).toLocaleDateString()}
              </div>
              <button style={styles.openBtn} onClick={() => navigate(`/projects/${p.id}/chat`)}>
                Open Project →
              </button>
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ ...styles.emptyState, color: palette.subtext }}>
              No projects yet. Create one to organize chats and documents by case or client.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  main: { flex: 1, padding: '36px 44px', overflowY: 'auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  title: { fontFamily: fonts.serif, fontSize: 26, fontWeight: 700 },
  subtitle: { fontSize: 13.5, marginTop: 6, maxWidth: 460 },
  newProjectBtn: {
    padding: '11px 20px',
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
  newForm: { display: 'flex', gap: 10, marginBottom: 28 },
  newInput: { flex: 1, maxWidth: 340, padding: '11px 15px', borderRadius: 3, border: '1px solid', fontSize: 13.5, outline: 'none' },
  createBtn: {
    padding: '11px 20px',
    borderRadius: 3,
    border: 'none',
    background: brand.navyDeep,
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 },
  card: { borderRadius: 4, padding: '24px 22px', border: '1px solid', position: 'relative', transition: 'all 0.15s ease' },
  cardTopRule: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: brand.gold, borderRadius: '4px 4px 0 0' },
  cardIcon: { fontSize: 22, color: brand.gold, marginBottom: 12 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 16.5, fontWeight: 700, marginBottom: 4 },
  cardMeta: { fontSize: 12, marginBottom: 18 },
  openBtn: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 3,
    border: `1px solid ${brand.gold}`,
    background: 'transparent',
    color: brand.navyDeep,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center', padding: '70px 0', fontSize: 14 },
}
