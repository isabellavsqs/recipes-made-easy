import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "Home · Recipes Made Easy" };

export default async function HomePage() {
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="mb-2 break-words font-serif text-3xl">Hi, {user.email}</h1>
      <p className="mb-8 text-muted">What are we cooking this week?</p>
      {!profile.onboardingCompleted && (
        <Link
          href="/onboarding"
          className="mb-4 block rounded-2xl border border-primary bg-primary/5 p-6 transition hover:bg-primary/10"
        >
          <h2 className="mb-1 font-serif text-xl">Tell us about you</h2>
          <p className="text-muted">
            A minute of questions (diet, allergies, goals) so we only show recipes that fit you. →
          </p>
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/meal-prep"
          className={`block rounded-2xl border bg-white p-6 transition hover:border-primary ${
            profile.startPreference === "meal prep" ? "border-primary" : "border-line"
          }`}
        >
          <h2 className="mb-1 font-serif text-xl">Meal prep</h2>
          <p className="text-muted">Get a plan for the week, scaled, with a shopping list.</p>
        </Link>
        <Link
          href="/suggest"
          className={`block rounded-2xl border bg-white p-6 transition hover:border-primary ${
            profile.startPreference === "single recipe" ? "border-primary" : "border-line"
          }`}
        >
          <h2 className="mb-1 font-serif text-xl">What can I cook?</h2>
          <p className="text-muted">Find one recipe that uses what&apos;s already in your fridge.</p>
        </Link>
        <Link
          href="/browse"
          className="block rounded-2xl border border-line bg-white p-6 transition hover:border-primary"
        >
          <h2 className="mb-1 font-serif text-xl">Browse recipes</h2>
          <p className="text-muted">Find ideas in our recipe library and star your favorites.</p>
        </Link>
        <Link
          href="/recipes"
          className="block rounded-2xl border border-line bg-white p-6 transition hover:border-primary"
        >
          <h2 className="mb-1 font-serif text-xl">My Recipes</h2>
          <p className="text-muted">Add, view, edit and delete the recipes you cook.</p>
        </Link>
        <Link
          href="/dashboard"
          className="block rounded-2xl border border-line bg-white p-6 transition hover:border-primary"
        >
          <h2 className="mb-1 font-serif text-xl">Dashboard</h2>
          <p className="text-muted">Your recipes, stars and meal plans at a glance.</p>
        </Link>
      </div>
    </main>
  );
}
