import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="mb-2 font-serif text-5xl text-accent">404</p>
      <h1 className="mb-2 font-serif text-2xl">Page not found</h1>
      <p className="mb-8 text-muted">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/home"
        className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
      >
        Go home
      </Link>
    </main>
  );
}
