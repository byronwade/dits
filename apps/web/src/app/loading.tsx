export default function Loading() {
  return (
    <div className="container flex min-h-[40vh] items-center justify-center pt-24">
      <div
        className="size-8 animate-pulse rounded-full bg-muted"
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
