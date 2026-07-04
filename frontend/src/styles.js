export const colors = {
  bg: '#f8fafc',
  panel: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subtext: '#64748b',
  primary: '#3b82f6',
  primaryDark: '#1e3a8a',
  danger: '#dc2626',
}

export const globalCss = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${colors.bg}; }
  ::placeholder { color: #94a3b8; }
  a { color: inherit; }
  .typing-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin: 0 2px;
    border-radius: 50%;
    background: #94a3b8;
    animation: bounce 1.2s infinite ease-in-out;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  .sidebar-item:hover { background: #f1f5f9 !important; }
  .suggestion-card:hover { background: #eef2ff !important; border-color: #c7d2fe !important; }
`

export const authCardStyle = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
  },
  card: {
    width: 380,
    background: '#fff',
    borderRadius: 18,
    boxShadow: '0 10px 40px rgba(30, 41, 59, 0.08)',
    border: '1px solid #e2e8f0',
    padding: '36px 32px',
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    margin: '0 auto 16px',
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '11px 0',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
    color: '#fff',
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 8,
    marginBottom: 14,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    marginTop: 18,
  },
  switchLink: {
    color: '#3b82f6',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
}
