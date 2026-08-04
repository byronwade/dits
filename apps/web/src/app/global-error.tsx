"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-neutral-900">
        <h1 className="text-3xl font-bold tracking-tight">Application error</h1>
        <p className="mt-3 max-w-md text-neutral-600">
          A root-level failure prevented the page from loading.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-neutral-500">
            digest {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
