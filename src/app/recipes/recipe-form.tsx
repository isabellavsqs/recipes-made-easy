"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { RecipeField, RecipeFormValues } from "@/lib/recipe-validation";
import type { RecipeFormState } from "./actions";

type Option = { id: number; name: string };

type IngredientRow = {
  key: number;
  name: string;
  quantity: string;
  unit: string;
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

// No width here: full-width fields add w-full, ingredient boxes set their own.
const inputBase =
  "rounded-lg border bg-white px-3 py-2 text-base font-normal outline-none focus:ring-2";
const inputOk = "border-line focus:border-primary focus:ring-primary/20";
const inputBad = "border-accent focus:border-accent focus:ring-accent/20";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

let nextKey = 0;
function toRow(ingredient: { name: string; quantity: string; unit: string }): IngredientRow {
  return { key: nextKey++, ...ingredient };
}
const emptyRow = () => toRow({ name: "", quantity: "", unit: "" });

export function RecipeForm({
  action,
  initial,
  allergies,
  appliances,
  submitLabel,
  cancelHref,
}: RecipeFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  // After an error, show what was submitted (matters when JavaScript is off).
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  const [rows, setRows] = useState<IngredientRow[]>(() =>
    values.ingredients.length ? values.ingredients.map(toRow) : [emptyRow()],
  );

  // Move the cursor to the first field that needs fixing.
  useEffect(() => {
    if (state.errors) {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    }
  }, [state]);

  function updateRow(key: number, field: keyof Omit<IngredientRow, "key">, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  // Props that connect an input to its error message.
  function fieldProps(field: RecipeField) {
    const message = errors[field];
    return {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? `${field}-error` : undefined,
      className: `${inputBase} ${message ? inputBad : inputOk} w-full`,
    };
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      // Submitting by hand keeps what the user typed if there's an error
      // (a plain form action would clear the fields).
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-muted">
        Fields marked <span className="text-accent">*</span> are required.
      </p>

      <label className={labelClass}>
        <span>
          Title <Required />
        </span>
        <input name="title" defaultValue={values.title} {...fieldProps("title")} />
        <FieldError field="title" message={errors.title} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Cuisine
          <input
            name="cuisine"
            defaultValue={values.cuisine}
            placeholder="e.g. Italian"
            className={`${inputBase} ${inputOk} w-full`}
          />
        </label>
        <label className={labelClass}>
          <span>
            Servings <Required />
          </span>
          <input
            name="base_servings"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={values.base_servings}
            {...fieldProps("base_servings")}
          />
          <FieldError field="base_servings" message={errors.base_servings} />
        </label>
        <label className={labelClass}>
          Prep time (minutes)
          <input
            name="prep_minutes"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={values.prep_minutes}
            {...fieldProps("prep_minutes")}
          />
          <FieldError field="prep_minutes" message={errors.prep_minutes} />
        </label>
        <label className={labelClass}>
          Cook time (minutes)
          <input
            name="cook_minutes"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={values.cook_minutes}
            {...fieldProps("cook_minutes")}
          />
          <FieldError field="cook_minutes" message={errors.cook_minutes} />
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
                defaultChecked={values.cost_bracket === cost}
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
        checked={values.diet_tags}
      />

      {/* min-w-0: a fieldset won't shrink below its content by default,
          which made ingredient rows overflow on phones. */}
      <fieldset
        className="flex min-w-0 flex-col gap-2"
        aria-describedby={errors.ingredients ? "ingredients-error" : undefined}
      >
        <legend className="mb-1 text-sm font-medium">
          Ingredients <Required />
        </legend>
        {rows.map((row, index) => {
          // Highlight the name of the first row when no ingredient was added.
          const invalid = errors.ingredients !== undefined && (index === 0 || !row.name.trim());
          return (
            <div key={row.key} className="flex gap-2">
              <input
                name="ingredient_quantity"
                aria-label={`Ingredient ${index + 1} amount`}
                placeholder="2"
                inputMode="decimal"
                value={row.quantity}
                onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                className={`${inputBase} ${inputOk} w-16 shrink-0 sm:w-20`}
              />
              <input
                name="ingredient_unit"
                aria-label={`Ingredient ${index + 1} unit`}
                placeholder="cups"
                value={row.unit}
                onChange={(e) => updateRow(row.key, "unit", e.target.value)}
                className={`${inputBase} ${inputOk} w-20 shrink-0 sm:w-28`}
              />
              <input
                name="ingredient_name"
                aria-label={`Ingredient ${index + 1} name`}
                aria-invalid={invalid || undefined}
                placeholder="rice"
                value={row.name}
                onChange={(e) => updateRow(row.key, "name", e.target.value)}
                className={`${inputBase} ${invalid ? inputBad : inputOk} min-w-0 flex-1`}
              />
              <button
                type="button"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() =>
                  setRows((current) =>
                    current.length > 1
                      ? current.filter((r) => r.key !== row.key)
                      : [emptyRow()],
                  )
                }
                className="shrink-0 rounded-lg px-2 text-muted hover:text-accent"
              >
                ✕
              </button>
            </div>
          );
        })}
        <FieldError field="ingredients" message={errors.ingredients} />
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow()])}
          className="self-start text-sm font-medium text-primary hover:underline"
        >
          + Add ingredient
        </button>
      </fieldset>

      <label className={labelClass}>
        <span>
          Instructions <Required />
        </span>
        <textarea
          name="instructions"
          rows={8}
          defaultValue={values.instructions}
          placeholder={"1. Rinse the rice.\n2. …"}
          {...fieldProps("instructions")}
        />
        <FieldError field="instructions" message={errors.instructions} />
      </label>

      <ChipGroup
        legend="Contains allergens"
        name="allergen_ids"
        options={allergies.map((a) => ({ value: String(a.id), label: a.name }))}
        checked={values.allergenIds.map(String)}
      />

      <ChipGroup
        legend="Appliances needed"
        name="appliance_ids"
        options={appliances.map((a) => ({ value: String(a.id), label: a.name }))}
        checked={values.applianceIds.map(String)}
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

function Required() {
  return (
    <span className="text-accent" aria-hidden>
      *
    </span>
  );
}

function FieldError({ field, message }: { field: RecipeField; message?: string }) {
  if (!message) return null;
  return (
    <span id={`${field}-error`} className="text-sm font-normal text-accent">
      {message}
    </span>
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
