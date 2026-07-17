import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Public SDK Design Boundary",
  description:
    "Design archive for possible future Dits SDKs; no supported JavaScript, Python, Go, or Rust SDK package is published.",
};

export default function SdkDesignPage() {
  return (
    <DesignBoundaryPage
      title="Public SDK Design Boundary"
      summary="Conditional goals for future client libraries, not installable package documentation."
      status="Dits publishes no supported JavaScript, TypeScript, Python, Go, or Rust SDK. Names, package-install commands, generated clients, compatibility promises, and code examples from earlier drafts did not correspond to released artifacts."
      targets={[
        "Small clients generated from one versioned API or protocol contract.",
        "Consistent error, retry, cancellation, streaming, and authentication semantics across languages.",
        "Published support matrices, signed artifacts, examples, and conformance tests for each release.",
      ]}
      prerequisites={[
        "An implemented and stable API or remote protocol to wrap.",
        "Package ownership, release automation, vulnerability response, and deprecation policy.",
        "Cross-language fixtures proving byte identity and repository transaction behavior.",
      ]}
      current={[
        "Inspect the local Rust workspace as implementation source, not as a stable third-party SDK contract.",
        "Invoke documented local CLI commands from controlled tooling when their human-readable output is sufficient.",
        "Pin the exact alpha commit and verify behavior before depending on internal modules.",
      ]}
      related={[
        { href: "/docs/api/rest", label: "REST API design boundary" },
        { href: "/docs/api/wire", label: "Wire protocol design boundary" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
