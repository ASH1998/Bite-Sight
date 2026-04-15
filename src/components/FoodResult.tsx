import type { NutritionInfo, FoodItem } from '../types'

interface Props {
  name: string
  nutrition: NutritionInfo
  items: FoodItem[]
  imageData: string
  onSave: () => void
  onRetake: () => void
}

export default function FoodResult({ name, nutrition, items, imageData, onSave, onRetake }: Props) {
  const dbCount = items.filter((i) => i.source === 'db').length
  const aiCount = items.filter((i) => i.source === 'ai').length

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
        {/* Serving size + source summary */}
        <div className="text-center">
          <p className="text-sm text-gray-500">{nutrition.servingSize}</p>
          {items.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {dbCount > 0 && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{dbCount} from food DB</span>}
              {dbCount > 0 && aiCount > 0 && <span className="mx-1.5">·</span>}
              {aiCount > 0 && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{aiCount} AI estimated</span>}
            </p>
          )}
        </div>

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

        {/* Per-item breakdown */}
        {items.length > 1 && (
          <div className="bg-card rounded-2xl shadow-sm p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Item Breakdown</h3>
            <div className="flex flex-col gap-2.5">
              {items.map((item, i) => (
                <ItemRow key={i} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Single item DB match note */}
        {items.length === 1 && items[0].source === 'db' && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Matched: {items[0].dbMatch}
          </div>
        )}

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

function ItemRow({ item }: { item: FoodItem }) {
  const isDb = item.source === 'db'
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isDb ? 'bg-green-500' : 'bg-blue-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
          <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{item.calories} kcal</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{item.weightG}g</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-400">P {item.protein}g · C {item.carbs}g · F {item.fat}g</span>
        </div>
        {isDb && item.dbMatch && (
          <span className="text-[10px] text-green-600 leading-tight">{item.dbMatch}</span>
        )}
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
