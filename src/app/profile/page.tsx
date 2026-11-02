import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "Profile · Recipes Made Easy" };

const DIET_LABELS: Record<string, string> = {
  none: "No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
};
const START_LABELS: Record<string, string> = {
  "meal prep": "Plan my meal prep",
  "single recipe": "Find one recipe",
};

export default async function ProfilePage(props: PageProps<"/profile">) {
  const [user, profile, params] = await Promise.all([requireUser(), getProfile(), props.searchParams]);

  const rows: [string, string][] = [
    ["Goals", profile.goals.map((g) => g.name).join(", ")],
    ["Diet", DIET_LABELS[profile.diet] ?? profile.diet],
    ["Allergies", profile.allergies.map((a) => a.name).join(", ")],
    ["Rather not eat", profile.dislikes.join(", ")],
    ["Cooks with", profile.appliances.map((a) => a.name).join(", ")],
    ["Usual budget", profile.budget ?? ""],
    ["Wants to start with", profile.startPreference ? START_LABELS[profile.startPreference] : ""],
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">Profile</h1>
      <p className="mb-8 break-words text-muted">{user.email}</p>

      {params.saved && (
        <p role="status" className="mb-6 rounded-lg bg-primary/10 px-4 py-3 text-primary">
          Saved. Browse now only shows recipes that fit your diet and allergies.
        </p>
      )}

      {profile.onboardingCompleted ? (
        <section className="rounded-2xl border border-line bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl">Your answers</h2>
            <Link
              href="/onboarding"
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-primary"
            >
              Edit answers
            </Link>
          </div>
          <dl className="divide-y divide-line">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm text-muted">{label}</dt>
                <dd>{value || <span className="text-muted">None</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <p className="mb-2 font-serif text-xl">You haven&apos;t answered the questions yet</p>
          <p className="mb-6 text-muted">
            Tell us about your goals, diet and allergies so we only suggest recipes that fit you.
          </p>
          <Link
            href="/onboarding"
            className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
          >
            Answer the questions
          </Link>
        </section>
      )}
    </main>
  );
}
