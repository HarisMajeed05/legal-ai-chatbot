import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export const lightPalette = {
  bg: '#f8fafc',
  panel: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  subtext: '#64748b',
  bubbleAssistantBg: '#f1f5f9',
  bubbleAssistantText: '#1e293b',
  inputBg: '#f8fafc',
  hover: '#f1f5f9',
}

export const darkPalette = {
  bg: '#0f172a',
  panel: '#111827',
  border: '#1f2937',
  text: '#f1f5f9',
  subtext: '#94a3b8',
  bubbleAssistantBg: '#1e293b',
  bubbleAssistantText: '#e2e8f0',
  inputBg: '#1e293b',
  hover: '#1e293b',
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const palette = dark ? darkPalette : lightPalette

  return (
    <ThemeContext.Provider value={{ dark, toggleDark: () => setDark((d) => !d), palette }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
