import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [isPrivate, setIsPrivate] = useState(
    () => localStorage.getItem('privacy') === 'true'
  )
  const [compactView, setCompactView] = useState(
    () => localStorage.getItem('compact') === 'true'
  )
  const [historyMonths, setHistoryMonthsState] = useState(
    () => Number(localStorage.getItem('history_months')) || 6
  )
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('notifications') === 'true'
         && (typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false)
  )

  // Aplica compact al elemento html para que el CSS lo tome
  useEffect(() => {
    document.documentElement.setAttribute('data-compact', String(compactView))
  }, [compactView])

  const togglePrivacy = () => {
    setIsPrivate(v => {
      localStorage.setItem('privacy', !v)
      return !v
    })
  }

  const toggleCompact = () => {
    setCompactView(v => {
      localStorage.setItem('compact', !v)
      return !v
    })
  }

  const setHistoryMonths = (n) => {
    setHistoryMonthsState(n)
    localStorage.setItem('history_months', n)
  }

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      localStorage.setItem('notifications', 'false')
      return { status: 'disabled' }
    }
    if (typeof Notification === 'undefined') {
      return { status: 'unsupported' }
    }
    if (Notification.permission === 'denied') {
      return { status: 'denied' }
    }
    const permission = await Notification.requestPermission()
    const granted = permission === 'granted'
    setNotificationsEnabled(granted)
    localStorage.setItem('notifications', granted)
    return { status: granted ? 'granted' : 'denied' }
  }

  return (
    <SettingsContext.Provider value={{
      isPrivate,            togglePrivacy,
      compactView,          toggleCompact,
      historyMonths,        setHistoryMonths,
      notificationsEnabled, toggleNotifications,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
