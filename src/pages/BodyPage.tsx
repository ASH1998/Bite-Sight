import { useState, useEffect, useMemo, useRef } from 'react'
import type { WeightEntry } from '../types'
import {
  getAllWeightEntries,
  addWeightEntry,
  deleteWeightEntry,
  getSettings,
  getAllMeals,
} from '../services/database'
import { generateId, todayDateString, formatDate } from '../utils/helpers' // todayDateString used for today's weight entry
import Header from '../components/Header'

interface Props {
  onNavigateSettings: () => void
}

type RangeKey = '1W' | '1M' | '3M' | 'ALL'

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: 'ALL', label: 'All', days: Infinity },
]

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' }
  if (bmi < 25) return { label: 'Normal', color: 'text-green-600' }
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-500' }
  return { label: 'Obese', color: 'text-red-500' }
}

function bmiBarPercent(bmi: number): number {
  // Map 15–40 BMI range to 0–100%
  return Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100))
}

function toDisplay(kg: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? Math.round(kg * 2.20462 * 10) / 10 : Math.round(kg * 10) / 10
}

function fromDisplay(val: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? Math.round((val / 2.20462) * 100) / 100 : val
}

export default function BodyPage({ onNavigateSettings }: Props) {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [targetWeightKg, setTargetWeightKg] = useState<number | null>(null)
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [avgCalories7d, setAvgCalories7d] = useState<number | null>(null)
  const [range, setRange] = useState<RangeKey>('1M')
  const [logging, setLogging] = useState(false)
  const [chartWidth, setChartWidth] = useState(300)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setChartWidth(Math.floor(entry.contentRect.width)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const load = async () => {
    const [allEntries, settings, meals] = await Promise.all([
      getAllWeightEntries(),
      getSettings(),
      getAllMeals(),
    ])
    setEntries(allEntries)
    setUnit(settings.weightUnit ?? 'kg')
    setHeightCm(settings.height ?? null)
    setTargetWeightKg(settings.targetWeight ?? null)
    setCalorieGoal(settings.dailyCalorieGoal)

    // Avg calories over last 7 days
    const today = new Date()
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    const recentMeals = meals.filter((m) => m.date >= cutoffStr)
    if (recentMeals.length > 0) {
      const byDay = new Map<string, number>()
      for (const m of recentMeals) {
        byDay.set(m.date, (byDay.get(m.date) ?? 0) + m.nutrition.calories)
      }
      const days = [...byDay.values()]
      setAvgCalories7d(Math.round(days.reduce((a, b) => a + b, 0) / days.length))
    } else {
      setAvgCalories7d(null)
    }
  }

  useEffect(() => { load() }, [])

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const latestWeightKg = latestEntry?.weight ?? null

  const currentBmi = useMemo(() => {
    if (!latestWeightKg || !heightCm) return null
    const hm = heightCm / 100
    return Math.round((latestWeightKg / (hm * hm)) * 10) / 10
  }, [latestWeightKg, heightCm])

  const targetBmi = useMemo(() => {
    if (!targetWeightKg || !heightCm) return null
    const hm = heightCm / 100
    return Math.round((targetWeightKg / (hm * hm)) * 10) / 10
  }, [targetWeightKg, heightCm])

  // Filter entries for chart range
  const filteredEntries = useMemo(() => {
    const rangeDays = RANGES.find((r) => r.key === range)!.days
    if (rangeDays === Infinity) return entries
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - rangeDays)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return entries.filter((e) => e.date >= cutoffStr)
  }, [entries, range])

  // SVG chart data — recalculates when container width changes
  const chartData = useMemo(() => {
    if (filteredEntries.length === 0) return null
    const weights = filteredEntries.map((e) => toDisplay(e.weight, unit))
    const minW = Math.min(...weights, targetWeightKg ? toDisplay(targetWeightKg, unit) : Infinity)
    const maxW = Math.max(...weights, targetWeightKg ? toDisplay(targetWeightKg, unit) : -Infinity)
    const pad = Math.max(1, (maxW - minW) * 0.15)
    const yMin = minW - pad
    const yMax = maxW + pad
    const W = chartWidth
    const H = 120
    const PL = 36
    const PR = 8
    const PT = 10
    const PB = 20

    const toX = (i: number) =>
      filteredEntries.length === 1
        ? PL + (W - PL - PR) / 2
        : PL + (i / (filteredEntries.length - 1)) * (W - PL - PR)
    const toY = (w: number) => PT + ((yMax - w) / (yMax - yMin)) * (H - PT - PB)

    const points = weights.map((w, i) => `${toX(i)},${toY(w)}`).join(' ')
    const goalY = targetWeightKg ? toY(toDisplay(targetWeightKg, unit)) : null

    const yLabels = [yMin, (yMin + yMax) / 2, yMax].map((v) => ({
      value: Math.round(v * 10) / 10,
      y: toY(v),
    }))

    const xLabels = filteredEntries.length >= 2
      ? [
          { label: filteredEntries[0].date.slice(5), x: toX(0) },
          { label: filteredEntries[filteredEntries.length - 1].date.slice(5), x: toX(filteredEntries.length - 1) },
        ]
      : [{ label: filteredEntries[0].date.slice(5), x: toX(0) }]

    return { points, weights, goalY, yLabels, xLabels, toX, toY, H, W, PB, PL, PR }
  }, [filteredEntries, unit, targetWeightKg, chartWidth])

  const handleLogWeight = async () => {
    const val = parseFloat(weightInput)
    if (isNaN(val) || val <= 0) return
    setLogging(true)
    const kg = fromDisplay(val, unit)
    const today = todayDateString()
    // Replace if there's already an entry for today
    const existing = entries.find((e) => e.date === today)
    if (existing) {
      await deleteWeightEntry(existing.id)
    }
    await addWeightEntry({ id: generateId(), weight: kg, date: today, timestamp: Date.now() })
    setWeightInput('')
    await load()
    setLogging(false)
  }

  // Recommendations
  const recommendations = useMemo(() => {
    const tips: string[] = []
    if (!latestWeightKg || !heightCm) return tips

    const bmi = currentBmi!
    const cat = bmiCategory(bmi)

    if (targetWeightKg && latestWeightKg !== targetWeightKg) {
      const diff = latestWeightKg - targetWeightKg
      const displayDiff = Math.abs(toDisplay(Math.abs(diff), unit))
      const direction = diff > 0 ? 'lose' : 'gain'

      tips.push(
        `You need to ${direction} ${displayDiff} ${unit} to reach your goal weight.`
      )

      // Calorie-based estimate
      if (avgCalories7d !== null) {
        const KCAL_PER_KG = 7700
        const deficitOrSurplus = diff > 0
          ? calorieGoal - avgCalories7d // deficit if eating less than goal
          : avgCalories7d - calorieGoal // surplus if eating more
        const dailyDelta = Math.abs(avgCalories7d - calorieGoal)

        if (dailyDelta > 50) {
          const weeksToGoal = Math.round((Math.abs(diff) * KCAL_PER_KG) / (dailyDelta * 7) * 10) / 10
          const dirLabel = deficitOrSurplus > 0 && diff > 0 ? 'deficit' : 'surplus'
          tips.push(
            `At your current ${Math.abs(avgCalories7d - calorieGoal)} kcal/day ${dirLabel}, you'll reach your goal in ~${weeksToGoal} weeks.`
          )
        } else {
          tips.push(
            `Your calorie intake is very close to your goal (${avgCalories7d} kcal avg). Try a ${diff > 0 ? '300–500 kcal deficit' : '200–400 kcal surplus'} to make progress.`
          )
        }
      }
    }

    // BMI-based tips
    if (cat.label === 'Underweight') {
      tips.push('Your BMI suggests you are underweight. Consider increasing calorie-dense foods like nuts, avocado, and whole grains.')
    } else if (cat.label === 'Normal') {
      tips.push('Your BMI is in the healthy range. Focus on maintaining your current balance of nutrition and activity.')
    } else if (cat.label === 'Overweight') {
      tips.push('A moderate calorie deficit of 300–500 kcal/day combined with regular movement can help bring your BMI into the normal range.')
    } else {
      tips.push('Consider consulting a healthcare professional for a personalised plan. A gradual deficit of 500 kcal/day is a safe starting point.')
    }

    // Calorie intake tip
    if (avgCalories7d !== null) {
      if (avgCalories7d > calorieGoal + 200) {
        tips.push(`You've averaged ${avgCalories7d} kcal/day over the past week — ${avgCalories7d - calorieGoal} kcal above your goal. Consider swapping one high-calorie snack per day.`)
      } else if (avgCalories7d < calorieGoal - 500) {
        tips.push(`You've averaged only ${avgCalories7d} kcal/day — significantly below your goal. Make sure you're eating enough to fuel your body.`)
      }
    }

    // Weight trend tip
    if (entries.length >= 3) {
      const recent = entries.slice(-5)
      const firstW = recent[0].weight
      const lastW = recent[recent.length - 1].weight
      const delta = lastW - firstW
      if (Math.abs(delta) > 0.3) {
        const trend = delta > 0 ? 'gaining' : 'losing'
        const displayDelta = Math.abs(toDisplay(Math.abs(delta), unit))
        tips.push(`Recent trend: you're ${trend} ~${displayDelta} ${unit} over your last ${recent.length} weigh-ins.`)
      } else {
        tips.push('Your weight has been stable recently.')
      }
    }

    return tips
  }, [latestWeightKg, heightCm, currentBmi, targetWeightKg, avgCalories7d, calorieGoal, entries, unit])

  return (
    <div className="pb-24">
      <Header title="Body & BMI" />
      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Log Weight Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Log Today's Weight</h2>
            {/* Unit toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setUnit('kg')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${unit === 'kg' ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}
              >
                kg
              </button>
              <button
                onClick={() => setUnit('lb')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${unit === 'lb' ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}
              >
                lb
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={unit === 'kg' ? '70.0' : '154.0'}
              step="0.1"
              min="20"
              max="500"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleLogWeight()}
            />
            <button
              onClick={handleLogWeight}
              disabled={logging || !weightInput}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 active:bg-primary-dark transition-colors"
            >
              {logging ? '...' : 'Log'}
            </button>
          </div>
          {latestEntry && (
            <p className="text-xs text-gray-400 mt-2">
              Last: {toDisplay(latestEntry.weight, unit)} {unit} on {formatDate(latestEntry.date)}
            </p>
          )}
        </div>

        {/* BMI Card */}
        {!heightCm ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-xl">📏</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Set your height to see BMI</p>
              <button
                onClick={onNavigateSettings}
                className="text-xs text-amber-600 underline mt-0.5"
              >
                Go to Settings →
              </button>
            </div>
          </div>
        ) : currentBmi ? (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">BMI</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 ${bmiCategory(currentBmi).color}`}>
                {bmiCategory(currentBmi).label}
              </span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-gray-900">{currentBmi}</span>
              <span className="text-sm text-gray-400 mb-1">kg/m²</span>
            </div>

            {/* BMI bar — HTML/CSS so text stays fixed size at any screen width */}
            <div className="mt-3 mb-1">
              {/* Bar with overlaid markers */}
              <div className="relative">
                <div
                  className="h-4 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, #93c5fd 0% 14%, #4ade80 14% 40%, #fbbf24 40% 60%, #f87171 60% 100%)',
                  }}
                />
                {/* Zone dividers */}
                {[14, 40, 60].map((pct) => (
                  <div
                    key={pct}
                    className="absolute top-0 bottom-0 w-px bg-white/70 pointer-events-none"
                    style={{ left: `${pct}%` }}
                  />
                ))}
                {/* Target BMI — green line through bar */}
                {targetBmi && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-green-700 pointer-events-none"
                    style={{ left: `${bmiBarPercent(targetBmi)}%` }}
                  />
                )}
              </div>

              {/* Triangle pointer + goal label row */}
              <div className="relative h-5 mt-0.5">
                {/* Current BMI — upward triangle */}
                <div
                  className="absolute -translate-x-1/2 w-0 h-0 pointer-events-none"
                  style={{
                    left: `${bmiBarPercent(currentBmi)}%`,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '7px solid #1f2937',
                  }}
                />
                {/* Target BMI label */}
                {targetBmi && (
                  <span
                    className="absolute -translate-x-1/2 text-[10px] font-medium text-green-700 whitespace-nowrap leading-none"
                    style={{ left: `${bmiBarPercent(targetBmi)}%`, top: 2 }}
                  >
                    goal {targetBmi}
                  </span>
                )}
              </div>

              {/* Zone name labels */}
              <div className="relative h-4">
                {[
                  { label: 'Underweight', center: 7 },
                  { label: 'Normal', center: 27 },
                  { label: 'Overweight', center: 50 },
                  { label: 'Obese', center: 80 },
                ].map(({ label, center }) => (
                  <span
                    key={label}
                    className="absolute -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap"
                    style={{ left: `${center}%` }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Boundary value labels */}
              <div className="relative h-3 mt-0.5">
                <span className="absolute left-0 text-[10px] text-gray-400">15</span>
                <span className="absolute -translate-x-1/2 text-[10px] text-gray-400" style={{ left: '14%' }}>18.5</span>
                <span className="absolute -translate-x-1/2 text-[10px] text-gray-400" style={{ left: '40%' }}>25</span>
                <span className="absolute -translate-x-1/2 text-[10px] text-gray-400" style={{ left: '60%' }}>30</span>
                <span className="absolute right-0 text-[10px] text-gray-400">40</span>
              </div>
            </div>
            {targetBmi && (
              <p className="text-xs text-gray-500 mt-2">
                Target BMI: <span className="font-semibold text-green-600">{targetBmi}</span>
                {currentBmi > targetBmi
                  ? ` · ${(currentBmi - targetBmi).toFixed(1)} above goal`
                  : currentBmi < targetBmi
                  ? ` · ${(targetBmi - currentBmi).toFixed(1)} below goal`
                  : ' · At goal!'}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4 text-center text-sm text-gray-400 py-6">
            <p className="text-2xl mb-1">⚖️</p>
            <p>Log your weight to see BMI</p>
          </div>
        )}

        {/* Weight goal progress */}
        {latestWeightKg && targetWeightKg && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Weight Goal</h2>
            <div className="flex items-center justify-between mb-2">
              <div className="text-center">
                <p className="text-xs text-gray-400">Current</p>
                <p className="text-lg font-bold text-gray-900">
                  {toDisplay(latestWeightKg, unit)} <span className="text-sm font-normal text-gray-500">{unit}</span>
                </p>
              </div>
              <div className="flex-1 mx-3">
                {(() => {
                  const diff = latestWeightKg - targetWeightKg
                  const start = entries.length > 0 ? entries[0].weight : latestWeightKg
                  const totalChange = Math.abs(start - targetWeightKg)
                  const progress = totalChange > 0
                    ? Math.min(100, Math.max(0, (1 - Math.abs(diff) / totalChange) * 100))
                    : 100
                  return (
                    <>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-green-500 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-center text-[10px] text-gray-400 mt-1">{Math.round(progress)}% there</p>
                    </>
                  )
                })()}
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Goal</p>
                <p className="text-lg font-bold text-green-600">
                  {toDisplay(targetWeightKg, unit)} <span className="text-sm font-normal text-gray-500">{unit}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-center text-gray-400">
              {latestWeightKg > targetWeightKg
                ? `${toDisplay(latestWeightKg - targetWeightKg, unit)} ${unit} to lose`
                : latestWeightKg < targetWeightKg
                ? `${toDisplay(targetWeightKg - latestWeightKg, unit)} ${unit} to gain`
                : '🎉 Goal reached!'}
            </p>
          </div>
        )}

        {/* Weight Chart */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Weight History</h2>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                    range === r.key ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={chartContainerRef}>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-1">📈</p>
              <p className="text-xs">No entries in this range</p>
            </div>
          ) : (
            <svg width={chartWidth} height={120} style={{ display: 'block' }}>
              {chartData && (
                <>
                  {/* Y axis labels */}
                  {chartData.yLabels.map((l, i) => (
                    <text key={i} x={2} y={l.y + 3} fontSize={10} fill="#9ca3af" textAnchor="start">
                      {l.value}
                    </text>
                  ))}

                  {/* Goal line */}
                  {chartData.goalY !== null && (
                    <line
                      x1={chartData.PL}
                      y1={chartData.goalY}
                      x2={chartData.W - chartData.PR}
                      y2={chartData.goalY}
                      stroke="#16a34a"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      opacity={0.6}
                    />
                  )}

                  {/* Weight line */}
                  {filteredEntries.length > 1 && (
                    <polyline
                      points={chartData.points}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Dots */}
                  {chartData.weights.map((w, i) => (
                    <circle
                      key={i}
                      cx={chartData.toX(i)}
                      cy={chartData.toY(w)}
                      r={3}
                      fill="#22c55e"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  ))}

                  {/* X axis labels */}
                  {chartData.xLabels.map((l, i) => (
                    <text
                      key={i}
                      x={l.x}
                      y={chartData.H - 4}
                      fontSize={7}
                      fill="#9ca3af"
                      textAnchor={i === 0 ? 'start' : 'end'}
                    >
                      {l.label}
                    </text>
                  ))}
                </>
              )}
            </svg>
          )}
          </div>

          {targetWeightKg && filteredEntries.length > 0 && (
            <p className="text-[10px] text-gray-400 text-right mt-1">
              <span className="inline-block w-4 border-t border-dashed border-green-600 mr-1 align-middle" />
              goal {toDisplay(targetWeightKg, unit)} {unit}
            </p>
          )}
        </div>

        {/* Recent entries list */}
        {filteredEntries.length > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Entries</h2>
            <div className="flex flex-col gap-2">
              {[...filteredEntries].reverse().slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {toDisplay(e.weight, unit)} {unit}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(e.date)}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await deleteWeightEntry(e.id)
                      load()
                    }}
                    className="text-xs text-red-400 px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-green-900 mb-3">💡 Recommendations</h2>
            <ul className="flex flex-col gap-2">
              {recommendations.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-green-800">
                  <span className="text-green-500 mt-0.5 shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Calorie context */}
        {avgCalories7d !== null && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Calorie Context</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>7-day avg</span>
                  <span className={avgCalories7d > calorieGoal ? 'text-red-500' : 'text-green-600'}>
                    {avgCalories7d} kcal
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${avgCalories7d > calorieGoal ? 'bg-red-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (avgCalories7d / calorieGoal) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0</span>
                  <span>Goal: {calorieGoal}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
