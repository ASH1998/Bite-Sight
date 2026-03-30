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
  | { step: 'preview'; imageData: string }
  | { step: 'analyzing'; imageData: string }
  | { step: 'result'; imageData: string; name: string; nutrition: NutritionInfo }
  | { step: 'error'; message: string }

export default function CameraPage({ onMealSaved, onNavigateSettings }: Props) {
  const [state, setState] = useState<State>({ step: 'camera' })
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [ingredientHints, setIngredientHints] = useState('')

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

  const handleCapture = (imageData: string) => {
    setIngredientHints('')
    setState({ step: 'preview', imageData })
  }

  const handleAnalyze = async (imageData: string, hints: string) => {
    setState({ step: 'analyzing', imageData })
    try {
      const result = await analyzeFood(apiKey!, imageData, hints || undefined)
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

  const reset = () => {
    setIngredientHints('')
    setState({ step: 'camera' })
  }

  const handleRefine = () => {
    if (state.step !== 'result') return
    setState({ step: 'preview', imageData: state.imageData })
  }

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

  if (state.step === 'preview') {
    return (
      <div className="h-full flex flex-col">
        <Header title="Add Details" />
        <div className="flex-1 flex flex-col items-center gap-4 px-6 py-6 overflow-y-auto no-scrollbar">
          <img
            src={state.imageData}
            alt="Captured food"
            className="w-48 h-48 object-cover rounded-2xl shadow-lg flex-shrink-0"
          />
          <div className="w-full">
            <label htmlFor="ingredient-hints" className="block text-sm font-medium text-gray-700 mb-1">
              Know the ingredients? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="ingredient-hints"
              value={ingredientHints}
              onChange={(e) => setIngredientHints(e.target.value)}
              placeholder="e.g. cooked in ghee, has coconut milk, extra cheese, 2 tbsp mayo..."
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Adding ingredients, cooking method, or portion details improves accuracy.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-auto pb-20">
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm border border-gray-300 text-gray-700 active:bg-gray-100 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={() => handleAnalyze(state.imageData, ingredientHints)}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-primary text-white active:bg-primary-dark transition-colors"
            >
              Analyze
            </button>
          </div>
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
      onRefine={handleRefine}
    />
  )
}
