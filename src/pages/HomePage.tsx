import { useState, useEffect, useCallback } from 'react'
import type { Meal, UserSettings } from '../types'
import { getMealsByDate, deleteMeal, getSettings } from '../services/database'
import { todayDateString, formatDate } from '../utils/helpers'
import Header from '../components/Header'
import DailyProgress from '../components/DailyProgress'
import MealCard from '../components/MealCard'

interface Props {
  refreshKey: number
}

export default function HomePage({ refreshKey }: Props) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [settings, setSettings] = useState<UserSettings>({ dailyCalorieGoal: 2000 })
  const today = todayDateString()

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([getMealsByDate(today), getSettings()])
    setMeals(m)
    setSettings(s)
  }, [today])

  useEffect(() => { load() }, [load, refreshKey])

  const handleDelete = async (id: string) => {
    await deleteMeal(id)
    load()
  }

  const totalCalories = meals.reduce((sum, m) => sum + m.nutrition.calories, 0)

  return (
    <div className="pb-20">
      <Header title="ShowCalorie" />
      <div className="px-4">
        <p className="text-center text-sm text-gray-500 mt-3">{formatDate(today)}</p>
        <DailyProgress current={totalCalories} goal={settings.dailyCalorieGoal} />

        {meals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🍽️</p>
            <p className="text-sm">No meals logged today</p>
            <p className="text-xs mt-1">Tap Snap to photograph your food</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
