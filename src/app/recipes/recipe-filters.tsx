"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import type { RecipeQuery } from "@/lib/recipe-search";
import { COST_BRACKETS, COST_NOTE, costLabel } from "@/lib/recipe-validation";

// Search box, filters and sort for a recipe list. The choices live in the
// URL (?q=chicken&diet=vegan), so the page can be reloaded or shared. Without
// JavaScript it's a plain form; with it, changing a dropdown applies it.
export function RecipeFilters({
  action,
  query,
  cuisines,
  defaultSortLabel,
  hidden = {},
  filtered,
}: {
  action: string;
  query: RecipeQuery;
  cuisines: string[];
  defaultSortLabel: string;
  hidden?: Record<string, string>;
  filtered: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => formRef.current?.requestSubmit();

  const clearHref = Object.keys(hidden).length
    ? `${action}?${new URLSearchParams(hidden)}`
    : action;

  return (
    <form
      ref={formRef}
      action={action}
      role="search"
      aria-label="Find recipes"
      onSubmit={(event) => {
        event.preventDefault();
        // Leave empty fields out of the URL.
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget)) {
          if (typeof value === "string" && value.trim() && value !== "default") {
            params.set(key, value.trim());
          }
        }
        const search = params.toString();
        startTransition(() => {
          router.push(search ? `${action}?${search}` : action, { scroll: false });
        });
      }}
      className={`mb-6 flex flex-col gap-3 transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="recipe-search">
          Search by name or ingredient
        </label>
        <input
          id="recipe-search"
          name="q"
          type="search"
          defaultValue={query.q}
          placeholder="Search by name or ingredient, e.g. chicken"
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-primary px-5 py-2 font-medium text-white transition hover:bg-primary-dark"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Select onPick={apply} label="Cuisine" name="cuisine" value={query.cuisine}>
          <option value="">All cuisines</option>
          {cuisines.map((cuisine) => (
            <option key={cuisine} value={cuisine}>
              {cuisine}
            </option>
          ))}
        </Select>
        <Select onPick={apply} label="Diet" name="diet" value={query.diet}>
          <option value="">Any diet</option>
          <option value="vegan">Vegan</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="pescatarian">Pescatarian</option>
        </Select>
        <Select onPick={apply} label="Cost" name="cost" value={query.cost}>
          <option value="">Any cost</option>
          {COST_BRACKETS.map((cost) => (
            <option key={cost} value={cost}>
              {costLabel(cost)} {COST_NOTE}
            </option>
          ))}
        </Select>
        <Select onPick={apply} label="Total time" name="time" value={query.maxMinutes ? String(query.maxMinutes) : ""}>
          <option value="">Any time</option>
          <option value="15">15 min or less</option>
          <option value="30">30 min or less</option>
          <option value="60">1 hour or less</option>
        </Select>
        <Select onPick={apply} label="Sort by" name="sort" value={query.sort}>
          <option value="default">{defaultSortLabel}</option>
          <option value="time">Shortest time</option>
          <option value="cost">Lowest cost</option>
        </Select>
      </div>

      {filtered && (
        <Link
          href={clearHref}
          scroll={false}
          className="self-start text-sm font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear search and filters
        </Link>
      )}
    </form>
  );
}

function Select({
  label,
  name,
  value,
  onPick,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted">
      {label}
      <select
        name={name}
        defaultValue={value}
        onChange={onPick}
        className="w-full min-w-0 rounded-lg border border-line bg-white px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {children}
      </select>
    </label>
  );
}
