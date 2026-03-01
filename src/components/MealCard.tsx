import type { Meal } from '../types'
import { formatTime } from '../utils/helpers'

interface Props {
  meal: Meal
  onDelete: (id: string) => void
}

export default function MealCard({ meal, onDelete }: Props) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex">
      <img
        src={meal.imageData}
        alt={meal.name}
        className="w-20 h-20 object-cover flex-shrink-0"
      />
      <div className="flex-1 px-3 py-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{meal.name}</h3>
            <p className="text-xs text-gray-400">{formatTime(meal.timestamp)} &middot; {meal.nutrition.servingSize}</p>
          </div>
          <span className="text-primary font-bold text-sm whitespace-nowrap">
            {meal.nutrition.calories} kcal
          </span>
        </div>
        <div className="flex gap-3 mt-1.5 text-[11px] text-gray-500">
          <span>P {meal.nutrition.protein}g</span>
          <span>C {meal.nutrition.carbs}g</span>
          <span>F {meal.nutrition.fat}g</span>
          <span>Fiber {meal.nutrition.fiber}g</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(meal.id)}
        className="self-center pr-3 pl-1 text-gray-300 hover:text-red-400 transition-colors"
        aria-label="Delete meal"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
