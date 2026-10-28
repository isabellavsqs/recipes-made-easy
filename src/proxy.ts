import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that only logged-in users can open.
const PROTECTED_PATHS = ["/home", "/recipes"];
// Pages that logged-in users don't need (they go straight to /home).
const AUTH_PATHS = ["/login", "/signup"];

function matches(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Runs before every page request: refreshes the Supabase session cookie and
// does a quick logged-in check. Pages still verify the user themselves.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  let redirectTo: string | null = null;
  if (!isLoggedIn && matches(pathname, PROTECTED_PATHS)) redirectTo = "/login";
  if (isLoggedIn && matches(pathname, AUTH_PATHS)) redirectTo = "/home";

  if (redirectTo) {
    const redirect = NextResponse.redirect(new URL(redirectTo, request.url));
    // Keep any refreshed session cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Every path except static files and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
