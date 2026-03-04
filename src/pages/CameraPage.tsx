import { useState, useEffect } from 'react'
import Camera from '../components/Camera'
import FoodResult from '../components/FoodResult'
import Header from '../components/Header'
import { analyzeFood } from '../services/gemini'
import { addMeal, getSettings } from '../services/database'
import { todayDateString, generateId } from '../utils/helpers'
import type { NutritionInfo } from '../types'

interface Props {
  onMealSaved: () => void
  onNavigateSettings: () => void
}

type State =
  | { step: 'camera' }
  | { step: 'analyzing'; imageData: string; description?: string }
  | { step: 'result'; imageData: string; name: string; nutrition: NutritionInfo }
  | { step: 'error'; message: string }

export default function CameraPage({ onMealSaved, onNavigateSettings }: Props) {
  const [state, setState] = useState<State>({ step: 'camera' })
  const [apiKey, setApiKey] = useState<string | null>(null)

  useEffect(() => {
    getSettings().then((s) => setApiKey(s.geminiApiKey || ''))
  }, [])

  // No API key - show setup prompt
  if (apiKey !== null && !apiKey) {
    return (
      <div className="h-full flex flex-col">
        <Header title="Snap Food" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">🔑</div>
          <h2 className="text-lg font-semibold text-gray-900">API Key Required</h2>
          <p className="text-sm text-gray-500">
            To analyze food photos, you need a free Gemini API key from Google AI Studio.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 underline"
          >
            Get a free API key
          </a>
          <button
            onClick={onNavigateSettings}
            className="mt-2 px-6 py-2.5 bg-primary text-white rounded-full font-semibold text-sm active:bg-primary-dark transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  const handleCapture = async (imageData: string, description?: string) => {
    setState({ step: 'analyzing', imageData, description })
    try {
      const result = await analyzeFood(apiKey!, imageData, description)
      setState({ step: 'result', imageData, ...result })
    } catch (err) {
      console.error('[CameraPage] Analysis error:', err)
      setState({ step: 'error', message: err instanceof Error ? err.message : 'Analysis failed' })
    }
  }

  const handleSave = async () => {
    if (state.step !== 'result') return
    await addMeal({
      id: generateId(),
      name: state.name,
      nutrition: state.nutrition,
      imageData: state.imageData,
      timestamp: Date.now(),
      date: todayDateString(),
    })
    onMealSaved()
    setState({ step: 'camera' })
  }

  const reset = () => setState({ step: 'camera' })

  if (state.step === 'camera') {
    return (
      <div className="h-full flex flex-col">
        <Header title="Snap Food" />
        <div className="flex-1 min-h-0">
          <Camera onCapture={handleCapture} />
        </div>
      </div>
    )
  }

  if (state.step === 'analyzing') {
    return (
      <div className="h-full flex flex-col">
        <Header title="Analyzing..." />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <img src={state.imageData} alt="Captured food" className="w-48 h-48 object-cover rounded-2xl shadow-lg" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 text-sm">Identifying food...</span>
          </div>
        </div>
      </div>
    )
  }

  if (state.step === 'error') {
    return (
      <div className="h-full flex flex-col">
        <Header title="Error" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-red-500 text-sm">{state.message}</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-primary text-white rounded-full font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <FoodResult
      name={state.name}
      nutrition={state.nutrition}
      imageData={state.imageData}
      onSave={handleSave}
      onRetake={reset}
    />
  )
}
