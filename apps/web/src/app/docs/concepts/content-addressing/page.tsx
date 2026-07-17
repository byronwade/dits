import type { Metadata } from "next";

import { DocPageHeader } from "@/components/doc-page-header";
import { Callout } from "@/components/ui/callout";

export const metadata: Metadata = {
  title: "Content Addressing in Dits",
  description:
    "How exact BLAKE3 identities, verification, manifests, and atomic storage fit together in the Dits local alpha.",
};

export default function ContentAddressingPage() {
  return (
    <div className="prose max-w-none dark:prose-invert">
      <DocPageHeader
        eyebrow="Core concepts"
        title="Content addressing"
        description="An object is named by a cryptographic digest of exact bytes, making integrity verification and exact reuse part of the storage model."
      />

      <h2>Identity</h2>
      <p>
        Dits uses BLAKE3 content identifiers in its current local chunk store. A
        reader recomputes the digest and checks length before trusting imported or
        stored bytes. The identifier says nothing about filename, ownership,
        artistic meaning, or perceptual similarity.
      </p>

      <h2>Indirection</h2>
      <p>
        Paths and commits do not need to contain large payloads directly. They can
        reference versioned manifests, which in turn reference ordered content
        objects. Multiple manifests may reference one exact chunk.
      </p>

      <h2>Atomic visibility</h2>
      <p>
        A trustworthy store writes to a temporary location, flushes and verifies
        the complete object, then publishes it atomically. A ref update should not
        expose a commit until every required object is durable. Hardening these
        crash and recovery semantics is a current roadmap gate.
      </p>

      <h2>Security boundary</h2>
      <p>
        A digest detects accidental or adversarial byte changes; it does not
        authenticate an author or authorize access. Identity, authorization,
        encryption keys, signatures, and remote policy are separate layers.
      </p>

      <Callout type="warning" title="Similarity is not identity" className="not-prose my-8">
        Two visually similar frames or numerically close tensors must keep
        different exact object IDs unless their bytes are identical. Approximate
        indexes may suggest candidates but cannot satisfy an exact read.
      </Callout>

      <h2>Format stability</h2>
      <p>
        If an object ID includes serialized metadata, the encoding must be
        deterministic and versioned. Dits has not yet declared its repository
        format a stable third-party contract; conformance vectors and migration
        behavior come before that promise.
      </p>
    </div>
  );
}
