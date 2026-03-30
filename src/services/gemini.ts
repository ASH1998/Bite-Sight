import type { NutritionInfo } from '../types'

// --- Configuration ---
const MODEL = 'gemini-3-flash-preview'
const TEMPERATURE = 0
const MAX_OUTPUT_TOKENS = 4000
// Allow the model to reason internally before producing the final answer.
// A budget of 1024 tokens is enough for detailed food analysis without
// excessive latency or cost.
const THINKING_BUDGET = 1024
const RESPONSE_MIME_TYPE = 'application/json'

// Threshold for auto-correcting calories from macros (15 % discrepancy).
// Calories ≈ protein×4 + carbs×4 + fat×9 (Atwater factors).
const CALORIE_CORRECTION_THRESHOLD = 0.15

const SYSTEM_PROMPT = `You are a certified nutritionist and dietitian with expertise in food analysis. Accurately calculate the nutritional content of the food shown in this photo.

Follow these steps:

Step 1 – Identify every food item:
List every distinct ingredient or component visible, including sauces, dressings, toppings, garnishes, and cooking fats (oil, butter).

Step 2 – Estimate portion weights:
Use visible context clues as rulers:
- Standard dinner plate diameter ≈ 26 cm
- Fork length ≈ 19 cm | tablespoon ≈ 15 ml | cup ≈ 240 ml
State the estimated weight (grams) for each item.

Step 3 – Look up nutritional values:
For each item use USDA FoodData Central values (per 100 g). Account for cooking:
- Pan-frying / deep-frying adds ≈ 8–12 g of absorbed oil per 100 g of food
- Stir-frying adds ≈ 3–5 g oil per 100 g
- Visible sauces / dressings: salad dressing ≈ 60–80 kcal/tbsp, mayo ≈ 90 kcal/tbsp, ketchup ≈ 15 kcal/tbsp

Step 4 – Calculate totals:
Multiply each item's per-100 g values by its estimated weight, then sum across all items.

Step 5 – Verify calorie consistency:
Your reported calories MUST satisfy: calories ≈ (protein × 4) + (carbs × 4) + (fat × 9) within ±10 %.
Adjust reported calories if needed so this relationship holds.

Return ONLY valid JSON with this exact structure:
{"name":"descriptive name of the meal","servingSize":"estimated total weight e.g. ~350g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0,"confidence":"high|medium|low","notes":"brief assumptions about hidden fats, cooking method, or ambiguous portions"}

All macros in grams, sodium in mg.
Confidence: "high" = food clearly identifiable and portion obvious; "medium" = some estimation required; "low" = unclear image or highly ambiguous dish.`

// --- Types ---
interface GeminiResult {
  name: string
  nutrition: NutritionInfo
}

// --- API ---
export async function analyzeFood(apiKey: string, imageBase64: string): Promise<GeminiResult> {
  if (!apiKey) {
    throw new Error('No API key configured. Please add your Gemini API key in Settings.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64

  const body = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      },
    ],
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

  const protein = Math.round(parsed.protein || 0)
  const carbs = Math.round(parsed.carbs || 0)
  const fat = Math.round(parsed.fat || 0)

  // Cross-validate reported calories against Atwater factors.
  // If the discrepancy is larger than the threshold, replace with the
  // macro-derived value so the displayed number is always self-consistent.
  const macroCalories = protein * 4 + carbs * 4 + fat * 9
  const reportedCalories = Math.round(parsed.calories || 0)
  const discrepancy =
    reportedCalories > 0
      ? Math.abs(macroCalories - reportedCalories) / reportedCalories
      : 1
  const calories =
    discrepancy > CALORIE_CORRECTION_THRESHOLD ? macroCalories : reportedCalories

  return {
    name: parsed.name || 'Unknown food',
    nutrition: {
      calories,
      protein,
      carbs,
      fat,
      fiber: Math.round(parsed.fiber || 0),
      sugar: Math.round(parsed.sugar || 0),
      sodium: Math.round(parsed.sodium || 0),
      servingSize: parsed.servingSize || 'Unknown',
      confidence: parsed.confidence ?? undefined,
      notes: parsed.notes ?? undefined,
    },
  }
}
