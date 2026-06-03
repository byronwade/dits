import { redirect } from "next/navigation";

// Benchmarks moved to a top-level page. Keep deep links alive.
export default function DocsBenchmarksRedirect() {
  redirect("/benchmarks");
}
