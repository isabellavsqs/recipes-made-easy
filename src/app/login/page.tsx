import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/auth-form";
import { logIn } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Log in · Recipes Made Easy" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 font-serif text-3xl">Welcome back</h1>
      <p className="mb-8 text-muted">Log in to plan this week&apos;s meals.</p>
      <AuthForm mode="login" action={logIn} />
    </main>
  );
}
