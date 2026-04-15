import type { NutritionInfo, FoodItem } from '../types'
import { findMatch, scaleNutrition } from './foodDatabase'

// --- Configuration ---
const MODEL = 'gemini-3-flash-preview'
// const MODEL = 'gemini-pro-latest'
const TEMPERATURE = 0
const MAX_OUTPUT_TOKENS = 3000
const THINKING_BUDGET = 0
const RESPONSE_MIME_TYPE = 'application/json'

const SYSTEM_PROMPT = `You are a nutrition expert specializing in global cuisines, especially Indian food. Analyze this food photo carefully.

1. Identify every INDIVIDUAL food item visible in the image.
2. For each item, estimate its weight in grams from the visible plate/bowl/container.
3. For Indian dishes, pay close attention to:
   - GRAVY/MASALA richness: thin dal-like gravy is low-fat; thick makhani/korma/butter-based gravies add 100-200+ kcal from cream, butter, cashew paste. Estimate gravy thickness and oil sheen visible on surface.
   - TADKA/TEMPERING: visible oil pooling or tadka on top adds 40-80 kcal per tablespoon of ghee/oil.
   - COOKING FAT: fried items (poori, pakora, paratha) absorb significant oil. Dry-roasted (tandoori, roti) absorb very little.
   - COCONUT-BASED curries (South Indian) are calorie-dense from coconut milk/cream.
   - Look for visible ghee, butter, or oil on rice, dal, or roti surfaces.
4. Calculate nutrition PER ITEM for the estimated weight, factoring in the masala/gravy/oil estimates above.
5. IMPORTANT: If the user description includes weights for specific items (e.g. "rice 200g, dal 150g"), use those weights EXACTLY — they override your visual estimate. Match each user-specified weight to the correct identified item.

Return ONLY valid JSON:
{"name":"descriptive name of the overall meal","items":[{"name":"item name","weight_g":150,"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0}]}

Use common recognizable names for items (e.g. "Toor Dal", "Jeera Rice", "Butter Naan", "Paneer Tikka").
All macros in grams, sodium in mg. Be precise about portion sizes and weights.`

// --- Types ---
export interface GeminiResult {
  name: string
  nutrition: NutritionInfo
  items: FoodItem[]
}

interface PendingMatch {
  index: number
  itemName: string
  dbName: string
}

// --- Verify DB matches with LLM ---
async function verifyMatches(
  apiKey: string,
  matches: PendingMatch[],
): Promise<Set<number>> {
  if (matches.length === 0) return new Set()

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  const pairs = matches.map((m) => `"${m.itemName}" → "${m.dbName}"`)
  const prompt = `For each pair, is the DB entry the SAME food as the detected item? Consider the actual dish, not just shared words. Return ONLY a JSON array of booleans, one per pair.

Pairs:
${pairs.map((p, i) => `${i + 1}. ${p}`).join('\n')}`

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 200,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.warn('[FoodDB] Verification call failed, accepting all matches')
      return new Set()
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const verdicts: boolean[] = JSON.parse(text)

    // Return indices of REJECTED matches
    const rejected = new Set<number>()
    verdicts.forEach((ok, i) => {
      if (!ok && matches[i]) {
        console.log(`[FoodDB] LLM rejected: "${matches[i].itemName}" ≠ "${matches[i].dbName}"`)
        rejected.add(matches[i].index)
      }
    })
    return rejected
  } catch (err) {
    console.warn('[FoodDB] Verification parse error, accepting all matches:', err)
    return new Set()
  }
}

// --- API ---
export async function analyzeFood(apiKey: string, imageBase64: string, description?: string): Promise<GeminiResult> {
  if (!apiKey) {
    throw new Error('No API key configured. Please add your Gemini API key in Settings.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64

  const parts: Array<Record<string, unknown>> = [
    { text: SYSTEM_PROMPT },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    },
  ]

  if (description?.trim()) {
    parts.push({ text: `User description: ${description.trim()}` })
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: RESPONSE_MIME_TYPE,
      thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[Gemini] API error:', response.status, err)
    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid API key. Please check your key in Settings.')
    }
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('[Gemini] Response:', JSON.stringify(data, null, 2))

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!text) {
    const reason = data.candidates?.[0]?.finishReason
      ?? data.promptFeedback?.blockReason
      ?? 'unknown'
    throw new Error(`Gemini returned no text (reason: ${reason})`)
  }

  const parsed = JSON.parse(text)

  // Phase 1: Process items — fuzzy match against Indian Food DB
  const rawItems: Array<Record<string, unknown>> = parsed.items || []

  // Build items with tentative DB matches, keep AI fallbacks in a side map
  const pendingMatches: PendingMatch[] = []
  const aiFallbacks = new Map<number, Omit<FoodItem, 'name' | 'weightG'>>()

  const items: FoodItem[] = rawItems.map((item, index) => {
    const itemName = String(item.name || 'Unknown')
    const weightG = Number(item.weight_g) || 100

    // AI values (always computed, used as fallback)
    const aiNutrition = {
      calories: Math.round(Number(item.calories) || 0),
      protein: Math.round(Number(item.protein) || 0),
      carbs: Math.round(Number(item.carbs) || 0),
      fat: Math.round(Number(item.fat) || 0),
      fiber: Math.round(Number(item.fiber) || 0),
      sugar: Math.round(Number(item.sugar) || 0),
      sodium: Math.round(Number(item.sodium) || 0),
      source: 'ai' as const,
    }

    const match = findMatch(itemName)

    if (match) {
      const scaled = scaleNutrition(match.entry, weightG)
      const dbDisplayName = match.entry.altName
        ? `${match.entry.name} (${match.entry.altName})`
        : match.entry.name
      console.log(`[FoodDB] Tentative: "${itemName}" → "${dbDisplayName}" (score: ${match.score.toFixed(2)})`)

      pendingMatches.push({ index, itemName, dbName: match.entry.fullName })
      aiFallbacks.set(index, aiNutrition)

      return {
        name: itemName,
        weightG,
        ...scaled,
        source: 'db' as const,
        dbMatch: dbDisplayName,
      }
    }

    console.log(`[FoodDB] No match for "${itemName}" — using AI estimate`)
    return { name: itemName, weightG, ...aiNutrition }
  })

  // Phase 2: Verify DB matches with LLM
  const rejected = await verifyMatches(apiKey, pendingMatches)

  // Revert rejected matches to AI estimates
  for (const idx of rejected) {
    const fallback = aiFallbacks.get(idx)
    if (fallback) {
      Object.assign(items[idx], fallback, { dbMatch: undefined })
    }
  }

  // Sum up all items for total nutrition
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
      sugar: acc.sugar + item.sugar,
      sodium: acc.sodium + item.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  )

  const totalWeight = items.reduce((sum, i) => sum + i.weightG, 0)

  return {
    name: parsed.name || 'Unknown food',
    nutrition: {
      ...totals,
      servingSize: `~${totalWeight}g total`,
    },
    items,
  }
}
