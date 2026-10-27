import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/auth-form";
import { signUp } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Sign up · Recipes Made Easy" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-2 font-serif text-3xl">Create your account</h1>
      <p className="mb-8 text-muted">
        Save your recipes and get meal ideas that fit your diet and budget.
      </p>
      <AuthForm mode="signup" action={signUp} />
    </main>
  );
}
