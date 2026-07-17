import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "CI/CD Integration Design",
  description:
    "Design archive for possible future Dits CI/CD integration; no native runner integration, remote service, or deployment workflow is shipped.",
};

export default function CicdDesignPage() {
  return (
    <DesignBoundaryPage
      title="CI/CD Integration Design"
      summary="Conditional targets for automating a future network-capable Dits product."
      status="Dits does not integrate natively with GitHub Actions, GitLab CI, Jenkins, CircleCI, or another CI/CD platform today. Remote commands fail closed, no webhook service exists, and the v0.1.5 npm artifact does not contain a Linux binary."
      targets={[
        "Noninteractive commands with documented exit codes and machine-readable results.",
        "Reproducible artifact verification before a pipeline publishes or deploys content.",
        "Provider-neutral examples built on stable product interfaces rather than provider-specific promises.",
      ]}
      prerequisites={[
        "A supported distribution for the runner platform and a versioned compatibility policy.",
        "Working authenticated repository exchange with atomic ref-update semantics.",
        "A maintained event or API contract, secret-handling guidance, and retained integration tests.",
      ]}
      current={[
        "Build the local CLI from source in a controlled runner and evaluate only local commands.",
        "Run repository integrity checks against disposable or independently backed-up fixtures.",
        "Use the CI provider's own artifact and deployment tools; Dits provides no deployment integration.",
      ]}
      related={[
        { href: "/docs/cli-reference", label: "Current CLI reference" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
        { href: "/docs/api/webhooks", label: "Webhook design boundary" },
      ]}
    />
  );
}
