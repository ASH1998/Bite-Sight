import { openDB, type IDBPDatabase } from 'idb'
import type { Meal, UserSettings, WeightEntry } from '../types'

const DB_NAME = 'bite-sight-db'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1: initial schema
        if (oldVersion < 1) {
          const store = db.createObjectStore('meals', { keyPath: 'id' })
          store.createIndex('date', 'date', { unique: false })
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        // v2: weight tracking
        if (oldVersion < 2) {
          const weightStore = db.createObjectStore('weightEntries', { keyPath: 'id' })
          weightStore.createIndex('date', 'date', { unique: false })
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
  return row?.value ?? { dailyCalorieGoal: 2000, geminiApiKey: '' }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const db = await getDb()
  await db.put('settings', { key: 'user', value: settings })
}

export async function getAllMeals(): Promise<Meal[]> {
  const db = await getDb()
  return db.getAll('meals')
}

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  await db.clear('meals')
}

// Weight entry CRUD
export async function addWeightEntry(entry: WeightEntry): Promise<void> {
  const db = await getDb()
  await db.put('weightEntries', entry)
}

export async function getAllWeightEntries(): Promise<WeightEntry[]> {
  const db = await getDb()
  const entries = await db.getAll('weightEntries')
  return entries.sort((a, b) => a.timestamp - b.timestamp)
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('weightEntries', id)
}
