import "server-only";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
};

// Returns the logged-in user, or null. getUser() asks Supabase to verify the
// session, so it can't be faked by editing a cookie.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Supabase couldn't be reached: show an error page (the user can retry)
  // instead of treating them as logged out.
  if (error && isAuthRetryableFetchError(error)) throw error;

  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}

// For pages that need a logged-in user: sends visitors to /login otherwise.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
