import { useState, useEffect, useMemo } from 'react'
import type { Meal } from '../types'
import { getAllMeals, deleteMeal, getSettings } from '../services/database'
import { formatDate } from '../utils/helpers'
import Header from '../components/Header'
import MealCard from '../components/MealCard'

interface DayData {
  date: string
  meals: Meal[]
  calories: number
  protein: number
  carbs: number
  fat: number
}

export default function HistoryPage() {
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [goal, setGoal] = useState(2000)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    const [meals, settings] = await Promise.all([getAllMeals(), getSettings()])
    setAllMeals(meals)
    setGoal(settings.dailyCalorieGoal)
  }

  useEffect(() => { load() }, [])

  // Group meals by date
  const days: DayData[] = useMemo(() => {
    const map = new Map<string, Meal[]>()
    for (const m of allMeals) {
      const arr = map.get(m.date) ?? []
      arr.push(m)
      map.set(m.date, arr)
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, meals]) => ({
        date,
        meals: meals.sort((a, b) => b.timestamp - a.timestamp),
        calories: meals.reduce((s, m) => s + m.nutrition.calories, 0),
        protein: meals.reduce((s, m) => s + m.nutrition.protein, 0),
        carbs: meals.reduce((s, m) => s + m.nutrition.carbs, 0),
        fat: meals.reduce((s, m) => s + m.nutrition.fat, 0),
      }))
  }, [allMeals])

  // Last 7 days for the bar chart (most recent on right)
  const chartDays = useMemo(() => {
    const last7: DayData[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const existing = days.find((dd) => dd.date === dateStr)
      last7.push(existing ?? { date: dateStr, meals: [], calories: 0, protein: 0, carbs: 0, fat: 0 })
    }
    return last7
  }, [days])

  const chartMax = Math.max(goal, ...chartDays.map((d) => d.calories), 1)

  // Weekly averages
  const weekAvg = useMemo(() => {
    const daysWithData = chartDays.filter((d) => d.calories > 0)
    if (daysWithData.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const n = daysWithData.length
    return {
      calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / n),
      protein: Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / n),
      carbs: Math.round(daysWithData.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(daysWithData.reduce((s, d) => s + d.fat, 0) / n),
    }
  }, [chartDays])

  const handleDelete = async (id: string) => {
    await deleteMeal(id)
    load()
  }

  const dayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="pb-20">
      <Header title="History" />

      {days.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">No history yet</p>
          <p className="text-xs mt-1">Start logging meals to see trends</p>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* Weekly Bar Chart */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Last 7 Days</h3>
            <div className="flex items-end justify-between gap-1.5 h-32 mb-2 relative">
              {/* Goal line */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-gray-300"
                style={{ bottom: `${(goal / chartMax) * 100}%` }}
              >
                <span className="absolute -top-4 right-0 text-[10px] text-gray-400">{goal}</span>
              </div>
              {chartDays.map((day) => {
                const pct = (day.calories / chartMax) * 100
                const overGoal = day.calories > goal
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {day.calories > 0 && (
                      <span className="text-[10px] font-medium text-gray-500">{day.calories}</span>
                    )}
                    <div
                      className={`w-full max-w-8 rounded-lg transition-all duration-500 ${
                        overGoal
                          ? 'bg-gradient-to-t from-red-400 to-red-300'
                          : day.calories > 0
                            ? 'bg-gradient-to-t from-green-500 to-green-400'
                            : 'bg-gray-100'
                      }`}
                      style={{ height: `${Math.max(pct, day.calories > 0 ? 8 : 3)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between gap-1.5">
              {chartDays.map((day) => (
                <span key={day.date} className="flex-1 text-center text-[10px] text-gray-400">
                  {dayLabel(day.date)}
                </span>
              ))}
            </div>
          </div>

          {/* Weekly Averages */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Weekly Average</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <StatBubble label="Calories" value={`${weekAvg.calories}`} unit="kcal" color="text-primary" />
              <StatBubble label="Protein" value={`${weekAvg.protein}`} unit="g" color="text-blue-500" />
              <StatBubble label="Carbs" value={`${weekAvg.carbs}`} unit="g" color="text-orange-500" />
              <StatBubble label="Fat" value={`${weekAvg.fat}`} unit="g" color="text-yellow-500" />
            </div>
          </div>

          {/* Macro split donut for the week */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Macro Split (Avg)</h3>
            <MacroDonut protein={weekAvg.protein} carbs={weekAvg.carbs} fat={weekAvg.fat} />
          </div>

          {/* Day-by-day list */}
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Daily Log</h3>
          <div className="flex flex-col gap-3">
            {days.map((day) => {
              const pct = Math.min(day.calories / goal, 1)
              const overGoal = day.calories > goal
              const isOpen = expanded === day.date
              return (
                <div key={day.date} className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Day summary - always visible */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : day.date)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{formatDate(day.date)}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${overGoal ? 'text-red-500' : 'text-primary'}`}>
                          {day.calories}
                        </span>
                        <span className="text-xs text-gray-400">/ {goal} kcal</span>
                        <svg
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${overGoal ? 'bg-red-400' : 'bg-primary'}`}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                    {/* Mini macro row */}
                    <div className="flex gap-4 mt-2 text-[11px] text-gray-400">
                      <span>{day.meals.length} meal{day.meals.length !== 1 ? 's' : ''}</span>
                      <span>P {day.protein}g</span>
                      <span>C {day.carbs}g</span>
                      <span>F {day.fat}g</span>
                    </div>
                  </button>

                  {/* Expanded meal list */}
                  {isOpen && (
                    <div className="px-4 pb-3 flex flex-col gap-2 border-t border-gray-50">
                      {day.meals.map((meal) => (
                        <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBubble({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <p className={`text-lg font-bold ${color}`}>{value}<span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span></p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat
  if (total === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
  }

  const pPct = Math.round((protein / total) * 100)
  const cPct = Math.round((carbs / total) * 100)
  const fPct = 100 - pPct - cPct

  // SVG donut segments
  const r = 40
  const circumference = 2 * Math.PI * r
  const pLen = (pPct / 100) * circumference
  const cLen = (cPct / 100) * circumference
  const fLen = (fPct / 100) * circumference

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Protein - blue */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#3b82f6" strokeWidth="10"
            strokeDasharray={`${pLen} ${circumference - pLen}`} strokeDashoffset="0" />
          {/* Carbs - orange */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f97316" strokeWidth="10"
            strokeDasharray={`${cLen} ${circumference - cLen}`} strokeDashoffset={`${-pLen}`} />
          {/* Fat - yellow */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#eab308" strokeWidth="10"
            strokeDasharray={`${fLen} ${circumference - fLen}`} strokeDashoffset={`${-(pLen + cLen)}`} />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <LegendRow color="bg-blue-500" label="Protein" pct={pPct} />
        <LegendRow color="bg-orange-500" label="Carbs" pct={cPct} />
        <LegendRow color="bg-yellow-500" label="Fat" pct={fPct} />
      </div>
    </div>
  )
}

function LegendRow({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs font-semibold text-gray-900">{pct}%</span>
    </div>
  )
}
