// Fridge photo recognition (TEAM-PLAN.md feature 3): sends up to three
// photos to Google's Gemini API and gets back the food it sees. Nothing is
// saved.
//
// App code imports this through "@/lib/gemini", which is marked server-only
// so GEMINI_API_KEY never reaches the browser. This file has no such marker
// only so tests/gemini.spec.ts can run it without the app or any keys.
import { cleanFridge } from "@/lib/suggestion";

export const MAX_PHOTOS = 3;
// The browser shrinks every photo to 1 MB or less before sending it.
export const MAX_PHOTO_BYTES = 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// The model is a setting so we can switch if the free limits change.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const PROMPT = `These are photos of the inside of a fridge or pantry.
List every food or cooking ingredient you can clearly see.
- Use short, common grocery names in English, the way someone would type them in a shopping list (for example "eggs", "chicken thighs", "milk", "cheddar cheese", "rice").
- Name each food once, even if it appears in several photos.
- Read labels on packages and jars when you can.
- Leave out anything that isn't food, and anything you are not sure about.
- If you see no food, return an empty list.`;

export type ScanResult =
  | { ok: true; foods: string[] }
  | { ok: false; reason: "not_configured" | "limit" | "failed" };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

export async function identifyFoods(photos: { type: string; bytes: ArrayBuffer }[]): Promise<ScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "not_configured" };
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          ...photos.map((p) => ({
            inline_data: { mime_type: p.type, data: Buffer.from(p.bytes).toString("base64") },
          })),
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { foods: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["foods"],
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch (error) {
    console.error("Gemini request failed:", error);
    return { ok: false, reason: "failed" };
  }

  // 429 = the app's shared free limit is used up (it resets at midnight Pacific).
  if (response.status === 429) return { ok: false, reason: "limit" };
  if (!response.ok) {
    console.error("Gemini error:", response.status, (await response.text()).slice(0, 500));
    return { ok: false, reason: "failed" };
  }

  try {
    const data = (await response.json()) as GeminiResponse;
    // Google refused the photos (for example for safety reasons): treat it
    // like "no food found" rather than an outage.
    if (data.promptFeedback?.blockReason) return { ok: true, foods: [] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { ok: true, foods: parseFoods(text) };
  } catch (error) {
    console.error("Gemini answer could not be read:", error);
    return { ok: false, reason: "failed" };
  }
}

// Gemini's answer is JSON ({"foods": [...]}). Keeps only short text names,
// lower case, without repeats, and at most 30 (the fridge list's limit).
export function parseFoods(text: string): string[] {
  if (!text.trim()) return [];
  const parsed: unknown = JSON.parse(text);
  const raw = Array.isArray(parsed) ? parsed : (parsed as { foods?: unknown })?.foods;
  if (!Array.isArray(raw)) return [];
  return cleanFridge(raw.filter((f): f is string => typeof f === "string").map((f) => f.toLowerCase()));
}
