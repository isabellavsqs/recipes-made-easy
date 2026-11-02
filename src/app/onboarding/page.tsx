import type { Metadata } from "next";
import { getProfile, getProfileOptions } from "@/lib/profile";
import { saveOnboardingAction } from "./actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "About you · Recipes Made Easy" };

export default async function OnboardingPage() {
  const [profile, options] = await Promise.all([getProfile(), getProfileOptions()]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">
        {profile.onboardingCompleted ? "Edit your answers" : "Tell us about you"}
      </h1>
      <p className="mb-8 text-muted">
        A few quick questions so we only suggest recipes that fit you. It takes about a minute.
      </p>
      <OnboardingForm action={saveOnboardingAction} options={options} initial={profile} />
    </main>
  );
}
