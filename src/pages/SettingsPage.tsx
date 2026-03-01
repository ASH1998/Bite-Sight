import { useState, useEffect } from 'react'
import { getSettings, saveSettings, clearAllData } from '../services/database'
import Header from '../components/Header'

export default function SettingsPage() {
  const [goal, setGoal] = useState(2000)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then((s) => setGoal(s.dailyCalorieGoal))
  }, [])

  const handleSave = async () => {
    await saveSettings({ dailyCalorieGoal: goal })
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
          <button
            onClick={handleSave}
            className="mt-4 w-full py-2.5 rounded-xl font-semibold text-sm bg-primary text-white active:bg-primary-dark transition-colors"
          >
            {saved ? 'Saved!' : 'Save Goal'}
          </button>
        </div>

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
          <p>ShowCalorie v1.0</p>
          <p className="mt-1">Powered by Gemini AI</p>
        </div>
      </div>
    </div>
  )
}
