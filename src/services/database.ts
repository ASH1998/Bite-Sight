import { openDB, type IDBPDatabase } from 'idb'
import type { Meal, UserSettings } from '../types'

const DB_NAME = 'show-calorie-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meals')) {
          const store = db.createObjectStore('meals', { keyPath: 'id' })
          store.createIndex('date', 'date', { unique: false })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export async function addMeal(meal: Meal): Promise<void> {
  const db = await getDb()
  await db.put('meals', meal)
}

export async function getMealsByDate(date: string): Promise<Meal[]> {
  const db = await getDb()
  const meals = await db.getAllFromIndex('meals', 'date', date)
  return meals.sort((a, b) => b.timestamp - a.timestamp)
}

export async function deleteMeal(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('meals', id)
}

export async function getAllDates(): Promise<string[]> {
  const db = await getDb()
  const meals = await db.getAll('meals')
  const dates = [...new Set(meals.map((m) => m.date))]
  return dates.sort((a, b) => b.localeCompare(a))
}

export async function getSettings(): Promise<UserSettings> {
  const db = await getDb()
  const row = await db.get('settings', 'user')
  return row?.value ?? { dailyCalorieGoal: 2000 }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', { key: 'user', value: settings })
}

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  await db.clear('meals')
}
