import type { NutritionInfo } from '../types'

// --- Configuration ---
const MODEL = 'gemini-3-flash-preview'
const TEMPERATURE = 0
const MAX_OUTPUT_TOKENS = 3000
const THINKING_BUDGET = 0
const RESPONSE_MIME_TYPE = 'application/json'

const SYSTEM_PROMPT = `You are a nutrition expert. Analyze this food photo carefully.

1. Identify every food item visible in the image.
2. Estimate the portion size / quantity from the plate, bowl, or container visible.
3. Calculate total nutrition for the ENTIRE visible serving.

Return ONLY valid JSON:
{"name":"descriptive name of the meal","servingSize":"estimated weight or portion e.g. 1 plate (350g)","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0}

All macros in grams, sodium in mg. Be precise about portion sizes.`

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

  return {
    name: parsed.name || 'Unknown food',
    nutrition: {
      calories: Math.round(parsed.calories || 0),
      protein: Math.round(parsed.protein || 0),
      carbs: Math.round(parsed.carbs || 0),
      fat: Math.round(parsed.fat || 0),
      fiber: Math.round(parsed.fiber || 0),
      sugar: Math.round(parsed.sugar || 0),
      sodium: Math.round(parsed.sodium || 0),
      servingSize: parsed.servingSize || 'Unknown',
    },
  }
}
