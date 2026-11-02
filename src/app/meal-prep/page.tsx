import type { Metadata } from "next";
import Link from "next/link";
import { listMealPlans } from "@/lib/meal-plans";
import { getProfile } from "@/lib/profile";
import { createPlanAction } from "./actions";
import { PlanForm } from "./plan-form";

export const metadata: Metadata = { title: "Meal Prep · Recipes Made Easy" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function MealPrepPage() {
  const [profile, plans] = await Promise.all([getProfile(), listMealPlans()]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">Meal prep</h1>
      <p className="mb-8 text-muted">
        Cook once, eat well all week. Tell us how much you need and how long you can cook, and
        we&apos;ll pick the recipes, scale them and make your shopping list.
      </p>

      <section className="mb-10 rounded-2xl border border-line bg-white p-6">
        <PlanForm
          action={createPlanAction}
          initial={{ servings: "2", days: "5", minutes: "120", budget: profile.budget ?? "$$" }}
        />
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          {profile.onboardingCompleted ? (
            <>
              Plans follow your profile: your diet and allergies are never broken, dislikes are
              avoided, and only appliances you have are used.{" "}
            </>
          ) : (
            <>Tell us your diet, allergies and appliances so plans fit you. </>
          )}
          <Link href={profile.onboardingCompleted ? "/profile" : "/onboarding"} className="font-medium text-primary underline-offset-2 hover:underline">
            {profile.onboardingCompleted ? "See your profile" : "Answer the questions"}
          </Link>
        </p>
      </section>

      <h2 className="mb-4 font-serif text-2xl">Your plans</h2>
      {plans.length === 0 ? (
        <p className="text-muted">No plans yet. Your first one will show up here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/meal-prep/${plan.id}`}
                className="block rounded-2xl border border-line bg-white p-4 transition hover:border-primary"
              >
                <p className="font-medium">{plan.titles.join(" · ")}</p>
                <p className="text-sm text-muted">
                  {plan.days} {plan.days === 1 ? "day" : "days"} · {plan.servings}{" "}
                  {plan.servings === 1 ? "serving" : "servings"} per meal · made{" "}
                  {dateFormat.format(new Date(plan.createdAt))}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
