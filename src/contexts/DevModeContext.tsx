import React, { createContext, useContext, useState } from 'react'

interface DevModeContextType {
  isDevMode: boolean
  setDevMode: (enabled: boolean) => void
  toggleDevMode: () => void
}

const DevModeContext = createContext<DevModeContextType>({
  isDevMode: false,
  setDevMode: () => {},
  toggleDevMode: () => {},
})

export const DevModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('relay_dev_mode') === 'true'
    } catch {
      return false
    }
  })

  const setDevMode = (enabled: boolean) => {
    setIsDevMode(enabled)
    try {
      localStorage.setItem('relay_dev_mode', String(enabled))
    } catch {}
  }

  const toggleDevMode = () => {
    setDevMode(!isDevMode)
  }

  return (
    <DevModeContext.Provider value={{ isDevMode, setDevMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  )
}

export const useDevMode = () => useContext(DevModeContext)
