"use client";

import { useEffect, useRef, useState } from "react";

// See RecipeImage. This part runs in the browser so it can notice a photo
// that fails to load and show the letter panel instead.
export function RecipePhoto({
  title,
  src,
  className,
  lazy,
}: {
  title: string;
  src: string | null;
  className: string;
  lazy: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // A photo can fail before this code runs in the browser, and then onError
  // never fires: a finished image with no width failed.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={img}
        src={src}
        alt=""
        loading={lazy ? "lazy" : undefined}
        onError={() => setFailed(true)}
        className={`w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`flex w-full items-center justify-center bg-accent/10 font-serif text-5xl text-accent/60 ${className}`}
    >
      {title.trim()[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
