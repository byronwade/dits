import Link from "next/link";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";

type RelatedLink = {
  href: string;
  label: string;
};

export function DesignBoundaryPage({
  title,
  summary,
  status,
  targets,
  prerequisites,
  current,
  related,
}: {
  title: string;
  summary: string;
  status: string;
  targets: string[];
  prerequisites: string[];
  current: string[];
  related: RelatedLink[];
}) {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Design Archive"
        title={title}
        description={summary}
      />

      <Callout type="warning" title="Design, not a shipped service" className="not-prose my-6">
        The current product is a local alpha CLI and library. There is no hosted
        Dits service, complete repository remote, public API or SDK, managed
        webhook system, official server image, or supported production
        deployment. The items below are conditional design targets, not setup
        instructions or commitments.
      </Callout>

      <h2>Status</h2>
      <p>{status}</p>

      <h2>Possible design targets</h2>
      <ul>
        {targets.map((target) => <li key={target}>{target}</li>)}
      </ul>

      <h2>Prerequisites before implementation claims</h2>
      <ul>
        {prerequisites.map((prerequisite) => (
          <li key={prerequisite}>{prerequisite}</li>
        ))}
      </ul>

      <h2>What can be evaluated today</h2>
      <ul>
        {current.map((item) => <li key={item}>{item}</li>)}
      </ul>

      <h2>Related status</h2>
      <ul>
        {related.map((item) => (
          <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
