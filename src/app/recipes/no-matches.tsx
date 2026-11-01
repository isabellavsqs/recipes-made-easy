import Link from "next/link";

export function ResultCount({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="mb-4 text-sm text-muted" aria-live="polite">
      {shown} of {total} recipes match
    </p>
  );
}

// Shown when search or filters leave nothing in a list that isn't empty.
export function NoMatches({ clearHref }: { clearHref: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center" aria-live="polite">
      <p className="mb-2 font-serif text-xl">No recipes match</p>
      <p className="mb-6 text-muted">Try another word, or loosen a filter.</p>
      <Link
        href={clearHref}
        scroll={false}
        className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
      >
        Clear search and filters
      </Link>
    </div>
  );
}
