import { expect, test } from "@playwright/test";
import { identifyFoods, parseFoods } from "../src/lib/gemini-core";

// Gemini server code, tested on its own (no browser, no Supabase, no real
// Gemini key). Each test replaces fetch with a fake Gemini answer and checks
// what our code does with it: the foods it returns, or which friendly error.

const PHOTO = { type: "image/jpeg", bytes: new TextEncoder().encode("fake photo").buffer as ArrayBuffer };

const realFetch = globalThis.fetch;
const realEnv = { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL };

type Call = { url: string; init: RequestInit };
let calls: Call[];

// Replaces fetch with a fake that records the request and returns `answer`.
function fakeGemini(answer: () => Response | Promise<Response>) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return answer();
  }) as typeof fetch;
}

// What Gemini sends back when it answers with this text.
const geminiSays = (text: string) =>
  Response.json({ candidates: [{ content: { parts: [{ text }] } }] });

test.beforeEach(() => {
  calls = [];
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
});

test.afterEach(() => {
  globalThis.fetch = realFetch;
  if (realEnv.key === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = realEnv.key;
  if (realEnv.model === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = realEnv.model;
});

test("sends the photos with the key and returns a clean list of foods", async () => {
  fakeGemini(() => geminiSays('{"foods": ["Onion", "onions", "Chicken Thighs", "  ", "rice"]}'));

  const result = await identifyFoods([PHOTO, PHOTO]);

  // Lower case, no blanks, and "onions" isn't repeated after "Onion".
  expect(result).toEqual({ ok: true, foods: ["onion", "chicken thighs", "rice"] });

  // One request to Gemini, with the key in a header (not in the URL) and both photos.
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toContain("/models/gemini-3.5-flash-lite:generateContent");
  expect(calls[0].url).not.toContain("test-key");
  expect((calls[0].init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  const body = JSON.parse(String(calls[0].init.body));
  const photos = body.contents[0].parts.filter((p: { inline_data?: unknown }) => p.inline_data);
  expect(photos).toHaveLength(2);
  expect(photos[0].inline_data).toEqual({
    mime_type: "image/jpeg",
    data: Buffer.from("fake photo").toString("base64"),
  });
});

test("uses the model from GEMINI_MODEL", async () => {
  process.env.GEMINI_MODEL = "some-other-model";
  fakeGemini(() => geminiSays('{"foods": []}'));
  await identifyFoods([PHOTO]);
  expect(calls[0].url).toContain("/models/some-other-model:generateContent");
});

test("no key set: doesn't call Gemini", async () => {
  delete process.env.GEMINI_API_KEY;
  fakeGemini(() => geminiSays('{"foods": ["egg"]}'));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: false, reason: "not_configured" });
  expect(calls).toHaveLength(0);
});

test("no food in the photo: an empty list, not an error", async () => {
  fakeGemini(() => geminiSays('{"foods": []}'));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: true, foods: [] });
});

test("Google blocks the photo: treated like no food found", async () => {
  fakeGemini(() => Response.json({ promptFeedback: { blockReason: "SAFETY" } }));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: true, foods: [] });
});

test("free limit reached (429): the 'limit' message", async () => {
  fakeGemini(() => Response.json({ error: { status: "RESOURCE_EXHAUSTED" } }, { status: 429 }));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: false, reason: "limit" });
});

test("Gemini error, wrong model or garbled answer: the 'failed' message", async () => {
  fakeGemini(() => Response.json({ error: { message: "Internal" } }, { status: 500 }));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: false, reason: "failed" });

  fakeGemini(() => Response.json({ error: { message: "model not found" } }, { status: 404 }));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: false, reason: "failed" });

  fakeGemini(() => geminiSays("Sure! I see eggs and milk."));
  expect(await identifyFoods([PHOTO])).toEqual({ ok: false, reason: "failed" });
});

test("Gemini can't be reached: the 'failed' message", async () => {
  fakeGemini(() => {
    throw new TypeError("fetch failed");
  });
  expect(await identifyFoods([PHOTO])).toEqual({ ok: false, reason: "failed" });
});

test("the list keeps the fridge rules: only text, no repeats, at most 30", () => {
  const many = Array.from({ length: 40 }, (_, i) => `food ${i}`);
  expect(parseFoods(JSON.stringify({ foods: many }))).toHaveLength(30);
  expect(parseFoods('{"foods": ["Tomatoes", "tomato", 5, null, "milk"]}')).toEqual(["tomatoes", "milk"]);
  expect(parseFoods('["egg"]')).toEqual(["egg"]);
  expect(parseFoods("")).toEqual([]);
});
