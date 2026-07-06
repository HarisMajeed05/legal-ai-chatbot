export const fonts = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

export const globalCss = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${fonts.sans}; }
  ::placeholder { color: #94a3b8; }
  a { color: inherit; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(201, 162, 39, 0.25); border-radius: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }

  .typing-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin: 0 2px;
    border-radius: 50%;
    background: #c9a227;
    animation: bounce 1.2s infinite ease-in-out;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .msg-in { animation: fadeInUp 0.25s ease; }

  .sidebar-item:hover { background: rgba(201, 162, 39, 0.08) !important; }
  .suggestion-card:hover { border-color: #c9a227 !important; box-shadow: 0 4px 16px rgba(11, 29, 58, 0.08); }
  .nav-link:hover { background: rgba(201, 162, 39, 0.1) !important; }
  .doc-card:hover { border-color: #c9a227 !important; }
`

// A single, always-navy sidebar and header (the "law firm" feel), with the
// main content area switching between a warm ivory (light) and deep navy
// (dark) reading surface.
export const brand = {
  navyDeep: '#0b1d3a',
  navyMid: '#132a52',
  navySoft: '#1c3766',
  gold: '#c9a227',
  goldSoft: '#e4c766',
  ivory: '#faf7f2',
  cream: '#f3ede0',
}

export const lightPalette = {
  bg: brand.ivory,
  panel: '#ffffff',
  panelAlt: brand.cream,
  border: '#e7ddc7',
  text: '#1a2333',
  subtext: '#6b7280',
  bubbleAssistantBg: '#ffffff',
  bubbleAssistantText: '#1a2333',
  inputBg: '#ffffff',
  accentBorder: 'rgba(201, 162, 39, 0.35)',
}

export const darkPalette = {
  bg: brand.navyDeep,
  panel: brand.navyMid,
  panelAlt: brand.navySoft,
  border: '#28406e',
  text: '#f3ede0',
  subtext: '#a8b3c7',
  bubbleAssistantBg: brand.navySoft,
  bubbleAssistantText: '#f3ede0',
  inputBg: brand.navySoft,
  accentBorder: 'rgba(228, 199, 102, 0.35)',
}

export const authCardStyle = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(160deg, ${brand.navyDeep} 0%, ${brand.navyMid} 55%, ${brand.navySoft} 100%)`,
    fontFamily: fonts.sans,
  },
  card: {
    width: 400,
    background: brand.ivory,
    borderRadius: 4,
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
    border: `1px solid ${brand.gold}`,
    padding: '40px 36px',
    position: 'relative',
  },
  goldRule: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    border: `1px solid rgba(201, 162, 39, 0.4)`,
    pointerEvents: 'none',
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${brand.navyDeep}, ${brand.navySoft})`,
    border: `1px solid ${brand.gold}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    margin: '0 auto 18px',
  },
  title: {
    textAlign: 'center',
    fontFamily: fonts.serif,
    fontSize: 25,
    fontWeight: 700,
    color: brand.navyDeep,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 11.5,
    fontWeight: 700,
    color: brand.navyMid,
    marginBottom: 6,
    display: 'block',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 3,
    border: '1px solid #e7ddc7',
    fontSize: 14,
    marginBottom: 17,
    outline: 'none',
    background: '#fff',
    fontFamily: fonts.sans,
  },
  button: {
    width: '100%',
    padding: '12px 0',
    borderRadius: 3,
    border: 'none',
    background: `linear-gradient(135deg, ${brand.gold}, ${brand.goldSoft})`,
    color: brand.navyDeep,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  error: {
    background: '#fdf1f1',
    color: '#9a2c2c',
    border: '1px solid #f0c9c9',
    fontSize: 13,
    padding: '9px 13px',
    borderRadius: 3,
    marginBottom: 16,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
    marginTop: 20,
  },
  switchLink: {
    color: brand.navyDeep,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: brand.gold,
  },
}
