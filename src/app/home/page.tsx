import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Home · Recipes Made Easy" };

export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">Hi, {user.email}</h1>
      <p className="text-muted">
        You&apos;re logged in. Your recipes, meal plans and dashboard will live
        here.
      </p>
    </main>
  );
}
