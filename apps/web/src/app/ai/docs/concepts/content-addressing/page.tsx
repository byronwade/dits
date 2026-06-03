import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { DocPageHeader } from "@/components/doc-page-header";

export const metadata: Metadata = {
  title: "Content Addressing",
  description:
    "BLAKE3 content addressing gives every chunk a stable identity: same bytes store once, and every read is verified against its hash.",
};

export default function Page() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Core Concepts"
        title="Content Addressing"
        description={"A chunk’s name is the hash of its content — so identity, deduplication, and integrity all come from one idea."}
      />

      <p>
        In Dits, a chunk is not addressed by where it lives or what you called
        it. It is addressed by what it <em>is</em>: the BLAKE3 hash of its bytes.
        That hash is the chunk&apos;s permanent name. Change one byte and you get
        a different name pointing at different content; change nothing and you
        get the same name every time, on every machine.
      </p>

      <h2>Same bytes, same address, stored once</h2>
      <p>
        Because the address is derived purely from content, two pieces of
        identical data resolve to the same hash and therefore the same stored
        object. Writing the same chunk twice is a no-op the second time &mdash;
        the store already has it. This is the mechanism behind exact
        deduplication: it falls out of the addressing scheme rather than needing
        a separate bookkeeping pass.
      </p>
      <CodeBlock
        language="bash"
        code={`# Same content -> same BLAKE3 address, regardless of filename
$ blake3 weights-v1.safetensors
b3:9f2c... 8a1e

$ cp weights-v1.safetensors copy.safetensors
$ blake3 copy.safetensors
b3:9f2c... 8a1e   # identical address -> stored once, not twice

# Flip a single byte -> a completely different address
$ blake3 weights-v1-edited.safetensors
b3:41d7... 0c93`}
      />

      <h2>Every read is verified</h2>
      <p>
        Because the name <em>is</em> the hash, a read can re-hash what it loaded
        and compare. If a byte rotted on disk, was truncated, or was tampered
        with, the recomputed hash will not match the address that was requested,
        and the read fails loudly. Corruption becomes detectable instead of
        silent &mdash; you never hand a model trainer a quietly damaged shard.
      </p>
      <Callout type="tip">
        For AI artifacts this matters most at scale: multi-gigabyte weight files
        and dataset shards are exactly where silent bit-rot and partial
        transfers hide. Content addressing turns &ldquo;is this file intact?&rdquo;
        into a hash comparison instead of a leap of faith.
      </Callout>

      <h2>Why BLAKE3</h2>
      <ul>
        <li>
          <strong>Fast</strong> &mdash; it keeps up with disk and network
          throughput, so verifying on every read is not a tax you feel.
        </li>
        <li>
          <strong>Collision-resistant</strong> &mdash; distinct content reliably
          gets distinct addresses, which is what makes dedup safe.
        </li>
        <li>
          <strong>Deterministic</strong> &mdash; the same bytes hash the same
          way everywhere, so addresses are portable across machines and time.
        </li>
      </ul>

      <Callout type="note">
        This behavior is <strong>identical to the shared engine</strong>. The AI
        docs frame it for weights and datasets; for the full reference &mdash;
        hash format, object layout, and verification internals &mdash; see{" "}
        <Link href="/docs/concepts/content-addressing">the engine reference</Link>.
      </Callout>

      <p>
        Content addressing is layer L1 of{" "}
        <Link href="/ai/docs/concepts/addressing">Three-Layer Addressing</Link>,
        and it is the part that works today. It pairs with{" "}
        <Link href="/ai/docs/concepts/chunking">Chunking &amp; Deduplication</Link>:
        chunking decides <em>what</em> gets a content address, and addressing
        decides how those pieces are named and verified.
      </p>
    </div>
  );
}
