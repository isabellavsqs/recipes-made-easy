import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logOut } from "@/app/auth/actions";

const NAV_LINKS = [
  ["/meal-prep", "Meal Prep"],
  ["/suggest", "Single Recipe"],
  ["/browse", "Browse"],
  ["/recipes", "My Recipes"],
  ["/dashboard", "Dashboard"],
  ["/profile", "Profile"],
] as const;

export async function SiteHeader() {
  // If Supabase can't be reached, show the logged-out header rather than
  // breaking every page; the page itself shows the error.
  const user = await getCurrentUser().catch(() => null);

  return (
    <header className="border-b border-line bg-white/70">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href={user ? "/home" : "/"} className="whitespace-nowrap font-serif text-lg sm:text-xl">
          Recipes Made Easy
        </Link>

        {user ? (
          <>
            {/* On phones the links get their own row (swipe if they don't fit). */}
            <nav className="order-3 flex w-full items-center gap-4 overflow-x-auto text-sm font-medium sm:order-none sm:ml-auto sm:w-auto sm:gap-3">
              {NAV_LINKS.map(([href, label]) => (
                <Link key={href} href={href} className="whitespace-nowrap hover:text-primary">
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-muted lg:inline">{user.email}</span>
              <form action={logOut}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 font-medium transition hover:border-primary"
                >
                  Log out
                </button>
              </form>
            </div>
          </>
        ) : (
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/login" className="hover:text-primary">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary px-3 py-1.5 text-white transition hover:bg-primary-dark"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
