import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logOut } from "@/app/auth/actions";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-white/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={user ? "/home" : "/"} className="font-serif text-xl">
          Recipes Made Easy
        </Link>

        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <nav className="flex items-center gap-3 font-medium">
              <Link href="/recipes" className="hover:text-primary">
                My Recipes
              </Link>
            </nav>
            <span className="hidden text-muted md:inline">{user.email}</span>
            <form action={logOut}>
              <button
                type="submit"
                className="rounded-full border border-line px-3 py-1.5 font-medium transition hover:border-primary"
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
