import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Wire Protocol Design Boundary",
  description:
    "Design archive for a possible future Dits repository protocol; no stable wire format or working network repository exchange is shipped.",
};

export default function WireProtocolDesignPage() {
  return (
    <DesignBoundaryPage
      title="Wire Protocol Design Boundary"
      summary="A future repository protocol must preserve object integrity and atomic ref semantics before transport optimization matters."
      status="No stable Dits wire format, negotiation protocol, authenticated repository service, remote-ref transaction, or network clone exists. Push, pull, fetch, and sync return nonzero without changes. The in-process QUIC stream demo is an experiment, not a repository protocol."
      targets={[
        "Versioned capability negotiation and explicit repository-format compatibility.",
        "Verified object transfer followed by authenticated, atomic, compare-and-swap ref updates.",
        "Resumption, cancellation, backpressure, bounded resources, and deterministic failure recovery.",
      ]}
      prerequisites={[
        "A frozen object/ref semantic model and independent compatibility fixtures.",
        "A reviewed authentication, authorization, confidentiality, and replay-threat design.",
        "Interoperability, fault-injection, corruption, rollback, and concurrent-update tests.",
      ]}
      current={[
        "Evaluate local object storage and local-filesystem clone.",
        "Use dits gc --dry-run and dits fsck as local diagnostics, not protocol operations.",
        "Treat the embedded unauthenticated object server and QUIC demo as narrow experiments only.",
      ]}
      related={[
        { href: "/docs/architecture/protocol", label: "Protocol architecture design" },
        { href: "/docs/cli/remotes", label: "Remote command status" },
        { href: "/docs/architecture/security", label: "Current security boundary" },
      ]}
    />
  );
}
