export interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number // mg
  servingSize: string // e.g. "1 plate (300g)"
  confidence?: 'high' | 'medium' | 'low'
  notes?: string
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
}
