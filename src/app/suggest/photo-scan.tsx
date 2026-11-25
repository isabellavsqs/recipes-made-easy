"use client";

import { useRef, useState } from "react";

const MAX_PHOTOS = 3;
const MAX_BYTES = 1024 * 1024;

// Shrinks a photo in the browser to a JPEG of 1 MB or less, so uploads are
// quick and stay under the server's limit.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [side, quality] of [
      [1600, 0.8],
      [1280, 0.7],
      [1024, 0.6],
      [800, 0.5],
    ]) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Photo too large");
}

// "Scan a photo" on Single Dish (TEAM-PLAN.md feature 3). Sends up to three
// photos to our server, which asks Gemini for the food it sees, and passes
// the names to onFoods. Nothing is saved.
export function PhotoScan({ onFoods }: { onFoods: (foods: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function scan(files: File[]) {
    if (files.length === 0) return;
    if (files.length > MAX_PHOTOS) {
      setMessage({ text: `Choose up to ${MAX_PHOTOS} photos at a time.`, error: true });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      try {
        for (const file of files) form.append("photo", await shrink(file), "photo.jpg");
      } catch {
        setMessage({ text: "We couldn't open one of those photos. Try a JPG or PNG.", error: true });
        return;
      }

      const response = await fetch("/api/fridge-photo", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { foods?: string[]; error?: string };
      if (!response.ok || !data.foods) {
        setMessage({
          text: data.error ?? "We couldn't read your photos right now. Please try again, or type your list.",
          error: true,
        });
      } else if (data.foods.length === 0) {
        setMessage({
          text: "We didn't spot any food. Try a closer, brighter photo, or type your list.",
          error: true,
        });
      } else {
        onFoods(data.foods);
        setMessage({
          text: `Found ${data.foods.length} item${data.foods.length === 1 ? "" : "s"}. Check the list below and remove anything that's wrong.`,
          error: false,
        });
      }
    } catch {
      setMessage({ text: "We couldn't reach the server. Check your connection, or type your list.", error: true });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-4">
      <p className="text-sm text-muted">
        Your photo is sent to Google, which may use it to improve its products. Be careful to keep people and
        personal information out of the picture. Crop the photo to show only food.
      </p>
      <div>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary bg-white px-4 py-2 font-medium text-primary transition hover:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30 ${busy ? "pointer-events-none opacity-50" : ""}`}
        >
          📷 {busy ? "Reading your photos…" : "Scan fridge or pantry photos"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => scan(Array.from(e.target.files ?? []))}
            className="sr-only"
            aria-label="Upload up to 3 fridge or pantry photos"
          />
        </label>
        <span className="ml-2 text-xs text-muted">Up to {MAX_PHOTOS} photos. They aren&apos;t saved.</span>
      </div>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-accent" : "text-primary"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
