import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Shield, Key, Lock, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Encryption",
  description: "Encrypt sensitive content in Dits repositories",
};

export default function EncryptionPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Encryption</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits supports end-to-end encryption for sensitive content, ensuring your
        files remain private even on shared storage.
      </p>

      <h2>Encryption Overview</h2>
      <p>
        Dits encryption protects your content at multiple levels:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>At Rest</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Chunks are encrypted before being written to storage. Even with
              storage access, data is unreadable.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              All transfers use TLS encryption. Optional additional layer of
              content encryption for zero-trust scenarios.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Key Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Flexible key management with support for passphrases, key files,
              and hardware security modules.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>Quick Start</h2>

      <h3>Enable Encryption on New Repository</h3>
      <pre className="not-prose">
        <code>{`# Initialize with encryption
$ dits init --encrypt

Enter encryption passphrase: ********
Confirm passphrase: ********

Initialized encrypted Dits repository in .dits
Encryption: AES-256-GCM
Key derivation: Argon2id

Your repository is now encrypted. Keep your passphrase safe!`}</code>
      </pre>

      <h3>Enable Encryption on Existing Repository</h3>
      <pre className="not-prose">
        <code>{`$ dits encrypt enable

Enter encryption passphrase: ********
Confirm passphrase: ********

Encrypting repository...
  Encrypting 45,892 chunks... done
  Updating metadata... done

Repository encrypted. All existing and new data is now protected.`}</code>
      </pre>

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
      <pre className="not-prose">
        <code>{`Key Derivation Parameters:
  Algorithm: Argon2id
  Memory: 64 MB
  Iterations: 3
  Parallelism: 4
  Salt: 32 bytes (random per repository)
  Output: 256-bit key`}</code>
      </pre>

      <h2>Key Management</h2>

      <h3>Passphrase</h3>
      <pre className="not-prose">
        <code>{`# Set passphrase interactively
$ dits encrypt set-passphrase

# Use environment variable
$ export DITS_PASSPHRASE="your-secure-passphrase"
$ dits pull

# Use passphrase file
$ dits config encrypt.passphraseFile ~/.dits-passphrase
$ chmod 600 ~/.dits-passphrase`}</code>
      </pre>

      <h3>Key Files</h3>
      <pre className="not-prose">
        <code>{`# Generate a key file
$ dits encrypt generate-key ~/.dits-key
Generated 256-bit key file: ~/.dits-key
Keep this file secure!

# Use key file
$ dits config encrypt.keyFile ~/.dits-key

# Or via environment
$ export DITS_KEY_FILE=~/.dits-key`}</code>
      </pre>

      <h3>Combining Methods</h3>
      <pre className="not-prose">
        <code>{`# Use both passphrase AND key file (most secure)
$ dits config encrypt.keyFile ~/.dits-key
$ dits config encrypt.requirePassphrase true

# Now both are required to decrypt`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Key Backup Warning</AlertTitle>
        <AlertDescription>
          If you lose your encryption key/passphrase, your data is
          <strong> permanently unrecoverable</strong>. Always maintain secure
          backups of your keys.
        </AlertDescription>
      </Alert>

      <h2>Selective Encryption</h2>
      <p>
        Encrypt specific files while leaving others unencrypted:
      </p>

      <pre className="not-prose">
        <code>{`# .ditsattributes

# Encrypt confidential files
contracts/*.pdf encrypt=true
financial/*.xlsx encrypt=true

# Encrypt all video in specific folder
client-confidential/** encrypt=true

# Don&apos;t encrypt public assets
public/** encrypt=false

# Encrypt by default for entire repo
* encrypt=true
public/** encrypt=false`}</code>
      </pre>

      <h3>Check Encryption Status</h3>
      <pre className="not-prose">
        <code>{`$ dits encrypt status

Repository Encryption: ENABLED
Algorithm: AES-256-GCM
Key derivation: Argon2id

File Status:
  contracts/agreement.pdf     ENCRYPTED
  footage/scene1.mov          ENCRYPTED
  README.md                   ENCRYPTED
  public/logo.png             UNENCRYPTED

Encrypted: 45,890 chunks (12.5 GB)
Unencrypted: 2 chunks (150 KB)`}</code>
      </pre>

      <h2>Convergent Encryption</h2>
      <p>
        By default, Dits uses <strong>convergent encryption</strong> which allows
        deduplication to work across encrypted data:
      </p>

      <pre className="not-prose">
        <code>{`Standard encryption:
  Same file → Different ciphertext (random IV)
  Result: No deduplication possible

Convergent encryption:
  Same file → Same ciphertext (content-derived key)
  Result: Deduplication works!

Dits approach:
  chunk_key = HKDF(master_key, chunk_hash)
  ciphertext = AES-GCM(chunk_key, nonce, plaintext)

  Same chunk + same master key = same ciphertext
  Deduplication preserved across encrypted repos!`}</code>
      </pre>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Security Trade-off</AlertTitle>
        <AlertDescription>
          Convergent encryption reveals if two chunks are identical. For
          maximum security at the cost of deduplication, use:
          <code className="ml-2">dits config encrypt.convergent false</code>
        </AlertDescription>
      </Alert>

      <h2>Team Encryption</h2>

      <h3>Shared Key Distribution</h3>
      <pre className="not-prose">
        <code>{`# Export encrypted key for team member
$ dits encrypt export-key --for jane@example.com > jane-key.enc

# Jane imports the key
$ dits encrypt import-key jane-key.enc
Enter your personal passphrase: ********
Repository key imported.`}</code>
      </pre>

      <h3>Role-Based Access</h3>
      <pre className="not-prose">
        <code>{`# Set up key hierarchy
$ dits encrypt add-key --role editor
$ dits encrypt add-key --role reviewer --read-only

# Assign roles
$ dits encrypt grant editor jane@example.com
$ dits encrypt grant reviewer client@example.com

# Reviewers can read but not modify encrypted content`}</code>
      </pre>

      <h2>Configuration</h2>
      <pre className="not-prose">
        <code>{`# .dits/config
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
    argon2Iterations = 3`}</code>
      </pre>

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
      <pre className="not-prose">
        <code>{`# Enable/disable encryption
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
$ dits encrypt revoke <email>`}</code>
      </pre>

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
