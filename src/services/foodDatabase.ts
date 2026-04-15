import csvRaw from '../data/Indian_Food_Nutrition_Processed.csv?raw'

// --- Types ---
export interface FoodEntry {
  name: string
  altName: string  // parenthetical name (Hindi/English alternate)
  fullName: string // original CSV name
  caloriesPer100g: number
  carbsPer100g: number
  proteinPer100g: number
  fatPer100g: number
  sugarPer100g: number
  fiberPer100g: number
  sodiumPer100g: number
}

export interface MatchResult {
  entry: FoodEntry
  score: number
}

// --- Parse CSV once ---
let _db: FoodEntry[] | null = null

function getDatabase(): FoodEntry[] {
  if (_db) return _db

  const lines = csvRaw.trim().split('\n')
  _db = lines.slice(1).map((line) => {
    const cols = line.split(',')
    const fullName = cols[0]?.trim() || ''

    // Extract alternate name from parentheses
    const parenMatch = fullName.match(/\(([^)]+)\)/)
    const altName = parenMatch ? parenMatch[1].trim() : ''
    const mainName = fullName.replace(/\([^)]*\)/, '').trim()

    return {
      name: mainName,
      altName,
      fullName,
      caloriesPer100g: parseFloat(cols[1]) || 0,
      carbsPer100g: parseFloat(cols[2]) || 0,
      proteinPer100g: parseFloat(cols[3]) || 0,
      fatPer100g: parseFloat(cols[4]) || 0,
      sugarPer100g: parseFloat(cols[5]) || 0,
      fiberPer100g: parseFloat(cols[6]) || 0,
      sodiumPer100g: parseFloat(cols[7]) || 0,
    }
  })

  return _db
}

// --- Matching ---

/** Words that describe cooking method, not the food itself */
const MODIFIER_WORDS = new Set([
  'steamed', 'fried', 'deep', 'boiled', 'baked', 'grilled', 'roasted', 'raw',
  'fresh', 'hot', 'cold', 'spicy', 'sweet', 'sour', 'crispy', 'soft',
  'whole', 'wheat', 'white', 'brown', 'plain', 'mixed', 'homemade',
  'with', 'and', 'in', 'on', 'of', 'the', 'a', 'an',
])

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\/\-_&+]/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function getWords(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean)
}

/** Get "core" food words (nouns, not modifiers) */
function getCoreWords(s: string): string[] {
  const words = getWords(s)
  const core = words.filter((w) => !MODIFIER_WORDS.has(w))
  // If everything was filtered, return all words (better than nothing)
  return core.length > 0 ? core : words
}

/**
 * Score match between query and target.
 * Focuses on core food words. Modifiers can boost but not carry the match.
 */
function computeScore(query: string, target: string): number {
  const qCore = getCoreWords(query)
  const tCore = getCoreWords(target)
  const qAll = getWords(query)
  const tAll = getWords(target)

  if (qCore.length === 0 || tCore.length === 0) return 0

  // Count core word matches (exact or stem overlap ≥4 chars)
  let coreMatches = 0
  for (const qw of qCore) {
    for (const tw of tCore) {
      if (qw === tw || (qw.length >= 4 && tw.length >= 4 && (qw.startsWith(tw.slice(0, 4)) || tw.startsWith(qw.slice(0, 4))))) {
        coreMatches++
        break
      }
    }
  }

  if (coreMatches === 0) return 0  // No core word match = no match at all

  // Core coverage: what fraction of query's core words matched
  const coreCoverage = coreMatches / qCore.length
  // Core precision: how specific is the match (penalize target with many extra core words)
  const corePrecision = coreMatches / Math.max(qCore.length, tCore.length)

  // Bonus: full word overlap (including modifiers)
  let allMatches = 0
  for (const qw of qAll) {
    if (tAll.includes(qw)) allMatches++
  }
  const fullOverlap = qAll.length > 0 ? allMatches / Math.max(qAll.length, tAll.length) : 0

  // Exact normalized match bonus
  const nq = normalize(query)
  const nt = normalize(target)
  if (nq === nt) return 1.0

  // Weighted: core matching is king, full overlap is bonus
  return coreCoverage * 0.5 + corePrecision * 0.3 + fullOverlap * 0.2
}

/** Score a query against a single food entry */
function scoreEntry(query: string, entry: FoodEntry): number {
  const scores = [
    computeScore(query, entry.name),
    computeScore(query, entry.fullName),
  ]
  if (entry.altName) {
    scores.push(computeScore(query, entry.altName))
  }
  return Math.max(...scores)
}

const MATCH_THRESHOLD = 0.45

/** Find top N matching food entries for a given dish name */
export function findTopMatches(query: string, n = 3): MatchResult[] {
  const db = getDatabase()
  const scored: MatchResult[] = []

  for (const entry of db) {
    const score = scoreEntry(query, entry)
    if (score >= MATCH_THRESHOLD) {
      scored.push({ entry, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, n)
}

/** Find best match (convenience wrapper) */
export function findMatch(query: string): MatchResult | null {
  const top = findTopMatches(query, 1)
  return top.length > 0 ? top[0] : null
}

/** Calculate nutrition for a given weight (grams) from per-100g data */
export function scaleNutrition(entry: FoodEntry, weightG: number) {
  const factor = weightG / 100
  return {
    calories: Math.round(entry.caloriesPer100g * factor),
    protein: Math.round(entry.proteinPer100g * factor),
    carbs: Math.round(entry.carbsPer100g * factor),
    fat: Math.round(entry.fatPer100g * factor),
    fiber: Math.round(entry.fiberPer100g * factor),
    sugar: Math.round(entry.sugarPer100g * factor),
    sodium: Math.round(entry.sodiumPer100g * factor),
  }
}
