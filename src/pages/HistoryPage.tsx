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

interface BarData {
  label: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

type RangeKey = '1W' | '2W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '2W', label: '2W', days: 14 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'All', days: Infinity },
]

export default function HistoryPage() {
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [goal, setGoal] = useState(2000)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>('1W')

  const load = async () => {
    const [meals, settings] = await Promise.all([getAllMeals(), getSettings()])
    setAllMeals(meals)
    setGoal(settings.dailyCalorieGoal)
  }

  useEffect(() => { load() }, [])

  const rangeDays = RANGES.find((r) => r.key === range)!.days

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

  // Get date range boundaries
  const { startDate, dayCount } = useMemo(() => {
    const today = new Date()
    if (range === 'ALL' && days.length > 0) {
      const earliest = days[days.length - 1].date
      const start = new Date(earliest + 'T12:00:00')
      const diff = Math.ceil((today.getTime() - start.getTime()) / 86400000) + 1
      return { startDate: start, dayCount: diff }
    }
    const start = new Date(today)
    start.setDate(start.getDate() - (rangeDays - 1))
    return { startDate: start, dayCount: rangeDays }
  }, [range, rangeDays, days])

  // Build all daily data for the range
  const rangeDayData = useMemo(() => {
    const result: DayData[] = []
    const today = new Date()
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      if (d > today) break
      const dateStr = d.toISOString().split('T')[0]
      const existing = days.find((dd) => dd.date === dateStr)
      result.push(existing ?? { date: dateStr, meals: [], calories: 0, protein: 0, carbs: 0, fat: 0 })
    }
    return result
  }, [startDate, dayCount, days])

  // Aggregate into bars based on range
  const chartBars: BarData[] = useMemo(() => {
    if (rangeDayData.length === 0) return []

    // Daily bars for short ranges — skip untracked days
    if (rangeDays <= 31) {
      return rangeDayData
        .filter((d) => d.calories > 0)
        .map((d) => ({
          label: barLabel(d.date, range),
          calories: d.calories,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
        }))
    }

    // Weekly aggregation for 3M/6M — only average from tracked days
    if (rangeDays <= 180) {
      return aggregateByWeek(rangeDayData)
    }

    // Monthly aggregation for 1Y/ALL — only average from tracked days
    return aggregateByMonth(rangeDayData)
  }, [rangeDayData, rangeDays, range])

  const chartMax = Math.max(goal, ...chartBars.map((d) => d.calories), 1)

  // Period averages
  const periodAvg = useMemo(() => {
    const withData = rangeDayData.filter((d) => d.calories > 0)
    if (withData.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const n = withData.length
    return {
      calories: Math.round(withData.reduce((s, d) => s + d.calories, 0) / n),
      protein: Math.round(withData.reduce((s, d) => s + d.protein, 0) / n),
      carbs: Math.round(withData.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(withData.reduce((s, d) => s + d.fat, 0) / n),
    }
  }, [rangeDayData])

  // Filter daily log to range
  const filteredDays = useMemo(() => {
    const startStr = startDate.toISOString().split('T')[0]
    return days.filter((d) => d.date >= startStr)
  }, [days, startDate])

  const handleDelete = async (id: string) => {
    await deleteMeal(id)
    load()
  }

  return (
    <div className="pb-20">
      <Header title="History" />

      {/* Range selector */}
      <div className="px-4 pt-3 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              range === r.key
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">No history yet</p>
          <p className="text-xs mt-1">Start logging meals to see trends</p>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* Calorie Bar Chart */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Calories</h3>
            <div className="flex items-end justify-between gap-[2px] h-32 mb-2 relative">
              {/* Goal line */}
              {rangeDays <= 31 && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-gray-300 z-10"
                  style={{ bottom: `${(goal / chartMax) * 100}%` }}
                >
                  <span className="absolute -top-4 right-0 text-[10px] text-gray-400">{goal}</span>
                </div>
              )}
              {chartBars.map((bar, i) => {
                const pct = (bar.calories / chartMax) * 100
                const overGoal = bar.calories > goal
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end min-w-0">
                    {bar.calories > 0 && chartBars.length <= 14 && (
                      <span className="text-[8px] font-medium text-gray-500 truncate">{bar.calories}</span>
                    )}
                    <div
                      className={`w-full rounded-sm transition-all duration-500 ${
                        overGoal
                          ? 'bg-gradient-to-t from-red-400 to-red-300'
                          : bar.calories > 0
                            ? 'bg-gradient-to-t from-green-500 to-green-400'
                            : 'bg-gray-100'
                      }`}
                      style={{ height: `${Math.max(pct, bar.calories > 0 ? 8 : 3)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between gap-[2px]">
              {chartBars.map((bar, i) => (
                <span key={i} className="flex-1 text-center text-[8px] text-gray-400 truncate min-w-0">
                  {chartBars.length <= 31 ? bar.label : (i % Math.ceil(chartBars.length / 8) === 0 ? bar.label : '')}
                </span>
              ))}
            </div>
          </div>

          {/* Period Averages */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Average / Day</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <StatBubble label="Calories" value={`${periodAvg.calories}`} unit="kcal" color="text-green-500" />
              <StatBubble label="Protein" value={`${periodAvg.protein}`} unit="g" color="text-green-500" />
              <StatBubble label="Carbs" value={`${periodAvg.carbs}`} unit="g" color="text-green-600" />
              <StatBubble label="Fat" value={`${periodAvg.fat}`} unit="g" color="text-green-700" />
            </div>
          </div>

          {/* Macro split donut */}
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Macro Split (Avg)</h3>
            <MacroDonut protein={periodAvg.protein} carbs={periodAvg.carbs} fat={periodAvg.fat} />
          </div>

          {/* Individual macro bar tiles */}
          <div className="grid grid-cols-3 gap-2">
            <MacroTile label="Protein" bars={chartBars} dataKey="protein" color="#22c55e" avg={periodAvg.protein} />
            <MacroTile label="Carbs" bars={chartBars} dataKey="carbs" color="#16a34a" avg={periodAvg.carbs} />
            <MacroTile label="Fat" bars={chartBars} dataKey="fat" color="#15803d" avg={periodAvg.fat} />
          </div>

          {/* Day-by-day list */}
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Daily Log</h3>
          <div className="flex flex-col gap-3">
            {filteredDays.map((day) => {
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
            {filteredDays.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">No meals in this period</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Helper functions ---

function barLabel(dateStr: string, range: RangeKey): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (range === '1W') {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }
  if (range === '2W') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  // 1M
  return `${d.getDate()}`
}

function aggregateByWeek(days: DayData[]): BarData[] {
  const buckets = new Map<string, DayData[]>()
  for (const d of days) {
    const date = new Date(d.date + 'T12:00:00')
    // Week starts on Monday
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date)
    monday.setDate(diff)
    const key = monday.toISOString().split('T')[0]
    const arr = buckets.get(key) ?? []
    arr.push(d)
    buckets.set(key, arr)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, days]) => {
      const d = new Date(weekStart + 'T12:00:00')
      const tracked = days.filter((d) => d.calories > 0)
      const n = tracked.length || 1
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories: Math.round(tracked.reduce((s, d) => s + d.calories, 0) / n),
        protein: Math.round(tracked.reduce((s, d) => s + d.protein, 0) / n),
        carbs: Math.round(tracked.reduce((s, d) => s + d.carbs, 0) / n),
        fat: Math.round(tracked.reduce((s, d) => s + d.fat, 0) / n),
      }
    })
}

function aggregateByMonth(days: DayData[]): BarData[] {
  const buckets = new Map<string, DayData[]>()
  for (const d of days) {
    const key = d.date.slice(0, 7) // YYYY-MM
    const arr = buckets.get(key) ?? []
    arr.push(d)
    buckets.set(key, arr)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, days]) => {
      const [y, m] = monthKey.split('-')
      const d = new Date(Number(y), Number(m) - 1, 1)
      const tracked = days.filter((d) => d.calories > 0)
      const n = tracked.length || 1
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        calories: Math.round(tracked.reduce((s, d) => s + d.calories, 0) / n),
        protein: Math.round(tracked.reduce((s, d) => s + d.protein, 0) / n),
        carbs: Math.round(tracked.reduce((s, d) => s + d.carbs, 0) / n),
        fat: Math.round(tracked.reduce((s, d) => s + d.fat, 0) / n),
      }
    })
}

// --- Sub-components ---

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

  const r = 40
  const circumference = 2 * Math.PI * r
  const pLen = (pPct / 100) * circumference
  const cLen = (cPct / 100) * circumference
  const fLen = (fPct / 100) * circumference

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#22c55e" strokeWidth="10"
            strokeDasharray={`${pLen} ${circumference - pLen}`} strokeDashoffset="0" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#16a34a" strokeWidth="10"
            strokeDasharray={`${cLen} ${circumference - cLen}`} strokeDashoffset={`${-pLen}`} />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#15803d" strokeWidth="10"
            strokeDasharray={`${fLen} ${circumference - fLen}`} strokeDashoffset={`${-(pLen + cLen)}`} />
        </svg>
      </div>
      <div className="flex flex-col gap-2">
        <LegendRow color="bg-green-500" label="Protein" pct={pPct} />
        <LegendRow color="bg-green-600" label="Carbs" pct={cPct} />
        <LegendRow color="bg-green-700" label="Fat" pct={fPct} />
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

function MacroTile({ label, bars, dataKey, color, avg }: {
  label: string; bars: BarData[]; dataKey: 'protein' | 'carbs' | 'fat'
  color: string; avg: number
}) {
  const values = bars.map((b) => b[dataKey])
  const maxVal = Math.max(...values, 1)

  return (
    <div className="bg-card rounded-xl shadow-sm border border-gray-100 p-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold mt-0.5" style={{ color }}>
        {avg}<span className="text-[9px] font-normal text-gray-400">g</span>
      </p>
      <div className="flex items-end gap-[2px] mt-2 h-10">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: `${Math.max((v / maxVal) * 100, v > 0 ? 8 : 3)}%`,
              backgroundColor: v > 0 ? color : '#f3f4f6',
              opacity: v > 0 ? 0.35 + 0.65 * (v / maxVal) : 1,
            }}
          />
        ))}
      </div>
    </div>
  )
}
