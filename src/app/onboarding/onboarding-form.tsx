"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_DISLIKES, MAX_GOALS } from "@/lib/profile-validation";
import { COST_BRACKETS, COST_NOTE, costLabel } from "@/lib/recipe-validation";
import type { Profile, ProfileOptions } from "@/lib/profile";
import type { OnboardingState } from "./actions";

// True once JavaScript is running in the browser (false on the server).
const useEnhanced = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

// One question per screen with a progress bar (PLAN.md §6). Every question
// stays in the page, only hidden, so all answers are sent together at the
// end. Without JavaScript, all questions show at once.
export function OnboardingForm({
  action,
  options,
  initial,
}: {
  action: (prev: OnboardingState, formData: FormData) => Promise<OnboardingState>;
  options: ProfileOptions;
  initial: Profile;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const enhanced = useEnhanced();
  const [step, setStep] = useState(0);
  const [goalIds, setGoalIds] = useState(() => new Set(initial.goals.map((g) => g.id)));
  const [dislikes, setDislikes] = useState(initial.dislikes);
  const [draft, setDraft] = useState("");
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const firstRender = useRef(true);

  // Move focus to the new question so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRefs.current[step]?.focus();
  }, [step]);

  function addDislike() {
    const name = draft.trim();
    if (name && !dislikes.some((d) => d.toLowerCase() === name.toLowerCase()) && dislikes.length < MAX_DISLIKES) {
      setDislikes([...dislikes, name]);
    }
    setDraft("");
  }

  const has = (list: { id: number }[], id: number) => list.some((item) => item.id === id);

  const steps = [
    {
      title: "What are your goals?",
      hint: `Pick up to ${MAX_GOALS}. They shape which recipes we suggest first.`,
      body: (
        <ChipList>
          {options.goals.map((goal) => {
            const checked = goalIds.has(goal.id);
            return (
              <Chip
                key={goal.id}
                type="checkbox"
                name="goal_ids"
                value={goal.id}
                label={goal.name}
                checked={checked}
                disabled={!checked && goalIds.size >= MAX_GOALS}
                onChange={() => {
                  const next = new Set(goalIds);
                  if (checked) next.delete(goal.id);
                  else next.add(goal.id);
                  setGoalIds(next);
                }}
              />
            );
          })}
        </ChipList>
      ),
      note: `${goalIds.size} of ${MAX_GOALS} picked`,
    },
    {
      title: "Do you follow a diet?",
      hint: "Recipes that don't fit it are never shown.",
      body: (
        <ChipList>
          {[
            ["none", "No restrictions"],
            ["vegetarian", "Vegetarian"],
            ["vegan", "Vegan"],
            ["pescatarian", "Pescatarian"],
          ].map(([value, label]) => (
            <Chip
              key={value}
              type="radio"
              name="diet"
              value={value}
              label={label}
              defaultChecked={initial.diet === value}
            />
          ))}
        </ChipList>
      ),
    },
    {
      title: "Any allergies?",
      hint: "Recipes with these are never shown. Leave empty if none.",
      body: (
        <ChipList>
          {options.allergies.map((allergy) => (
            <Chip
              key={allergy.id}
              type="checkbox"
              name="allergy_ids"
              value={allergy.id}
              label={allergy.name}
              defaultChecked={has(initial.allergies, allergy.id)}
            />
          ))}
        </ChipList>
      ),
    },
    {
      title: "Anything you'd rather not eat?",
      hint: "We'll avoid these when we suggest recipes. Leave empty if none.",
      body: enhanced ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <label htmlFor="dislike-input" className="sr-only">
              Ingredient you&apos;d rather not eat
            </label>
            <input
              id="dislike-input"
              list="ingredient-names"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDislike();
                }
              }}
              placeholder="e.g. mushrooms"
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={addDislike}
              className="shrink-0 rounded-full border border-line bg-white px-4 py-2 font-medium transition hover:border-primary"
            >
              Add
            </button>
            <datalist id="ingredient-names">
              {options.ingredientNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          {dislikes.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Your dislikes">
              {dislikes.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-1 rounded-full bg-accent/10 py-1 pr-1 pl-3 text-sm text-accent"
                >
                  {name}
                  <input type="hidden" name="dislikes" value={name} />
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setDislikes(dislikes.filter((d) => d !== name))}
                    className="rounded-full px-1.5 hover:bg-accent/20"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Separate them with commas
          <input
            name="dislikes_text"
            defaultValue={initial.dislikes.join(", ")}
            placeholder="e.g. mushrooms, olives"
            className="rounded-lg border border-line bg-white px-3 py-2 text-base"
          />
        </label>
      ),
    },
    {
      title: "What do you cook with?",
      hint: "We'll suggest recipes you can make with what you have.",
      body: (
        <ChipList>
          {options.appliances.map((appliance) => (
            <Chip
              key={appliance.id}
              type="checkbox"
              name="appliance_ids"
              value={appliance.id}
              label={appliance.name}
              defaultChecked={has(initial.appliances, appliance.id)}
            />
          ))}
        </ChipList>
      ),
    },
    {
      title: "What's your usual budget?",
      hint: `Roughly, ${COST_NOTE}.`,
      body: (
        <ChipList>
          {COST_BRACKETS.map((value) => (
            <Chip
              key={value}
              type="radio"
              name="budget"
              value={value}
              label={costLabel(value)}
              defaultChecked={initial.budget === value}
            />
          ))}
        </ChipList>
      ),
    },
    {
      title: "How do you want to start?",
      hint: "You can always switch later.",
      body: (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["meal prep", "Plan my meal prep", "Cook once, eat well all week."],
            ["single recipe", "Find one recipe", "Use what's already in my fridge."],
          ].map(([value, label, text]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="start_preference"
                value={value}
                defaultChecked={initial.startPreference === value}
                className="peer sr-only"
              />
              <span className="block h-full rounded-2xl border border-line bg-white p-4 transition peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
                <span className="mb-1 block font-serif text-lg">{label}</span>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </label>
          ))}
        </div>
      ),
    },
  ];

  const last = steps.length - 1;
  const onLast = !enhanced || step === last;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {enhanced && (
        <div>
          <p className="mb-2 text-sm text-muted">
            Question {step + 1} of {steps.length}
          </p>
          <div
            role="progressbar"
            aria-label="Questionnaire progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step + 1}
            className="h-2 overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {steps.map((s, i) => (
        <fieldset key={s.title} hidden={enhanced && i !== step} className="flex min-w-0 flex-col gap-4">
          <legend className="sr-only">{s.title}</legend>
          <div>
            <h2
              ref={(el) => {
                headingRefs.current[i] = el;
              }}
              tabIndex={-1}
              className="font-serif text-2xl outline-none"
            >
              {s.title}
            </h2>
            <p className="mt-1 text-muted">{s.hint}</p>
          </div>
          {s.body}
          {s.note && <p className="text-sm text-muted">{s.note}</p>}
        </fieldset>
      ))}

      {state.error && (
        <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {enhanced && step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="rounded-full border border-line px-5 py-2.5 font-medium transition hover:border-primary"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {/* Different keys so React makes two separate buttons: reusing one
            and switching it to "submit" mid-click sent the form a question early. */}
        {onLast ? (
          <button
            key="finish"
            type="submit"
            disabled={pending}
            className="rounded-full bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : "Finish"}
          </button>
        ) : (
          <button
            key="next"
            type="button"
            onClick={() => setStep(step + 1)}
            className="rounded-full bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-primary-dark"
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
}

function ChipList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={input.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
      <input {...input} className="peer sr-only" />
      <span className="block rounded-full border border-line bg-white px-4 py-2 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
        {label}
      </span>
    </label>
  );
}
