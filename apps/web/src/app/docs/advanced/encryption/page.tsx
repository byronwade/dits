import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { Shield, Key, Lock } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Encryption",
  description: "Encrypt sensitive content in Dits repositories",
};

export default function EncryptionPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Advanced Topics"
        title="Encryption"
        description="Dits supports end-to-end encryption for sensitive content, ensuring your files remain private even on shared storage."
      />

      <h2>Encryption Overview</h2>
      <p>
        Dits encryption protects your content at multiple levels:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Shield className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">At Rest</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Chunks are encrypted before being written to storage. Even with
              storage access, data is unreadable.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Lock className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All transfers use TLS encryption. Optional additional layer of
              content encryption for zero-trust scenarios.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Key className="size-5 text-brand" />
            </div>
            <CardTitle className="text-base">Key Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Flexible key management with support for passphrases, key files,
              and hardware security modules.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2>Quick Start</h2>

      <h3>Enable Encryption on New Repository</h3>
      <CodeBlock
        language="bash"
        code={`# Initialize with encryption
$ dits init --encrypt

Enter encryption passphrase: ********
Confirm passphrase: ********

Initialized encrypted Dits repository in .dits
Encryption: AES-256-GCM
Key derivation: Argon2id

Your repository is now encrypted. Keep your passphrase safe!`}
      />

      <h3>Enable Encryption on Existing Repository</h3>
      <CodeBlock
        language="bash"
        code={`$ dits encrypt enable

Enter encryption passphrase: ********
Confirm passphrase: ********

Encrypting repository...
  Encrypting 45,892 chunks... done
  Updating metadata... done

Repository encrypted. All existing and new data is now protected.`}
      />

      <h2>Encryption Algorithms</h2>

      <h3>Default: AES-256-GCM</h3>
      <p>
        Dits uses AES-256-GCM for chunk encryption:
      </p>
      <ul>
        <li><strong>AES-256:</strong> Industry-standard symmetric encryption</li>
        <li><strong>GCM mode:</strong> Authenticated encryption (integrity + confidentiality)</li>
        <li><strong>Per-chunk nonces:</strong> Each chunk has a unique nonce</li>
      </ul>

      <h3>Key Derivation: Argon2id</h3>
      <p>
        Passphrases are converted to keys using Argon2id:
      </p>
      <CodeBlock
        language="bash"
        code={`Key Derivation Parameters:
  Algorithm: Argon2id
  Memory: 64 MB
  Iterations: 3
  Parallelism: 4
  Salt: 32 bytes (random per repository)
  Output: 256-bit key`}
      />

      <h2>Key Management</h2>

      <h3>Passphrase</h3>
      <CodeBlock
        language="bash"
        code={`# Set passphrase interactively
$ dits encrypt set-passphrase

# Use environment variable
$ export DITS_PASSPHRASE="your-secure-passphrase"
$ dits pull

# Use passphrase file
$ dits config encrypt.passphraseFile ~/.dits-passphrase
$ chmod 600 ~/.dits-passphrase`}
      />

      <h3>Key Files</h3>
      <CodeBlock
        language="bash"
        code={`# Generate a key file
$ dits encrypt generate-key ~/.dits-key
Generated 256-bit key file: ~/.dits-key
Keep this file secure!

# Use key file
$ dits config encrypt.keyFile ~/.dits-key

# Or via environment
$ export DITS_KEY_FILE=~/.dits-key`}
      />

      <h3>Combining Methods</h3>
      <CodeBlock
        language="bash"
        code={`# Use both passphrase AND key file (most secure)
$ dits config encrypt.keyFile ~/.dits-key
$ dits config encrypt.requirePassphrase true

# Now both are required to decrypt`}
      />

      <Callout type="warning" title="Key Backup Warning" className="not-prose my-6">
        If you lose your encryption key/passphrase, your data is
        <strong> permanently unrecoverable</strong>. Always maintain secure
        backups of your keys.
      </Callout>

      <h2>Selective Encryption</h2>
      <p>
        Encrypt specific files while leaving others unencrypted:
      </p>

      <CodeBlock
        language="bash"
        code={`# .ditsattributes

# Encrypt confidential files
contracts/*.pdf encrypt=true
financial/*.xlsx encrypt=true

# Encrypt all video in specific folder
client-confidential/** encrypt=true

# Don't encrypt public assets
public/** encrypt=false

# Encrypt by default for entire repo
* encrypt=true
public/** encrypt=false`}
      />

      <h3>Check Encryption Status</h3>
      <CodeBlock
        language="bash"
        code={`$ dits encrypt status

Repository Encryption: ENABLED
Algorithm: AES-256-GCM
Key derivation: Argon2id

File Status:
  contracts/agreement.pdf     ENCRYPTED
  footage/scene1.mov          ENCRYPTED
  README.md                   ENCRYPTED
  public/logo.png             UNENCRYPTED

Encrypted: 45,890 chunks (12.5 GB)
Unencrypted: 2 chunks (150 KB)`}
      />

      <h2>Convergent Encryption</h2>
      <p>
        By default, Dits uses <strong>convergent encryption</strong> which allows
        deduplication to work across encrypted data:
      </p>

      <CodeBlock
        language="bash"
        code={`Standard encryption:
  Same file → Different ciphertext (random IV)
  Result: No deduplication possible

Convergent encryption:
  Same file → Same ciphertext (content-derived key)
  Result: Deduplication works!

Dits approach:
  chunk_key = HKDF(master_key, chunk_hash)
  ciphertext = AES-GCM(chunk_key, nonce, plaintext)

  Same chunk + same master key = same ciphertext
  Deduplication preserved across encrypted repos!`}
      />

      <Callout type="note" title="Security Trade-off" className="not-prose my-6">
        Convergent encryption reveals if two chunks are identical. For
        maximum security at the cost of deduplication, use:
        <code className="ml-2">dits config encrypt.convergent false</code>
      </Callout>

      <h2>Team Encryption</h2>

      <h3>Shared Key Distribution</h3>
      <CodeBlock
        language="bash"
        code={`# Export encrypted key for team member
$ dits encrypt export-key --for jane@example.com > jane-key.enc

# Jane imports the key
$ dits encrypt import-key jane-key.enc
Enter your personal passphrase: ********
Repository key imported.`}
      />

      <h3>Role-Based Access</h3>
      <CodeBlock
        language="bash"
        code={`# Set up key hierarchy
$ dits encrypt add-key --role editor
$ dits encrypt add-key --role reviewer --read-only

# Assign roles
$ dits encrypt grant editor jane@example.com
$ dits encrypt grant reviewer client@example.com

# Reviewers can read but not modify encrypted content`}
      />

      <h2>Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# .dits/config
[encrypt]
    # Enable encryption
    enabled = true

    # Algorithm
    algorithm = aes-256-gcm

    # Key source (passphrase, keyfile, or both)
    keySource = passphrase

    # Key file path
    keyFile = ~/.dits/keys/project.key

    # Require passphrase in addition to key file
    requirePassphrase = false

    # Use convergent encryption (enables dedup)
    convergent = true

    # Key derivation parameters
    argon2Memory = 65536
    argon2Iterations = 3`}
      />

      <h2>Best Practices</h2>

      <ol>
        <li>
          <strong>Use strong passphrases:</strong> At least 16 characters with
          mixed case, numbers, and symbols
        </li>
        <li>
          <strong>Back up your keys:</strong> Store key files in a secure
          location separate from the repository
        </li>
        <li>
          <strong>Rotate keys periodically:</strong> Change encryption keys for
          long-lived projects
        </li>
        <li>
          <strong>Audit access:</strong> Regularly review who has access to
          encryption keys
        </li>
        <li>
          <strong>Use key files for CI:</strong> Don&apos;t store passphrases in CI
          systems; use key files with restricted access
        </li>
      </ol>

      <h2>Commands Reference</h2>
      <CodeBlock
        language="bash"
        code={`# Enable/disable encryption
$ dits encrypt enable
$ dits encrypt disable

# Key management
$ dits encrypt set-passphrase
$ dits encrypt generate-key <path>
$ dits encrypt rotate-key

# Status and verification
$ dits encrypt status
$ dits encrypt verify

# Team management
$ dits encrypt add-key --role <role>
$ dits encrypt grant <role> <email>
$ dits encrypt revoke <email>`}
      />

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/storage-tiers">Storage Tiers</Link>
        </li>
        <li>
          <Link href="/docs/concepts/content-addressing">Content Addressing</Link>
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link>
        </li>
      </ul>
    </div>
  );
}
