import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Self-Hosting Design Boundary",
  description:
    "Design archive for a possible future self-hosted Dits service; no deployable authenticated repository server is available.",
};

export default function SelfHostingDesignPage() {
  return (
    <DesignBoundaryPage
      title="Self-Hosting Design Boundary"
      summary="Running a utility process is not equivalent to operating a supported repository service."
      status="Dits has no deployable self-hosted control plane, user service, authenticated remote, database schema, worker system, admin UI, upgrade contract, or server backup procedure. The quarantined backend crates and historical diagrams are not active product components."
      targets={[
        "A single documented service topology with secure defaults and explicit state ownership.",
        "Local operator control over identity, storage, retention, backups, upgrades, and observability.",
        "Repeatable installation and recovery procedures proven against released artifacts.",
      ]}
      prerequisites={[
        "A maintained authenticated server and complete repository-exchange protocol.",
        "Authorization, audit, secret lifecycle, abuse controls, migrations, and disaster recovery.",
        "Published packages, support matrix, threat model, operational runbooks, and conformance tests.",
      ]}
      current={[
        "Keep repositories local and copy them with local-filesystem clone or independently managed backup tools.",
        "Use dits serve only as an unauthenticated object utility on a trusted or isolated network behind a firewall.",
        "Never expose dits serve to the public Internet or treat it as a complete remote repository.",
      ]}
      related={[
        { href: "/docs/architecture/security", label: "Current security boundary" },
        { href: "/docs/cli/remotes", label: "Remote command status" },
        { href: "/docs/deployment", label: "Deployment design boundary" },
      ]}
    />
  );
}
