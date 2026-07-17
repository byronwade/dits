import type { Metadata } from "next";

import { DesignBoundaryPage } from "@/components/docs/design-boundary-page";

export const metadata: Metadata = {
  title: "Webhook and Event Design Boundary",
  description:
    "Design archive for a possible future Dits event service; no webhook delivery, endpoint registration, or signed event stream is shipped.",
};

export default function WebhookDesignPage() {
  return (
    <DesignBoundaryPage
      title="Webhook and Event Design Boundary"
      summary="Reliability and security requirements for a future event-delivery service."
      status="Dits has no hosted webhook service, event subscription API, delivery worker, signing secret, retry queue, or repository event stream. No current push, lock, or hosted user event can trigger an external webhook."
      targets={[
        "Versioned event envelopes with stable identifiers, timestamps, and documented ordering limits.",
        "Authenticated registration and signed deliveries with replay protection.",
        "At-least-once retry semantics, idempotency guidance, dead-letter handling, and delivery observability.",
      ]}
      prerequisites={[
        "A hosted service and canonical server-side repository event model.",
        "Tenant authorization, secret rotation, abuse controls, retention policy, and incident procedures.",
        "End-to-end tests covering duplicates, delay, reordering, endpoint failure, and key rotation.",
      ]}
      current={[
        "Use local Dits hooks only for the hook names and behavior documented by the current CLI.",
        "Use your automation platform's native filesystem or process triggers for local experiments.",
        "Do not expose a receiver based on the removed speculative payload examples.",
      ]}
      related={[
        { href: "/docs/api/cicd", label: "CI/CD design boundary" },
        { href: "/docs/cli-reference", label: "Current CLI reference" },
        { href: "/docs/roadmap", label: "Status and roadmap" },
      ]}
    />
  );
}
