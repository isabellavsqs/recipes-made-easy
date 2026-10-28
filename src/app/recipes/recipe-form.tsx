"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { RecipeFormState } from "./actions";

type Option = { id: number; name: string };

type IngredientRow = {
  key: number;
  name: string;
  quantity: string;
  unit: string;
};

export type RecipeFormValues = {
  title: string;
  cuisine: string;
  instructions: string;
  prep_minutes: string;
  cook_minutes: string;
  base_servings: string;
  cost_bracket: string;
  diet_tags: string[];
  ingredients: { name: string; quantity: string; unit: string }[];
  allergenIds: number[];
  applianceIds: number[];
};

export const EMPTY_RECIPE: RecipeFormValues = {
  title: "",
  cuisine: "",
  instructions: "",
  prep_minutes: "",
  cook_minutes: "",
  base_servings: "",
  cost_bracket: "",
  diet_tags: [],
  ingredients: [],
  allergenIds: [],
  applianceIds: [],
};

type RecipeFormProps = {
  action: (prev: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  initial: RecipeFormValues;
  allergies: Option[];
  appliances: Option[];
  submitLabel: string;
  cancelHref: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

let nextKey = 0;
function toRow(ingredient: { name: string; quantity: string; unit: string }): IngredientRow {
  return { key: nextKey++, ...ingredient };
}

export function RecipeForm({
  action,
  initial,
  allergies,
  appliances,
  submitLabel,
  cancelHref,
}: RecipeFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [rows, setRows] = useState<IngredientRow[]>(() =>
    (initial.ingredients.length
      ? initial.ingredients
      : [{ name: "", quantity: "", unit: "" }]
    ).map(toRow),
  );

  function updateRow(key: number, field: keyof Omit<IngredientRow, "key">, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <label className={labelClass}>
        Title
        <input name="title" defaultValue={initial.title} className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Cuisine
          <input
            name="cuisine"
            defaultValue={initial.cuisine}
            placeholder="e.g. Italian"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Servings
          <input
            name="base_servings"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={initial.base_servings}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Prep time (minutes)
          <input
            name="prep_minutes"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={initial.prep_minutes}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Cook time (minutes)
          <input
            name="cook_minutes"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={initial.cook_minutes}
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Cost</legend>
        <div className="flex gap-2">
          {["$", "$$", "$$$"].map((cost) => (
            <label key={cost} className="cursor-pointer">
              <input
                type="radio"
                name="cost_bracket"
                value={cost}
                defaultChecked={initial.cost_bracket === cost}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                {cost}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <ChipGroup
        legend="Diet"
        name="diet_tags"
        options={["vegan", "vegetarian", "pescatarian"].map((tag) => ({
          value: tag,
          label: tag[0].toUpperCase() + tag.slice(1),
        }))}
        checked={initial.diet_tags}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Ingredients</legend>
        {rows.map((row, index) => (
          <div key={row.key} className="flex gap-2">
            <input
              name="ingredient_quantity"
              aria-label={`Ingredient ${index + 1} amount`}
              placeholder="2"
              inputMode="decimal"
              value={row.quantity}
              onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
              className={`${inputClass} w-16 shrink-0 sm:w-20`}
            />
            <input
              name="ingredient_unit"
              aria-label={`Ingredient ${index + 1} unit`}
              placeholder="cups"
              value={row.unit}
              onChange={(e) => updateRow(row.key, "unit", e.target.value)}
              className={`${inputClass} w-20 shrink-0 sm:w-28`}
            />
            <input
              name="ingredient_name"
              aria-label={`Ingredient ${index + 1} name`}
              placeholder="rice"
              value={row.name}
              onChange={(e) => updateRow(row.key, "name", e.target.value)}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <button
              type="button"
              aria-label={`Remove ingredient ${index + 1}`}
              onClick={() =>
                setRows((current) =>
                  current.length > 1
                    ? current.filter((r) => r.key !== row.key)
                    : [toRow({ name: "", quantity: "", unit: "" })],
                )
              }
              className="shrink-0 rounded-lg px-2 text-muted hover:text-accent"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRows((current) => [...current, toRow({ name: "", quantity: "", unit: "" })])
          }
          className="self-start text-sm font-medium text-primary hover:underline"
        >
          + Add ingredient
        </button>
      </fieldset>

      <label className={labelClass}>
        Instructions
        <textarea
          name="instructions"
          rows={8}
          defaultValue={initial.instructions}
          placeholder={"1. Rinse the rice.\n2. …"}
          className={inputClass}
        />
      </label>

      <ChipGroup
        legend="Contains allergens"
        name="allergen_ids"
        options={allergies.map((a) => ({ value: String(a.id), label: a.name }))}
        checked={initial.allergenIds.map(String)}
      />

      <ChipGroup
        legend="Appliances needed"
        name="appliance_ids"
        options={appliances.map((a) => ({ value: String(a.id), label: a.name }))}
        checked={initial.applianceIds.map(String)}
      />

      {state.error && (
        <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="font-medium text-muted hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function ChipGroup({
  legend,
  name,
  options,
  checked,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  checked: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={checked.includes(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-line bg-white px-3 py-1 text-sm peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
