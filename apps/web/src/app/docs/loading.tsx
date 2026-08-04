export default function DocsLoading() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-4/6 animate-pulse rounded-md bg-muted" />
        <span className="sr-only">Loading documentation</span>
      </div>
    </div>
  );
}
