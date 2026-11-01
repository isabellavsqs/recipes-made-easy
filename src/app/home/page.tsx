import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Home · Recipes Made Easy" };

export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="mb-2 break-words font-serif text-3xl">Hi, {user.email}</h1>
      <p className="mb-8 text-muted">What are we cooking this week?</p>
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </main>
  );
}
