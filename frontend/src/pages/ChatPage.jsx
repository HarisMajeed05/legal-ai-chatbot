import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar'
import DocumentPanel from '../components/DocumentPanel'
import { useTheme } from '../context/ThemeContext'
import { brand, fonts } from '../styles'

const API_BASE = 'http://localhost:8000/api'

const SUGGESTIONS = [
  'What are the key elements of a contract?',
  'Explain the concept of due process in law.',
  'Summarize intellectual property rights.',
  'What is the difference between civil and criminal law?',
]

export default function ChatPage() {
  const { chatId, projectId } = useParams()
  const navigate = useNavigate()
  const { palette } = useTheme()

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const scrollRef = useRef(null)

  // Tracks whether this component instance is still mounted, so a stream
  // that is still writing tokens never touches state after the page has
  // moved on. This is what stops the blank page crash.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadHistory = useCallback(async (id) => {
    if (!id) {
      setMessages([])
      return
    }
    setHistoryLoading(true)
    try {
      const res = await client.get(`/chat/${id}/history`)
      if (!isMountedRef.current) return
      setMessages(
        res.data.messages.map((m) => ({ role: m.role, content: m.content, sources: m.sources || [] }))
      )
    } catch (err) {
      console.error('Failed to load chat history', err)
      if (isMountedRef.current) setMessages([])
    } finally {
      if (isMountedRef.current) setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory(chatId)
  }, [chatId, loadHistory])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const content = (text ?? message).trim()
    if (!content) return

    setMessages((prev) => [...prev, { role: 'user', content }])
    setMessage('')
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [], streaming: true }])

    const token = localStorage.getItem('token')
    let resolvedChatId = chatId

    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: content, chat_id: chatId || null, project_id: projectId || null }),
      })

      if (!res.ok || !res.body) throw new Error(`Server responded with status ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!isMountedRef.current) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop()

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim()
          if (!line) continue
          const event = JSON.parse(line)

          if (event.type === 'chat_id') {
            // Just remember the id here. Do NOT navigate yet, doing so mid
            // stream is what caused the component to unmount while tokens
            // were still arriving, which is what crashed the page.
            resolvedChatId = event.chat_id
          } else if (event.type === 'token') {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              next[next.length - 1] = { ...last, content: last.content + event.text }
              return next
            })
          } else if (event.type === 'done') {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              next[next.length - 1] = { ...last, sources: event.sources, streaming: false }
              return next
            })
            setSidebarRefreshKey((k) => k + 1)

            // The backend has already saved the full turn by the time this
            // event arrives, so it is safe to switch the URL now, the new
            // page instance will load the same conversation from history.
            if (!chatId && resolvedChatId) {
              navigate(projectId ? `/projects/${projectId}/chat/${resolvedChatId}` : `/chat/${resolvedChatId}`, {
                replace: true,
              })
            }
          } else if (event.type === 'error') {
            throw new Error(event.detail)
          }
        }
      }
    } catch (err) {
      console.error(err)
      if (isMountedRef.current) {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = {
            role: 'assistant',
            content: 'Something went wrong reaching the backend. Please try again.',
            error: true,
            sources: [],
          }
          return next
        })
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const handleNewChat = () => {
    navigate(projectId ? `/projects/${projectId}/chat` : '/chat')
    setMessages([])
  }

  const handleCopy = (text) => navigator.clipboard.writeText(text)

  const handleRegenerate = (index) => {
    const userMsg = messages[index - 1]
    if (userMsg?.role === 'user') {
      setMessages((prev) => prev.slice(0, index))
      sendMessage(userMsg.content)
    }
  }

  const isEmpty = messages.length === 0 && !historyLoading

  return (
    <div style={{ display: 'flex', height: '100vh', background: palette.bg }}>
      <Sidebar onNewChat={handleNewChat} activeChatId={chatId} refreshKey={sidebarRefreshKey} />

      <div style={{ ...styles.main, background: palette.bg }}>
        <header style={{ ...styles.header, borderColor: palette.border, background: palette.panel }}>
          <div style={styles.logoBadge}>⚖</div>
          <div>
            <div style={{ ...styles.headerTitle, color: palette.text }}>Law AI Assistant</div>
            <div style={{ ...styles.headerSubtitle, color: palette.subtext }}>
              Ask me anything about legal concepts, case law, or procedures
            </div>
          </div>
        </header>

        <main style={styles.chatArea}>
          {isEmpty ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⚖</div>
              <div style={{ ...styles.emptyTitle, color: palette.text }}>
                How can I help with your legal research today?
              </div>
              <div style={styles.suggestionGrid}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="suggestion-card"
                    style={{
                      ...styles.suggestionCard,
                      background: palette.panel,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.messageList}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="msg-in"
                  style={{ ...styles.messageRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  {m.role === 'assistant' && <div style={styles.avatarAssistant}>⚖</div>}
                  <div style={{ maxWidth: '72%' }}>
                    <div
                      style={{
                        ...styles.bubble,
                        ...(m.role === 'user'
                          ? styles.bubbleUser
                          : {
                            background: palette.bubbleAssistantBg,
                            color: palette.bubbleAssistantText,
                            border: `1px solid ${palette.border}`,
                            borderLeft: `3px solid ${brand.gold}`,
                            borderRadius: '4px 14px 14px 4px',
                          }),
                        ...(m.error ? styles.bubbleError : {}),
                      }}
                    >
                      {m.content}
                      {m.streaming && <span className="typing-dot" style={{ marginLeft: 4 }} />}
                    </div>

                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                      <div style={styles.sourcesBox}>
                        <div style={styles.sourcesLabel}>Sources</div>
                        {m.sources.map((s, si) => (
                          <div key={si} style={styles.sourceItem}>📄 {s.filename}</div>
                        ))}
                      </div>
                    )}

                    {m.role === 'assistant' && !m.streaming && (
                      <div style={styles.actionsRow}>
                        <button style={styles.actionBtn} onClick={() => handleCopy(m.content)}>Copy</button>
                        <button style={styles.actionBtn} onClick={() => handleRegenerate(i)}>Regenerate</button>
                      </div>
                    )}
                  </div>
                  {m.role === 'user' && <div style={styles.avatarUser}>You</div>}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}
        </main>

        <footer style={{ ...styles.footer, borderColor: palette.border, background: palette.panel }}>
          <div style={{ ...styles.inputBar, background: palette.inputBg, borderColor: palette.accentBorder }}>
            <input
              style={{ ...styles.input, color: palette.text }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="Ask a legal question..."
              disabled={loading}
            />
            <button
              style={{ ...styles.sendButton, opacity: loading || !message.trim() ? 0.5 : 1 }}
              onClick={() => sendMessage()}
              disabled={loading || !message.trim()}
            >
              ➤
            </button>
          </div>
          <div style={{ ...styles.disclaimer, color: palette.subtext }}>
            AI assistants can make mistakes. Consider checking important legal information with a licensed attorney.
          </div>
        </footer>
      </div>

      {projectId && <DocumentPanel projectId={projectId} />}
    </div>
  )
}

const styles = {
  main: { flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { display: 'flex', alignItems: 'center', gap: 14, padding: '18px 28px', borderBottom: '1px solid' },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${brand.navyDeep}, ${brand.navySoft})`,
    border: `1px solid ${brand.gold}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    color: brand.gold,
    flexShrink: 0,
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 19, fontWeight: 700 },
  headerSubtitle: { fontSize: 12.5, marginTop: 2 },
  chatArea: { flex: 1, overflowY: 'auto', padding: '28px' },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 22,
  },
  emptyIcon: { fontSize: 38, color: brand.gold },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 19, fontWeight: 700, maxWidth: 400 },
  suggestionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 580, marginTop: 8 },
  suggestionCard: {
    textAlign: 'left',
    padding: '16px 18px',
    borderRadius: 4,
    border: '1px solid',
    fontSize: 13.5,
    cursor: 'pointer',
    lineHeight: 1.45,
    transition: 'all 0.15s ease',
  },
  messageList: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820, margin: '0 auto' },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: 10 },
  avatarAssistant: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${brand.navyDeep}, ${brand.navySoft})`,
    border: `1px solid ${brand.gold}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    color: brand.gold,
    flexShrink: 0,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: brand.gold,
    color: brand.navyDeep,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  bubble: { padding: '13px 18px', fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  bubbleUser: {
    background: `linear-gradient(135deg, ${brand.navyDeep}, ${brand.navyMid})`,
    color: '#fff',
    borderRadius: '14px 4px 4px 14px',
  },
  bubbleError: { background: '#fdf1f1', color: '#9a2c2c', borderLeft: '3px solid #c0392b' },
  sourcesBox: {
    marginTop: 6,
    padding: '9px 13px',
    borderRadius: 4,
    background: 'rgba(201, 162, 39, 0.08)',
    border: `1px solid rgba(201, 162, 39, 0.25)`,
  },
  sourcesLabel: { fontSize: 10.5, fontWeight: 700, color: brand.gold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  sourceItem: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  actionsRow: { display: 'flex', gap: 12, marginTop: 6, marginLeft: 6 },
  actionBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: 11.5, cursor: 'pointer', padding: 0 },
  footer: { padding: '16px 28px 20px', borderTop: '1px solid' },
  inputBar: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    border: '1px solid',
    borderRadius: 4,
    padding: '6px 6px 6px 18px',
    maxWidth: 820,
    margin: '0 auto',
  },
  input: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14.5, padding: '10px 0' },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 3,
    border: 'none',
    background: `linear-gradient(135deg, ${brand.gold}, ${brand.goldSoft})`,
    color: brand.navyDeep,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  disclaimer: { textAlign: 'center', fontSize: 11.5, marginTop: 10 },
}