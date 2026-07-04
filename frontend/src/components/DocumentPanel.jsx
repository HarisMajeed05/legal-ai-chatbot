import { useEffect, useState, useRef } from 'react'
import client from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function DocumentPanel({ projectId }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const { palette } = useTheme()

  const loadDocuments = async () => {
    try {
      const res = await client.get('/documents', { params: { project_id: projectId } })
      setDocuments(res.data)
    } catch (err) {
      console.error('Failed to load documents', err)
    }
  }

  useEffect(() => {
    if (projectId) loadDocuments()
  }, [projectId])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setUploading(true)

    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('file', file)

    try {
      await client.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadDocuments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try a different file.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!projectId) return null

  return (
    <div style={{ ...styles.panel, background: palette.panel, borderColor: palette.border }}>
      <div style={{ ...styles.title, color: palette.text }}>Case Documents</div>
      <div style={{ ...styles.subtitle, color: palette.subtext }}>
        Uploaded PDFs are used to ground answers in this project's own documents.
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="doc-upload-input"
      />
      <label htmlFor="doc-upload-input" style={styles.uploadBtn}>
        {uploading ? 'Uploading and indexing...' : '+ Upload PDF'}
      </label>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.list}>
        {documents.map((d) => (
          <div key={d.id} style={{ ...styles.docItem, borderColor: palette.border }}>
            <div style={{ color: palette.text, fontSize: 13, fontWeight: 600 }}>{d.filename}</div>
            <div style={{ color: palette.subtext, fontSize: 11.5 }}>{d.chunk_count} chunks indexed</div>
          </div>
        ))}
        {documents.length === 0 && (
          <div style={{ color: palette.subtext, fontSize: 12.5 }}>No documents uploaded yet</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  panel: {
    width: 260,
    borderLeft: '1px solid',
    padding: '20px 16px',
    height: '100vh',
    overflowY: 'auto',
  },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11.5, lineHeight: 1.4, marginBottom: 14 },
  uploadBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '9px 0',
    borderRadius: 9,
    border: '1px dashed #94a3b8',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#3b82f6',
    cursor: 'pointer',
    marginBottom: 14,
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 11.5,
    padding: '7px 10px',
    borderRadius: 8,
    marginBottom: 12,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  docItem: {
    padding: '9px 10px',
    borderRadius: 9,
    border: '1px solid',
  },
}
