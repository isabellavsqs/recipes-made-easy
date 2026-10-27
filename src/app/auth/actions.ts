"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  email?: string;
};

const MIN_PASSWORD_LENGTH = 6;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

function checkRequired(email: string, password: string): string | null {
  if (!email && !password) return "Please enter your email and a password.";
  if (!email) return "Please enter your email.";
  if (!password) return "Please enter a password.";
  return null;
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);

  const missing = checkRequired(email, password);
  if (missing) return { error: missing, email };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
      email,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        error: "An account with this email already exists. Try logging in.",
        email,
      };
    }
    if (error.code === "email_address_invalid") {
      return { error: "That email address doesn't look right.", email };
    }
    return { error: `We couldn't create your account: ${error.message}`, email };
  }

  // If email confirmation were on, Supabase would return no session yet.
  if (!data.session) {
    return {
      error: "Account created. Please confirm your email, then log in.",
      email,
    };
  }

  redirect("/home");
}

export async function logIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);

  const missing = checkRequired(email, password);
  if (missing) return { error: missing, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "That email and password don't match.", email };
    }
    return { error: `We couldn't log you in: ${error.message}`, email };
  }

  redirect("/home");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
