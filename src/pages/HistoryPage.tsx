import { useState, useEffect } from 'react'
import type { Meal } from '../types'
import { getAllDates, getMealsByDate, deleteMeal, getSettings } from '../services/database'
import { formatDate } from '../utils/helpers'
import Header from '../components/Header'
import MealCard from '../components/MealCard'

export default function HistoryPage() {
  const [dates, setDates] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [goal, setGoal] = useState(2000)

  useEffect(() => {
    getAllDates().then(setDates)
    getSettings().then((s) => setGoal(s.dailyCalorieGoal))
  }, [])

  const toggleDay = async (date: string) => {
    if (expanded === date) {
      setExpanded(null)
      return
    }
    const m = await getMealsByDate(date)
    setMeals(m)
    setExpanded(date)
  }

  const handleDelete = async (id: string) => {
    await deleteMeal(id)
    if (expanded) {
      const m = await getMealsByDate(expanded)
      setMeals(m)
      if (m.length === 0) {
        setExpanded(null)
        getAllDates().then(setDates)
      }
    }
  }

  return (
    <div className="pb-20">
      <Header title="History" />
      <div className="px-4 py-4">
        {dates.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📊</p>
            <p className="text-sm">No history yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dates.map((date) => {
              const isOpen = expanded === date
              return (
                <div key={date} className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => toggleDay(date)}
                    className="w-full px-4 py-3 flex justify-between items-center text-left"
                  >
                    <span className="font-medium text-gray-900 text-sm">{formatDate(date)}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 flex flex-col gap-2">
                      <div className="text-xs text-gray-500 mb-1">
                        Total: {meals.reduce((s, m) => s + m.nutrition.calories, 0)} / {goal} kcal
                      </div>
                      {meals.map((meal) => (
                        <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
