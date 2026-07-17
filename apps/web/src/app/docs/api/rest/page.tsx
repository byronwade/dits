import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "REST API Design Boundary",
  description:
    "Design archive for a possible future Dits REST API; no hosted endpoint, token system, or production API is available.",
};

export default function RestApiDesignPage() {
  return (
    <DesignBoundaryPage
      title="REST API Design Boundary"
      summary="Questions a future hosted API would need to answer before an endpoint reference can exist."
      status="There is no Dits REST API, api.dits.io service, hosted repository service, bearer-token issuer, user directory, billing surface, or API availability commitment. Old endpoint examples were speculative and have been removed."
      targets={[
        "Versioned resources derived from the canonical repository object and ref semantics.",
        "Explicit authentication, authorization, tenant isolation, idempotency, pagination, and error contracts.",
        "Observable and rate-limited operations with documented consistency and failure behavior.",
      ]}
      prerequisites={[
        "A real service operator, threat model, data-flow inventory, and reviewed security boundary.",
        "A complete remote CAS/ref protocol with safe transactions and recovery behavior.",
        "OpenAPI evidence generated from an implemented server and exercised by retained conformance tests.",
      ]}
      current={[
        "Use the local CLI and library for offline repository evaluation.",
        "Treat dits serve as an unauthenticated object utility on trusted networks only, not as a REST API.",
        "Use local-filesystem clone for the current repository-copy workflow.",
      ]}
      related={[
        { href: "/docs/architecture/protocol", label: "Protocol design boundary" },
        { href: "/docs/architecture/security", label: "Current security boundary" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
