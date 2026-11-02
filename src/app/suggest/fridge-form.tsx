"use client";

import Form from "next/form";
import { useState, useSyncExternalStore } from "react";
import { MAX_FRIDGE_ITEMS } from "@/lib/suggestion";

// Common fresh things, one tap to add.
const QUICK_PICKS = [
  "chicken", "ground beef", "salmon", "shrimp", "eggs", "tofu",
  "onion", "garlic", "tomatoes", "bell pepper", "carrot", "spinach",
  "zucchini", "potatoes", "rice", "pasta", "cheese", "lemon",
];

// True once JavaScript is running in the browser (false on the server).
const useEnhanced = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

// What's in the fridge, sent in the URL (?have=chicken&have=rice&shop=yes)
// and never saved. Without JavaScript it's one comma-separated text box.
export function FridgeForm({
  initial,
  canShop,
  ingredientNames,
}: {
  initial: string[];
  canShop: boolean;
  ingredientNames: string[];
}) {
  const enhanced = useEnhanced();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");

  const has = (name: string) => items.some((i) => i.toLowerCase() === name.toLowerCase());
  function add(name: string) {
    const clean = name.trim();
    if (clean && !has(clean) && items.length < MAX_FRIDGE_ITEMS) setItems([...items, clean]);
  }

  return (
    <Form action="/suggest" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label htmlFor="fridge-input" className="font-medium">
          What&apos;s in your fridge?
        </label>
        {enhanced ? (
          <>
            <div className="flex gap-2">
              <input
                id="fridge-input"
                list="fridge-suggestions"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(draft);
                    setDraft("");
                  }
                }}
                placeholder="Type an ingredient, e.g. chicken"
                className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => {
                  add(draft);
                  setDraft("");
                }}
                className="shrink-0 rounded-full border border-line bg-white px-4 py-2 font-medium transition hover:border-primary"
              >
                Add
              </button>
              {/* Something typed but not added yet still counts. */}
              <input type="hidden" name="have" value={draft} />
              <datalist id="fridge-suggestions">
                {ingredientNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {items.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="In your fridge">
                {items.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-1 rounded-full bg-primary py-1 pr-1 pl-3 text-sm text-white"
                  >
                    {name}
                    <input type="hidden" name="have" value={name} />
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => setItems(items.filter((i) => i !== name))}
                      className="rounded-full px-1.5 hover:bg-white/20"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <p className="mb-2 text-sm text-muted">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PICKS.filter((name) => !has(name)).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => add(name)}
                    className="rounded-full border border-line bg-white px-3 py-1 text-sm transition hover:border-primary"
                  >
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <input
            id="fridge-input"
            name="have_text"
            defaultValue={initial.join(", ")}
            placeholder="Separate with commas, e.g. chicken, rice, onion"
            className="rounded-lg border border-line bg-white px-3 py-2 text-base"
          />
        )}
        <p className="text-sm text-muted">
          Spices, oils, butter and salt don&apos;t count: we assume you have them. Nothing here is saved.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Can you shop for a few extra items?</legend>
        <div className="flex gap-2">
          {[
            ["yes", "Yes"],
            ["no", "No, only what I have"],
          ].map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="shop"
                value={value}
                defaultChecked={(value === "yes") === canShop}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={enhanced && items.length === 0 && !draft.trim()}
        className="self-start rounded-full bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        Find a recipe
      </button>
    </Form>
  );
}
