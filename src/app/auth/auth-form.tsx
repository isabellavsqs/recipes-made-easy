"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "./actions";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

// Shared form for the login and sign up pages. Server-side checks in
// actions.ts decide what's valid; this only shows their messages.
export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          defaultValue={state.email}
          className="rounded-lg border border-line bg-white px-3 py-2 text-base font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          type="password"
          name="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          className="rounded-lg border border-line bg-white px-3 py-2 text-base font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {isSignup && (
          <span className="text-xs font-normal text-muted">
            At least 6 characters.
          </span>
        )}
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
      >
        {pending
          ? isSignup
            ? "Creating your account…"
            : "Logging in…"
          : isSignup
            ? "Create account"
            : "Log in"}
      </button>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
