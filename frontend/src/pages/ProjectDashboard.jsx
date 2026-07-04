import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar'
import { colors } from '../styles'

export default function ProjectDashboard() {
  const [projects, setProjects] = useState([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

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
    <div style={{ display: 'flex', height: '100vh', background: colors.bg }}>
      <Sidebar onNewChat={() => navigate('/chat')} />

      <div style={styles.main}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.title}>Projects</div>
            <div style={styles.subtitle}>Manage and collaborate on your AI-powered projects, organized by case or client</div>
          </div>
          <button style={styles.newProjectBtn} onClick={() => setShowNewForm((v) => !v)}>
            + New Project
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} style={styles.newForm}>
            <input
              style={styles.newInput}
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
            <div key={p.id} style={styles.card}>
              <div style={styles.cardIcon}>📁</div>
              <div style={styles.cardTitle}>{p.name}</div>
              <div style={styles.cardMeta}>
                Created {new Date(p.created_at).toLocaleDateString()}
              </div>
              <button style={styles.openBtn} onClick={() => navigate(`/projects/${p.id}/chat`)}>
                Open Project →
              </button>
            </div>
          ))}
          {projects.length === 0 && (
            <div style={styles.emptyState}>
              No projects yet. Create one to organize chats by case or client.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: 13.5, color: '#64748b', marginTop: 4, maxWidth: 460 },
  newProjectBtn: {
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  newForm: {
    display: 'flex',
    gap: 10,
    marginBottom: 24,
  },
  newInput: {
    flex: 1,
    maxWidth: 340,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 13.5,
    outline: 'none',
  },
  createBtn: {
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 18,
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '20px',
  },
  cardIcon: { fontSize: 22, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  openBtn: {
    width: '100%',
    padding: '9px 0',
    borderRadius: 9,
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#1e40af',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 0',
    color: '#94a3b8',
    fontSize: 14,
  },
}
