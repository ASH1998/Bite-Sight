import type { NutritionInfo } from '../types'

interface Props {
  name: string
  nutrition: NutritionInfo
  imageData: string
  onSave: () => void
  onRetake: () => void
}

export default function FoodResult({ name, nutrition, imageData, onSave, onRetake }: Props) {
  return (
    <div className="flex flex-col h-full bg-surface overflow-y-auto no-scrollbar">
      {/* Food image */}
      <div className="relative flex-shrink-0">
        <img src={imageData} alt={name} className="w-full h-48 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <h2 className="absolute bottom-3 left-4 right-4 text-white text-xl font-bold drop-shadow leading-tight">{name}</h2>
      </div>

      {/* Nutrition content */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {/* Serving size */}
        <p className="text-center text-sm text-gray-500">{nutrition.servingSize}</p>

        {/* Calories - hero number */}
        <div className="text-center">
          <span className="text-4xl font-bold text-primary">{nutrition.calories}</span>
          <span className="text-gray-500 ml-1 text-sm">kcal</span>
        </div>

        {/* Main macros */}
        <div className="bg-card rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MacroItem label="Protein" value={`${nutrition.protein}g`} color="text-blue-500" />
            <MacroItem label="Carbs" value={`${nutrition.carbs}g`} color="text-orange-500" />
            <MacroItem label="Fat" value={`${nutrition.fat}g`} color="text-yellow-500" />
          </div>
        </div>

        {/* Detailed nutrients */}
        <div className="bg-card rounded-2xl shadow-sm p-4 border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</h3>
          <div className="flex flex-col gap-2">
            <NutrientRow label="Fiber" value={`${nutrition.fiber}g`} />
            <NutrientRow label="Sugar" value={`${nutrition.sugar}g`} />
            <NutrientRow label="Sodium" value={`${nutrition.sodium}mg`} />
          </div>
        </div>

        {/* Buttons - always visible, with bottom padding for nav */}
        <div className="flex gap-3 pb-20 pt-1">
          <button
            onClick={onRetake}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm border border-gray-300 text-gray-700 active:bg-gray-100 transition-colors"
          >
            Retake
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-primary text-white active:bg-primary-dark transition-colors"
          >
            Save Meal
          </button>
        </div>
      </div>
    </div>
  )
}

function MacroItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function NutrientRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
