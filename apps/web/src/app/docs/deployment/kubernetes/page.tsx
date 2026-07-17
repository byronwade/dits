import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Kubernetes Deployment Design Boundary",
  description:
    "Design archive for possible future Kubernetes targets; no supported Dits chart, operator, or production service is shipped.",
};

export default function KubernetesDesignPage() {
  return (
    <DesignBoundaryPage
      title="Kubernetes Deployment Design Boundary"
      summary="Historical manifests are not a supported cluster deployment."
      status="The repository contains historical Helm and Kubernetes research targeting backend images and services that are not part of the active workspace. There is no supported chart, operator, container image set, upgrade path, or production-grade Dits control plane."
      targets={[
        "A minimal chart generated from a real server's measured state, networking, and resource needs.",
        "Explicit persistent-volume, scheduling, disruption, scaling, and multi-zone behavior.",
        "Safe schema migrations, rollbacks, key rotation, observability, and recovery drills.",
      ]}
      prerequisites={[
        "Published server images and a supported deployment architecture.",
        "Chart validation against maintained Kubernetes versions with upgrade and failure tests.",
        "Operational ownership, security policy, capacity evidence, and documented support scope.",
      ]}
      current={[
        "Do not apply the historical manifests to a production cluster.",
        "Use Kubernetes-native storage and backup tooling independently of Dits if evaluating local artifacts in a disposable job.",
        "Treat any cluster experiment as user-owned infrastructure without Dits service support.",
      ]}
      related={[
        { href: "/docs/deployment", label: "Hosted deployment design boundary" },
        { href: "/docs/deployment/docker", label: "Container packaging boundary" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
