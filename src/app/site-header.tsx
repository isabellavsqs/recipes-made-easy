import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logOut } from "@/app/auth/actions";

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
          <div className="flex items-center gap-3 text-sm">
            <nav className="flex items-center gap-3 font-medium">
              <Link href="/browse" className="whitespace-nowrap hover:text-primary">
                Browse
              </Link>
              <Link href="/recipes" className="whitespace-nowrap hover:text-primary">
                My Recipes
              </Link>
              <Link href="/dashboard" className="whitespace-nowrap hover:text-primary">
                Dashboard
              </Link>
            </nav>
            <span className="hidden text-muted md:inline">{user.email}</span>
            <form action={logOut}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 font-medium transition hover:border-primary"
              >
                Log out
              </button>
            </form>
          </div>
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
