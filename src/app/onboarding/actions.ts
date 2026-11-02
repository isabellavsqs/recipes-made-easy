"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile, saveProfile } from "@/lib/profile";
import { validateProfile, type StartPreference } from "@/lib/profile-validation";

export type OnboardingState = { error?: string };

export async function saveOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const all = (key: string) => formData.getAll(key).map(String);
  // Dislikes come as one value per chip (with JavaScript) or as a
  // comma-separated text box (without it).
  const dislikes = [
    ...all("dislikes"),
    ...String(formData.get("dislikes_text") ?? "").split(","),
  ];

  const result = validateProfile({
    goalIds: all("goal_ids"),
    diet: String(formData.get("diet") ?? ""),
    allergyIds: all("allergy_ids"),
    dislikes,
    applianceIds: all("appliance_ids"),
    budget: String(formData.get("budget") ?? ""),
    startPreference: String(formData.get("start_preference") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  let firstTime: boolean;
  try {
    firstTime = !(await getProfile()).onboardingCompleted;
    await saveProfile(result.value);
  } catch (error) {
    console.error("Saving profile failed:", error);
    return { error: "Something went wrong while saving. Please try again." };
  }

  // Browse hides recipes that don't fit the new answers, so refresh it too.
  revalidatePath("/", "layout");
  // The first time, go straight to where the user chose to start. Later
  // edits (from Profile) go back to Profile.
  const start = result.value.startPreference;
  if (firstTime && start) redirect(`${START_PATHS[start]}?welcome=1`);
  redirect("/profile?saved=1");
}

const START_PATHS: Record<StartPreference, string> = {
  "meal prep": "/meal-prep",
  "single recipe": "/suggest",
};
