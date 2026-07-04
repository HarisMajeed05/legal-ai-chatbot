import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'
import Sidebar from '../components/Sidebar'
import { colors } from '../styles'

const SUGGESTIONS = [
  'What are the key elements of a contract?',
  'Explain the concept of due process in law.',
  'Summarize intellectual property rights.',
  'What is the difference between civil and criminal law?',
]

export default function ChatPage() {
  const { chatId, projectId } = useParams()
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const scrollRef = useRef(null)

  const loadHistory = useCallback(async (id) => {
    if (!id) {
      setMessages([])
      return
    }
    setHistoryLoading(true)
    try {
      const res = await client.get(`/chat/${id}/history`)
      setMessages(res.data.messages.map((m) => ({ role: m.role, content: m.content })))
    } catch (err) {
      console.error('Failed to load chat history', err)
      setMessages([])
    } finally {
      setHistoryLoading(false)
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

    try {
      const res = await client.post('/chat', {
        message: content,
        chat_id: chatId || null,
        project_id: projectId || null,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }])

      // If this was a brand new chat, adopt its real ID in the URL so refreshing,
      // and switching away and back, keeps loading the right conversation and context.
      if (!chatId) {
        setSidebarRefreshKey((k) => k + 1)
        navigate(projectId ? `/projects/${projectId}/chat/${res.data.chat_id}` : `/chat/${res.data.chat_id}`, {
          replace: true,
        })
      } else {
        setSidebarRefreshKey((k) => k + 1)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong reaching the backend. Please try again.', error: true },
      ])
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    navigate(projectId ? `/projects/${projectId}/chat` : '/chat')
    setMessages([])
  }

  const isEmpty = messages.length === 0 && !historyLoading

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.bg }}>
      <Sidebar onNewChat={handleNewChat} activeChatId={chatId} refreshKey={sidebarRefreshKey} />

      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.logoBadge}>⚖️</div>
          <div>
            <div style={styles.headerTitle}>Law AI Assistant</div>
            <div style={styles.headerSubtitle}>Ask me anything about legal concepts, case law, or procedures</div>
          </div>
        </header>

        <main style={styles.chatArea}>
          {isEmpty ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>⚖️</div>
              <div style={styles.emptyTitle}>How can I help with your legal research today?</div>
              <div style={styles.suggestionGrid}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion-card" style={styles.suggestionCard} onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.messageList}>
              {messages.map((m, i) => (
                <div key={i} style={{ ...styles.messageRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && <div style={styles.avatarAssistant}>⚖️</div>}
                  <div
                    style={{
                      ...styles.bubble,
                      ...(m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant),
                      ...(m.error ? styles.bubbleError : {}),
                    }}
                  >
                    {m.content}
                  </div>
                  {m.role === 'user' && <div style={styles.avatarUser}>You</div>}
                </div>
              ))}

              {loading && (
                <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                  <div style={styles.avatarAssistant}>⚖️</div>
                  <div style={{ ...styles.bubble, ...styles.bubbleAssistant }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </main>

        <footer style={styles.footer}>
          <div style={styles.inputBar}>
            <input
              style={styles.input}
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
          <div style={styles.disclaimer}>
            AI assistants can make mistakes. Consider checking important legal information with a licensed attorney.
          </div>
        </footer>
      </div>
    </div>
  )
}

const styles = {
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '18px 28px',
    borderBottom: '1px solid #eef1f5',
    background: '#fff',
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 20,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: 600,
    color: '#1e293b',
    maxWidth: 380,
  },
  suggestionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    width: '100%',
    maxWidth: 560,
    marginTop: 8,
  },
  suggestionCard: {
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#334155',
    fontSize: 13.5,
    cursor: 'pointer',
    lineHeight: 1.4,
  },
  messageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    maxWidth: 820,
    margin: '0 auto',
  },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: 10 },
  avatarAssistant: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    flexShrink: 0,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#e2e8f0',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '72%',
    padding: '13px 17px',
    borderRadius: 16,
    fontSize: 14.5,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
  bubbleUser: {
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    background: '#f1f5f9',
    color: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  bubbleError: { background: '#fef2f2', color: '#b91c1c' },
  footer: {
    padding: '16px 28px 20px',
    borderTop: '1px solid #eef1f5',
    background: '#fff',
  },
  inputBar: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '6px 6px 6px 18px',
    maxWidth: 820,
    margin: '0 auto',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 14.5,
    color: '#1e293b',
    padding: '10px 0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
    flexShrink: 0,
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 10,
  },
}
