import { useState, useCallback } from 'react'
import Navigation, { type TabId } from './components/Navigation'
import HomePage from './pages/HomePage'
import CameraPage from './pages/CameraPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleMealSaved = useCallback(() => {
    setRefreshKey((k) => k + 1)
    setTab('home')
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {tab === 'home' && <HomePage refreshKey={refreshKey} />}
        {tab === 'camera' && <CameraPage onMealSaved={handleMealSaved} />}
        {tab === 'history' && <HistoryPage />}
        {tab === 'settings' && <SettingsPage />}
      </div>
      <Navigation active={tab} onNavigate={setTab} />
    </div>
  )
}
