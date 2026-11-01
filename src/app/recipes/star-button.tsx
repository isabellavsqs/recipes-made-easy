"use client";

import { startTransition, useOptimistic } from "react";

// A star toggle. It fills in right away, then the server saves it. Without
// JavaScript it still works as a normal form.
export function StarButton({
  title,
  starred,
  action,
  size = "md",
}: {
  title: string;
  starred: boolean;
  // Bound to the recipe on the server: action(star) sets the star on or off.
  action: (star: boolean) => Promise<void>;
  size?: "sm" | "md";
}) {
  const [shown, setShown] = useOptimistic(starred);
  const label = shown ? `Remove star from ${title}` : `Star ${title}`;

  return (
    <form
      action={action.bind(null, !shown)}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setShown(!shown);
          await action(!shown);
        });
      }}
    >
      <button
        type="submit"
        aria-pressed={shown}
        aria-label={label}
        title={shown ? "Remove star" : "Star this recipe"}
        className={`flex items-center gap-1.5 rounded-full border bg-white font-medium transition ${
          shown
            ? "border-accent text-accent"
            : "border-line text-muted hover:border-accent hover:text-accent"
        } ${size === "sm" ? "p-2 shadow-sm" : "px-4 py-1.5 text-sm"}`}
      >
        <StarIcon filled={shown} />
        {size === "md" && <span>{shown ? "Starred" : "Star"}</span>}
      </button>
    </form>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}
