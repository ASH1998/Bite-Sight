import { useState, useEffect } from 'react'
import { getSettings, saveSettings, clearAllData } from '../services/database'
import Header from '../components/Header'

export default function SettingsPage() {
  const [goal, setGoal] = useState(2000)
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    getSettings().then((s) => {
      setGoal(s.dailyCalorieGoal)
      setApiKey(s.geminiApiKey || '')
    })
  }, [])

  const handleSave = async () => {
    await saveSettings({ dailyCalorieGoal: goal, geminiApiKey: apiKey.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = async () => {
    if (confirm('Delete all meal history? This cannot be undone.')) {
      await clearAllData()
      alert('All data cleared.')
    }
  }

  return (
    <div className="pb-20">
      <Header title="Settings" />
      <div className="px-4 py-6 flex flex-col gap-6">

        {/* API Key */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Gemini API Key
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Free from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Google AI Studio
            </a>
            . Stored locally on your device only.
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2.5 pr-16 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Calorie Goal */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Daily Calorie Goal
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1000}
              max={5000}
              step={50}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-lg font-bold text-primary w-16 text-right">{goal}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">kcal per day</p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-2xl font-semibold text-sm bg-primary text-white active:bg-primary-dark transition-colors"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>

        {/* Data */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Data</h3>
          <button
            onClick={handleClear}
            className="w-full py-2.5 rounded-xl font-semibold text-sm border border-red-300 text-red-500 active:bg-red-50 transition-colors"
          >
            Clear All History
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          <p>BiteSight v1.0</p>
          <p className="mt-1">Powered by Gemini AI</p>
        </div>
      </div>
    </div>
  )
}
