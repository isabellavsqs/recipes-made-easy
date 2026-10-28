"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

// "Are you sure?" dialog before a recipe is deleted.
export function DeleteRecipeButton({
  title,
  action,
}: {
  title: string;
  action: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-accent transition hover:border-accent"
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-6 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <h2 id="delete-title" className="mb-2 font-serif text-xl">
          Delete this recipe?
        </h2>
        <p className="mb-6 text-muted">
          Are you sure you want to delete <strong className="text-foreground">{title}</strong>?
          This can&apos;t be undone.
        </p>
        <form action={action} className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full border border-line px-4 py-2 font-medium transition hover:border-primary"
          >
            Cancel
          </button>
          <ConfirmButton />
        </form>
      </dialog>
    </>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent/90 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}
