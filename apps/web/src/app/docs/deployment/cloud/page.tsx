import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Cloud Deployment Design Boundary",
  description:
    "Design archive for possible future cloud deployment targets; Dits has no supported AWS, Google Cloud, or Azure service deployment.",
};

export default function CloudDeploymentDesignPage() {
  return (
    <DesignBoundaryPage
      title="Cloud Deployment Design Boundary"
      summary="Provider choices remain hypothetical until there is a deployable Dits service."
      status="Dits does not deploy to or integrate with AWS, Google Cloud, Azure, Cloudflare, or another cloud provider as a hosted repository service. There are no supported Terraform modules, managed-service templates, data-region guarantees, or cloud cost models."
      targets={[
        "A provider-neutral application contract with a deliberately small supported infrastructure matrix.",
        "Encrypted service networking, scoped identities, durable state, tested backups, and explicit region behavior.",
        "Measured capacity and cost guidance tied to a real implementation and workload.",
      ]}
      prerequisites={[
        "A production-capable server and remote protocol independent of cloud-provider marketing.",
        "Reviewed infrastructure code, release artifacts, observability, migrations, and recovery exercises.",
        "Legal operator, data-flow inventory, subprocessor decisions, and published support boundaries.",
      ]}
      current={[
        "Store independently verified repository backups using your existing provider tooling.",
        "Do not configure speculative Dits cloud keys or endpoints from historical examples.",
        "Evaluate the local CLI without assuming cloud lifecycle or remote hydration behavior.",
      ]}
      related={[
        { href: "/docs/deployment", label: "Deployment design boundary" },
        { href: "/docs/advanced/storage-tiers", label: "Local lifecycle boundary" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
