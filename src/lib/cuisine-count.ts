// Groups cuisines for the dashboard chart. Kept free of database code so it
// can be tested on its own.

export type CuisineCount = { cuisine: string; count: number };

export const NO_CUISINE = "No cuisine";
export const OTHER = "Other";
export const MAX_BARS = 8;

// "italian" and "Italian" count as one, shown as "Italian".
// Biggest first, ties A to Z. Past MAX_BARS, the smallest fold into "Other".
export function countByCuisine(cuisines: (string | null)[]): CuisineCount[] {
  const groups = new Map<string, CuisineCount>();
  for (const raw of cuisines) {
    const trimmed = raw?.trim() || NO_CUISINE;
    const name = trimmed[0].toUpperCase() + trimmed.slice(1);
    const key = name.toLowerCase();
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { cuisine: name, count: 1 });
  }

  const sorted = [...groups.values()].sort(
    (a, b) => b.count - a.count || a.cuisine.localeCompare(b.cuisine),
  );
  if (sorted.length <= MAX_BARS) return sorted;

  const kept = sorted.slice(0, MAX_BARS - 1);
  const rest = sorted.slice(MAX_BARS - 1).reduce((sum, group) => sum + group.count, 0);
  return [...kept, { cuisine: OTHER, count: rest }];
}
