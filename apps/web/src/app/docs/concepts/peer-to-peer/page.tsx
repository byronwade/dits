import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Peer-to-Peer Design Boundary",
  description:
    "Design archive for possible future Dits peer exchange; all current P2P operations fail closed and transfer no data.",
  robots: { index: false, follow: true },
};

export default function PeerToPeerDesignPage() {
  return (
    <DesignBoundaryPage
      title="Peer-to-Peer Design Boundary"
      summary="Direct repository exchange remains a design question, not a usable sharing workflow."
      status="The dits p2p parser is discoverable so users receive an explicit diagnostic, but every P2P operation returns a nonzero error before validating paths, creating directories, opening a repository, changing cache state, binding a socket, or mounting anything. There is no rendezvous, discovery, NAT traversal, relay, peer authentication, or repository transfer."
      targets={[
        "Peer identity and authorization tied to an explicit repository capability model.",
        "Verified object negotiation followed by atomic ref updates and deterministic conflict handling.",
        "A transport strategy that documents direct, relay, privacy, metadata, and availability trade-offs.",
      ]}
      prerequisites={[
        "A complete remote CAS/ref protocol and stable compatibility contract.",
        "A reviewed threat model covering join-code entropy, replay, impersonation, relay trust, and denial of service.",
        "Interoperability and fault tests across disconnects, address changes, partial data, and concurrent ref updates.",
      ]}
      current={[
        "Use dits p2p --help only to inspect the disabled command surface.",
        "Use local-filesystem clone for a current repository-copy workflow.",
        "Use independently managed transfer and backup tools when data must cross machines.",
      ]}
      related={[
        { href: "/docs/cli/p2p", label: "Disabled P2P command status" },
        { href: "/docs/api/wire", label: "Wire protocol design boundary" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
