export interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number // mg
  servingSize: string // e.g. "1 plate (300g)"
}

/** Individual food item identified in a meal */
export interface FoodItem {
  name: string
  weightG: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  source: 'db' | 'ai'  // 'db' = matched from Indian Food DB, 'ai' = LLM estimate
  dbMatch?: string      // name of matched DB entry (when source='db')
}

export interface Meal {
  id: string
  name: string
  nutrition: NutritionInfo
  imageData: string // base64 data URL
  timestamp: number
  date: string // YYYY-MM-DD
}

export interface DaySummary {
  date: string
  meals: Meal[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

export interface UserSettings {
  dailyCalorieGoal: number
  geminiApiKey: string
  height?: number        // cm
  targetWeight?: number  // kg
  weightUnit?: 'kg' | 'lb'
  goalDate?: string      // YYYY-MM-DD
}

export interface WeightEntry {
  id: string
  weight: number   // always stored in kg
  date: string     // YYYY-MM-DD
  timestamp: number
}
