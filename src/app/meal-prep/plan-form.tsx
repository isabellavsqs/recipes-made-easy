"use client";

import { startTransition, useActionState } from "react";
import { COST_BRACKETS, COST_NOTE, costLabel } from "@/lib/recipe-validation";
import type { PlanFormState, PlanFormValues } from "./actions";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// The meal prep form. With `compact`, it's only a "Make another plan" button
// that sends the same settings again (hidden fields).
export function PlanForm({
  action,
  initial,
  compact = false,
  avoidIds = [],
}: {
  action: (prev: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  initial: PlanFormValues;
  compact?: boolean;
  avoidIds?: number[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initial;

  return (
    <form
      action={formAction}
      // Submitting by hand keeps what was typed if there's an error.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      // Our own messages instead of the browser's number checks.
      noValidate
      className={compact ? "" : "flex flex-col gap-5"}
    >
      {compact ? (
        <>
          {Object.entries(values).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input type="hidden" name="avoid" value={avoidIds.join(",")} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Servings per meal
              <input name="servings" type="number" min={1} max={10} inputMode="numeric" defaultValue={values.servings} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Days
              <input name="days" type="number" min={1} max={7} inputMode="numeric" defaultValue={values.days} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Cooking time (minutes)
              <input name="minutes" type="number" min={15} max={600} step={5} inputMode="numeric" defaultValue={values.minutes} className={inputClass} />
              <span className="text-xs font-normal text-muted">Total for your prep session</span>
            </label>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Budget {COST_NOTE}</legend>
            <div className="flex flex-wrap gap-2">
              {COST_BRACKETS.map((value) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" name="budget" value={value} defaultChecked={values.budget === value} className="peer sr-only" />
                  <span className="block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                    {costLabel(value)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {state.error && (
        <p role="alert" className={`rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent ${compact ? "mt-3" : ""}`}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? "rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-primary disabled:opacity-60"
            : "self-start rounded-full bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
        }
      >
        {pending ? "Making your plan…" : compact ? "Make another plan" : "Make my plan"}
      </button>
    </form>
  );
}
