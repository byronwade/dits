import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Container Packaging Boundary",
  description:
    "Current source-build container boundary and future service design; no official Dits server image or production Compose deployment is published.",
};

export default function DockerBoundaryPage() {
  return (
    <DesignBoundaryPage
      title="Container Packaging Boundary"
      summary="A source-built local CLI image is different from a supported hosted-service deployment."
      status="The source tree contains a Dockerfile that builds the local CLI for a Linux x64 runtime. Dits does not publish an official image, server image, registry release, production Compose stack, or container support contract. The CLI image does not add working remotes or a hosted API."
      targets={[
        "Signed, provenance-attested images for an explicitly supported architecture matrix.",
        "Separate local CLI packaging from any future stateful server and worker images.",
        "Non-root execution, immutable configuration, health checks, upgrade policy, and persistent-state documentation.",
      ]}
      prerequisites={[
        "A maintained server implementation before server-container documentation can exist.",
        "Automated image builds, vulnerability scanning, smoke tests, and release retention.",
        "Documented volume ownership, backup, migration, rollback, and resource requirements.",
      ]}
      current={[
        "Build the repository Dockerfile locally if a source-built CLI container suits a disposable evaluation.",
        "Mount only backed-up test data and verify host-file ownership after container use.",
        "Use the npm binaries on their two packaged targets or build the CLI directly from source.",
      ]}
      related={[
        { href: "/docs/installation", label: "Current installation status" },
        { href: "/docs/deployment", label: "Hosted deployment design boundary" },
        { href: "/docs/architecture/security", label: "Current security boundary" },
      ]}
    />
  );
}
