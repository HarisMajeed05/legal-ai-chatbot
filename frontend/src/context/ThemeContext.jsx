import { createContext, useContext, useState, useEffect } from 'react'
import { lightPalette, darkPalette } from '../styles'

const ThemeContext = createContext(null)

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
