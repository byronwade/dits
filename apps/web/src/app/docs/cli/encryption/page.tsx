import { Metadata } from "next";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Info, Key, Lock, Unlock, KeyRound, AlertTriangle } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Encryption Commands",
  description: "Commands for repository encryption and key management in Dits",
};

const commands = [
  { command: "encrypt-init", description: "Initialize repository encryption", usage: "dits encrypt-init [OPTIONS]" },
  { command: "encrypt-status", description: "Show encryption status", usage: "dits encrypt-status" },
  { command: "login", description: "Login to unlock encryption keys", usage: "dits login [OPTIONS]" },
  { command: "logout", description: "Logout and clear cached keys", usage: "dits logout [OPTIONS]" },
  { command: "change-password", description: "Change encryption password", usage: "dits change-password" },
];

export default function EncryptionCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-8 w-8 text-emerald-500" />
        <h1 className="mb-0">Encryption Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Encrypt repository data at rest using industry-standard AES-256-GCM.
        Protects sensitive content while maintaining deduplication benefits
        through convergent encryption.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>End-to-End Encryption</AlertTitle>
        <AlertDescription>
          When encryption is enabled, all file content is encrypted before leaving
          your machine. Neither Dits servers nor storage backends can read your
          data without the encryption key.
        </AlertDescription>
      </Alert>

      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Command</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Usage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commands.map((cmd) => (
            <TableRow key={cmd.command}>
              <TableCell className="font-mono font-medium">{cmd.command}</TableCell>
              <TableCell>{cmd.description}</TableCell>
              <TableCell className="font-mono text-sm">{cmd.usage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="flex items-center gap-2">
        <Key className="h-5 w-5" />
        dits encrypt-init
      </h2>
      <p>
        Initialize encryption for a repository. Creates encryption keys and
        configures the repository to encrypt all data.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits encrypt-init [OPTIONS]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--key-file <PATH>   Use existing key file
--password          Use password-based encryption
--hardware-key      Use hardware security key (YubiKey, etc.)
--algorithm <ALG>   Encryption algorithm (default: aes-256-gcm)
--kdf <KDF>         Key derivation function (default: argon2id)
-v, --verbose       Show detailed setup`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Initialize with password
$ dits encrypt-init --password

Initializing repository encryption...

Enter encryption password: ********
Confirm password: ********

Encryption Configuration:
  Algorithm:    AES-256-GCM
  KDF:          Argon2id (memory: 256MB, iterations: 3)
  Key Storage:  Password-protected

Generating master key... done
Encrypting existing objects... 100% ████████████████████

Encryption initialized successfully!

<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> IMPORTANT: If you lose your password, your data cannot be recovered.</span>
   Consider backing up your key file at: .dits/keys/master.key

# Initialize with key file
$ dits encrypt-init --key-file ~/secrets/project.key

Using key file: ~/secrets/project.key
Encryption initialized.

# Initialize with hardware key
$ dits encrypt-init --hardware-key

Waiting for hardware key...
Touch your YubiKey...
Hardware key detected: YubiKey 5 NFC

Encryption initialized with hardware key protection.`}
      />

      <Alert className="not-prose my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Key Backup Required</AlertTitle>
        <AlertDescription>
          After initializing encryption, back up your key file or recovery phrase
          to a secure location. Without it, encrypted data cannot be recovered
          if you lose your password or hardware key.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        dits encrypt-status
      </h2>
      <p>
        Show the encryption status of the repository, including algorithm,
        key configuration, and encrypted object statistics.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits encrypt-status [OPTIONS]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--json              Output as JSON
-v, --verbose       Show detailed information`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`$ dits encrypt-status

Encryption Status: ENABLED

Configuration:
  Algorithm:        AES-256-GCM
  Key Derivation:   Argon2id
  Key Protection:   Password
  Initialized:      2025-01-15 14:30:00

Keys:
  Master Key:       Active (password-protected)
  Key Rotation:     Never rotated
  Recovery Key:     Configured

Session:
  Logged in:        Yes
  Session expires:  8 hours
  Key cached:       Yes (in memory)

Encrypted Objects:
  Chunks:           45,892 (100%)
  Assets:           156 (100%)
  Commits:          Metadata only

Storage:
  Encrypted size:   234.5 GB
  Overhead:         ~0.1% (for encryption metadata)

# When not logged in
$ dits encrypt-status

Encryption Status: ENABLED (LOCKED)

You are not logged in.
Run 'dits login' to unlock the repository.`}
      />

      <h2 className="flex items-center gap-2">
        <Unlock className="h-5 w-5" />
        dits login
      </h2>
      <p>
        Unlock the repository encryption keys. Required before reading or writing
        encrypted data.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits login [OPTIONS]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--key-file <PATH>   Use key file instead of password
--ttl <DURATION>    Session duration (default: 8h)
--no-cache          Don't cache credentials
-v, --verbose       Show detailed login info`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Login with password
$ dits login

Repository is encrypted.
Enter password: ********

Unlocking repository... done

Logged in successfully.
Session expires: 8 hours
Key cached in memory.

# Login with key file
$ dits login --key-file ~/secrets/project.key

Unlocking with key file... done
Logged in successfully.

# Login with extended session
$ dits login --ttl 24h

Enter password: ********
Session expires: 24 hours

# Login with hardware key
$ dits login

Hardware key detected.
Touch your YubiKey...
Logged in successfully.`}
      />

      <h2 className="flex items-center gap-2">
        <Lock className="h-5 w-5" />
        dits logout
      </h2>
      <p>
        Clear cached encryption keys and end the session. Recommended when
        leaving your workstation or sharing access.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits logout [OPTIONS]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--all               Logout from all repositories
-f, --force         Force logout (don't prompt)`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Logout from current repository
$ dits logout

Clearing cached keys... done
Logged out successfully.

The repository is now locked.
Run 'dits login' to unlock.

# Logout from all repositories
$ dits logout --all

Logging out from 3 repositories...
  /path/to/project1... done
  /path/to/project2... done
  /path/to/project3... done

All sessions ended.`}
      />

      <h2 className="flex items-center gap-2">
        <KeyRound className="h-5 w-5" />
        dits change-password
      </h2>
      <p>
        Change the encryption password. The underlying encryption key remains
        the same; only the password protecting it changes.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits change-password [OPTIONS]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--verify-old        Require old password verification
-v, --verbose       Show detailed information`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`$ dits change-password

Changing encryption password...

Enter current password: ********
Enter new password: ********
Confirm new password: ********

Validating current password... done
Updating key protection... done

Password changed successfully.

Note: This does not re-encrypt existing data.
The underlying encryption key remains the same.`}
      />

      <h2>How Encryption Works</h2>
      <CodeBlock
        language="bash"
        code={`Encryption Architecture:

                    ┌─────────────────┐
                    │   Your Files    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Chunking     │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │   Chunk 1   │   │   Chunk 2   │   │   Chunk N   │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  Encrypt    │   │  Encrypt    │   │  Encrypt    │
    │ AES-256-GCM │   │ AES-256-GCM │   │ AES-256-GCM │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Encrypted      │
                    │  Storage        │
                    │  (.dits/objects)│
                    └─────────────────┘

Key Hierarchy:
  Master Key (protected by password/hardware key)
    └── Repository Key (encrypted by master)
          └── Per-chunk keys (derived from content + repo key)`}
      />

      <h3>Convergent Encryption</h3>
      <p>
        Dits uses convergent encryption to maintain deduplication benefits. Identical
        chunks encrypt to identical ciphertext, allowing deduplication to work on
        encrypted data.
      </p>
      <CodeBlock
        language="bash"
        code={`# Same content = same encrypted chunk

chunk_key = HKDF(repo_key, content_hash)
ciphertext = AES-256-GCM(chunk_key, content)

Benefits:
  ✓ Deduplication still works
  ✓ Same storage efficiency as unencrypted
  ✓ No information leakage about content

Trade-offs:
  ⚠ Identical files across repos can be detected
  ⚠ Per-repo salt prevents cross-repo dedup`}
      />

      <h2>Security Recommendations</h2>
      <ul>
        <li><strong>Use strong passwords:</strong> At least 16 characters with mixed case, numbers, symbols</li>
        <li><strong>Back up your keys:</strong> Store recovery key in a secure, separate location</li>
        <li><strong>Use hardware keys:</strong> For maximum security, use YubiKey or similar</li>
        <li><strong>Logout when away:</strong> Clear cached keys when leaving your workstation</li>
        <li><strong>Rotate keys periodically:</strong> Consider key rotation for long-lived repositories</li>
      </ul>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/audit">Audit Commands</Link> - Track encryption events
        </li>
        <li>
          <Link href="/docs/cli/storage">Storage Commands</Link> - Encrypted storage tiers
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link> - Encryption settings
        </li>
      </ul>

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/encryption">Encryption Guide</Link> - Deep dive into encryption
        </li>
        <li>
          <Link href="/docs/architecture/protocol">Network Protocol</Link> - TLS in transit
        </li>
      </ul>
    </div>
  );
}
