import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/home");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-4 font-serif text-4xl leading-tight sm:text-5xl">
        Know what to cook this week
      </h1>
      <p className="mb-10 max-w-md text-lg text-muted">
        Recipes and meal prep plans that respect your diet, your budget and
        the ingredients you actually like.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/signup"
          className="rounded-full bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary-dark"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-line bg-white px-6 py-3 font-medium transition hover:border-primary"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
