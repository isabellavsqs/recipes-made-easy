"use client";

// Shown when a page fails unexpectedly, for example when Supabase can't be
// reached for a moment.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-2 font-serif text-3xl">Something went wrong</h1>
      <p className="mb-6 text-muted">
        We couldn&apos;t load this page. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
      >
        Try again
      </button>
    </main>
  );
}
