import { useState, useEffect, useMemo } from 'react'
import { getSettings, saveSettings, clearAllData, getAllWeightEntries, exportAllData, importData } from '../services/database'
import { todayDateString } from '../utils/helpers'
import Header from '../components/Header'

function toKg(val: number, unit: 'kg' | 'lb') {
  return unit === 'lb' ? Math.round((val / 2.20462) * 10) / 10 : val
}

export default function SettingsPage() {
  const [goal, setGoal] = useState(2000)
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [height, setHeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg')
  const [goalDate, setGoalDate] = useState('')
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getSettings(), getAllWeightEntries()]).then(([s, entries]) => {
      setGoal(s.dailyCalorieGoal)
      setApiKey(s.geminiApiKey || '')
      const unit = s.weightUnit ?? 'kg'
      setWeightUnit(unit)
      if (s.height) setHeight(String(s.height))
      if (s.targetWeight) {
        setTargetWeight(
          unit === 'lb'
            ? String(Math.round(s.targetWeight * 2.20462 * 10) / 10)
            : String(s.targetWeight)
        )
      }
      if (s.goalDate) setGoalDate(s.goalDate)
      if (entries.length > 0) setLatestWeightKg(entries[entries.length - 1].weight)
    })
  }, [])

  const handleSave = async () => {
    const heightCm = height ? Number(height) : undefined
    const targetKg = targetWeight ? toKg(Number(targetWeight), weightUnit) : undefined
    await saveSettings({
      dailyCalorieGoal: goal,
      geminiApiKey: apiKey.trim(),
      height: heightCm,
      targetWeight: targetKg,
      weightUnit,
      goalDate: goalDate || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClear = async () => {
    if (confirm('Delete all meal history? This cannot be undone.')) {
      await clearAllData()
      alert('All data cleared.')
    }
  }

  const handleExport = async () => {
    const json = await exportAllData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bitesight-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const result = await importData(text)
      setImportStatus(`Imported ${result.meals} meals, ${result.weightEntries} weight entries.`)
      // Reload settings in case they were imported
      const s = await getSettings()
      setGoal(s.dailyCalorieGoal)
      setApiKey(s.geminiApiKey || '')
      setWeightUnit(s.weightUnit ?? 'kg')
      if (s.height) setHeight(String(s.height))
      if (s.targetWeight) setTargetWeight(String(s.targetWeight))
      if (s.goalDate) setGoalDate(s.goalDate)
      setTimeout(() => setImportStatus(null), 4000)
    } catch {
      setImportStatus('Import failed — invalid file format.')
      setTimeout(() => setImportStatus(null), 4000)
    }
    e.target.value = ''
  }

  // Calorie plan — recomputes live as user edits target weight / goal date
  const caloriePlan = useMemo(() => {
    if (!latestWeightKg || !targetWeight) return null
    const targetKg = toKg(Number(targetWeight), weightUnit)
    if (isNaN(targetKg) || targetKg <= 0) return null
    const weightDiffKg = latestWeightKg - targetKg
    if (Math.abs(weightDiffKg) < 0.1) return null

    const tdee = Math.round(latestWeightKg * 33)
    const direction = weightDiffKg > 0 ? 'lose' : 'gain'
    const totalKcal = Math.abs(weightDiffKg) * 7700

    const safeDaily = Math.round(0.5 * 7700 / 7)
    const aggressiveDaily = Math.round(1.0 * 7700 / 7)
    const safeKcal = direction === 'lose' ? tdee - safeDaily : tdee + safeDaily
    const aggressiveKcal = direction === 'lose' ? tdee - aggressiveDaily : tdee + aggressiveDaily
    const safeWeeks = Math.ceil(totalKcal / (safeDaily * 7))
    const aggressiveWeeks = Math.ceil(totalKcal / (aggressiveDaily * 7))

    let goalPlan: { kcal: number; daysLeft: number; weeklyKg: number; tooAggressive: boolean } | null = null
    if (goalDate) {
      const today = new Date()
      const gd = new Date(goalDate + 'T12:00:00')
      const daysLeft = Math.round((gd.getTime() - today.getTime()) / 86400000)
      if (daysLeft > 0) {
        const dailyDelta = Math.round(totalKcal / daysLeft)
        const kcal = direction === 'lose' ? tdee - dailyDelta : tdee + dailyDelta
        const weeklyKg = Math.round((dailyDelta * 7 / 7700) * 100) / 100
        const tooAggressive = dailyDelta > 1100 || kcal < 1200
        goalPlan = { kcal, daysLeft, weeklyKg, tooAggressive }
      }
    }

    return { tdee, direction, safeKcal, aggressiveKcal, safeWeeks, aggressiveWeeks, goalPlan }
  }, [latestWeightKg, targetWeight, weightUnit, goalDate])

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

        {/* Body Metrics */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Body Metrics</h3>

          {/* Weight Unit toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Weight unit</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['kg', 'lb'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setWeightUnit(u)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${weightUnit === u ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Height */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 175"
              min={100}
              max={250}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Target weight */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Target weight ({weightUnit})</label>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
              min={30}
              max={300}
              step={0.1}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
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

        {/* Daily Calorie Plan */}
        {caloriePlan && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-1">Daily Calorie Plan</h3>
            <p className="text-xs text-gray-400 mb-4">Est. maintenance ~{caloriePlan.tdee} kcal/day · {caloriePlan.direction === 'lose' ? 'weight loss' : 'weight gain'} plan</p>

            {/* Goal date */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Target date to reach goal (optional)</label>
              <input
                type="date"
                value={goalDate}
                min={todayDateString()}
                onChange={(e) => setGoalDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Goal-date plan */}
            {caloriePlan.goalPlan && (
              <div className={`rounded-xl p-3 mb-4 ${caloriePlan.goalPlan.tooAggressive ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">
                    By {new Date(goalDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-gray-500">{caloriePlan.goalPlan.daysLeft} days left</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${caloriePlan.goalPlan.tooAggressive ? 'text-red-500' : 'text-green-700'}`}>
                    {caloriePlan.goalPlan.kcal.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">kcal/day</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  ~{caloriePlan.goalPlan.weeklyKg} kg/week · {caloriePlan.direction === 'lose' ? 'deficit' : 'surplus'} of {Math.abs(caloriePlan.goalPlan.kcal - caloriePlan.tdee).toLocaleString()} kcal/day
                </p>
                {caloriePlan.goalPlan.tooAggressive && (
                  <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Too aggressive — extend your deadline or adjust your goal.</p>
                )}
              </div>
            )}

            {/* Preset rates */}
            <p className="text-xs text-gray-500 font-medium mb-2">Preset paces:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 mb-0.5">Moderate (0.5 kg/wk)</p>
                <p className="text-lg font-bold text-gray-800">{caloriePlan.safeKcal.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">kcal/day · ~{caloriePlan.safeWeeks}w to goal</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] text-gray-400 mb-0.5">Fast (1 kg/wk)</p>
                <p className="text-lg font-bold text-gray-800">{caloriePlan.aggressiveKcal.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">kcal/day · ~{caloriePlan.aggressiveWeeks}w to goal</p>
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-2xl font-semibold text-sm bg-primary text-white active:bg-primary-dark transition-colors"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>

        {/* Data */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Data</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-xl font-semibold text-sm border border-green-300 text-green-600 active:bg-green-50 transition-colors"
            >
              Export All Data
            </button>
            <label className="w-full py-2.5 rounded-xl font-semibold text-sm border border-blue-300 text-blue-600 active:bg-blue-50 transition-colors text-center cursor-pointer">
              Import Data
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            {importStatus && (
              <p className="text-xs text-center text-gray-600 bg-gray-50 rounded-lg py-2">{importStatus}</p>
            )}
            <button
              onClick={handleClear}
              className="w-full py-2.5 rounded-xl font-semibold text-sm border border-red-300 text-red-500 active:bg-red-50 transition-colors"
            >
              Clear All History
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          <p>BiteSight v{__APP_VERSION__}</p>
          <p className="mt-1">Powered by Gemini AI</p>
        </div>
      </div>
    </div>
  )
}
