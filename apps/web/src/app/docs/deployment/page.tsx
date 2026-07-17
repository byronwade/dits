import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Hosted Deployment Design Boundary",
  description:
    "Design archive for a possible future hosted Dits service; no production server distribution or managed deployment is available.",
};

export default function DeploymentDesignPage() {
  return (
    <DesignBoundaryPage
      title="Hosted Deployment Design Boundary"
      summary="A future service could target multiple operating environments only after the repository protocol and security boundary exist."
      status="Dits does not ship a deployable repository server, hosted control plane, official server image, production Compose stack, supported Helm chart, operator, managed database schema, or cloud deployment. Historical deployment files do not make the quarantined backend a product."
      targets={[
        "One supported server architecture with explicit state ownership and recovery semantics.",
        "Reproducible artifacts for selected environments rather than claims of universal deployment support.",
        "Documented observability, backup, upgrade, rollback, security, and capacity contracts.",
      ]}
      prerequisites={[
        "A complete authenticated remote repository protocol and maintained server implementation.",
        "Threat modeling, tenant isolation, secret management, migrations, and disaster-recovery tests.",
        "Published artifacts, provenance, release ownership, compatibility policy, and production evidence.",
      ]}
      current={[
        "Install or build the local CLI for an evaluation on one machine.",
        "Build the checked-in CLI Dockerfile from source only as a local packaging experiment; no official image is published.",
        "Keep independent backups and do not treat deployment drafts as runnable service instructions.",
      ]}
      related={[
        { href: "/docs/installation", label: "Current installation status" },
        { href: "/docs/architecture", label: "Active architecture" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
