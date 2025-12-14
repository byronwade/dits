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
import { Lock, Info, Unlock, List, AlertTriangle } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Lock Commands",
  description: "Commands for file locking and exclusive editing in Dits teams",
};

const commands = [
  { command: "lock", description: "Lock files for exclusive editing", usage: "dits lock [OPTIONS] <PATHSPEC>..." },
  { command: "unlock", description: "Release file locks", usage: "dits unlock [OPTIONS] <PATHSPEC>..." },
  { command: "locks", description: "List active locks", usage: "dits locks [OPTIONS] [PATH]" },
];

export default function LockCommandsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-8 w-8 text-red-500" />
        <h1 className="mb-0">Lock Commands</h1>
      </div>
      <p className="lead text-xl text-muted-foreground">
        Lock files for exclusive editing in team environments. Prevents merge
        conflicts on binary files that cannot be automatically merged.
      </p>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Why Lock Binary Files?</AlertTitle>
        <AlertDescription>
          Unlike text files, binary files like videos and project files cannot be
          automatically merged. Locking ensures only one person edits a file at a
          time, preventing conflicting changes that would require manual resolution.
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
        <Lock className="h-5 w-5" />
        dits lock
      </h2>
      <p>
        Lock files for exclusive editing. Other team members will be notified
        that the file is locked and cannot modify it until you unlock it.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits lock [OPTIONS] &lt;PATHSPEC&gt;...`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--reason <TEXT>     Provide a reason for locking
--ttl <DURATION>    Lock time-to-live (default: 8h)
                    Examples: 1h, 8h, 24h, 7d
-f, --force         Force acquire lock (break existing)
--json              Output lock info as JSON
-v, --verbose       Show detailed information`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Lock a single file
$ dits lock footage/scene01.mov

Locked: footage/scene01.mov
  Owner: john@example.com
  Acquired: 2025-01-15 14:30:00 UTC
  Expires: 2025-01-15 22:30:00 UTC

# Lock with a reason (visible to team)
$ dits lock --reason "Color grading in progress" footage/scene01.mov

Locked: footage/scene01.mov
  Owner: john@example.com
  Reason: Color grading in progress
  Expires: 2025-01-15 22:30:00 UTC

# Lock with custom TTL
$ dits lock --ttl 24h footage/scene01.mov

# Lock for extended period
$ dits lock --ttl 7d footage/final-cut.mov

# Lock multiple files
$ dits lock footage/*.mov

Locked 5 files:
  footage/scene01.mov
  footage/scene02.mov
  footage/scene03.mov
  footage/interview-a.mov
  footage/interview-b.mov

# Lock entire directory
$ dits lock footage/vfx/

# Force lock (override existing lock - use carefully!)
$ dits lock -f footage/scene01.mov

Warning: Breaking lock held by jane@example.com
Locked: footage/scene01.mov`}
      />

      <Alert className="not-prose my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Force Lock Warning</AlertTitle>
        <AlertDescription>
          Using <code>--force</code> breaks another user&apos;s lock. Only use this if
          the lock holder is unavailable and you have team permission to take over.
          The original lock holder will be notified.
        </AlertDescription>
      </Alert>

      <h2 className="flex items-center gap-2">
        <Unlock className="h-5 w-5" />
        dits unlock
      </h2>
      <p>
        Release locks on files. You can only unlock files you own unless using
        force mode (admin privilege required).
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits unlock [OPTIONS] &lt;PATHSPEC&gt;...`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`-f, --force         Force unlock (admin only)
--all               Unlock all your locks
--json              Output result as JSON`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# Unlock a single file
$ dits unlock footage/scene01.mov

Unlocked: footage/scene01.mov

# Unlock multiple files
$ dits unlock footage/*.mov

Unlocked 5 files:
  footage/scene01.mov
  footage/scene02.mov
  footage/scene03.mov
  footage/interview-a.mov
  footage/interview-b.mov

# Unlock all your locks
$ dits unlock --all

Unlocked 8 files.

# Force unlock (admin only)
$ dits unlock -f footage/scene01.mov

Warning: Force unlocking file locked by jane@example.com
Unlocked: footage/scene01.mov`}
      />

      <h2 className="flex items-center gap-2">
        <List className="h-5 w-5" />
        dits locks
      </h2>
      <p>
        List active locks in the repository. See who has locked what files and when
        locks will expire.
      </p>

      <h3>Synopsis</h3>
      <CodeBlock
        language="bash"
        code={`dits locks [OPTIONS] [PATH]`}
      />

      <h3>Options</h3>
      <CodeBlock
        language="bash"
        code={`--mine              Show only your locks
--all               Show all locks (including expired)
--expired           Show only expired locks
--json              Output as JSON
-v, --verbose       Show detailed information`}
      />

      <h3>Examples</h3>
      <CodeBlock
        language="bash"
        code={`# List all active locks
$ dits locks

Active Locks (5):

  File                        Owner              Expires     Reason
  ─────────────────────────────────────────────────────────────────────
  footage/scene01.mov         john@example.com   6h 30m      Color grading
  footage/scene02.mov         john@example.com   6h 30m      Color grading
  project.prproj              jane@example.com   2h 00m      Edit assembly
  footage/interview.mov       alex@example.com   23h 15m     -
  audio/music.wav             jane@example.com   2h 00m      -

# List only your locks
$ dits locks --mine

Your Locks (2):

  File                        Expires     Reason
  ───────────────────────────────────────────────────
  footage/scene01.mov         6h 30m      Color grading
  footage/scene02.mov         6h 30m      Color grading

# List locks in specific directory
$ dits locks footage/

Locks in footage/:
  footage/scene01.mov         john@example.com   6h 30m
  footage/scene02.mov         john@example.com   6h 30m
  footage/interview.mov       alex@example.com   23h 15m

# Show expired locks (for cleanup)
$ dits locks --expired

Expired Locks (2):
  footage/old-take.mov        bob@example.com    expired 2d ago
  audio/draft.wav             jane@example.com   expired 4h ago

These can be cleaned with: dits unlock -f <file>

# Verbose output
$ dits locks -v footage/scene01.mov

Lock Details:
  File: footage/scene01.mov
  Owner: john@example.com
  Acquired: 2025-01-15 14:30:00 UTC
  Expires: 2025-01-15 22:30:00 UTC (6h 30m remaining)
  Reason: Color grading
  Lock ID: lock-a1b2c3d4
  Branch: main`}
      />

      <h2>Lock Workflow</h2>
      <CodeBlock
        language="bash"
        code={`# Typical locking workflow:

1. Check if file is locked
   $ dits locks footage/scene01.mov
   No locks on footage/scene01.mov

2. Lock before editing
   $ dits lock --reason "Editing scene 1" footage/scene01.mov
   Locked: footage/scene01.mov

3. Edit your file...
   # Other team members see:
   # $ dits lock footage/scene01.mov
   # Error: File locked by john@example.com
   # Reason: Editing scene 1

4. Commit your changes
   $ dits add footage/scene01.mov
   $ dits commit -m "Edit scene 1"
   $ dits push

5. Unlock when done
   $ dits unlock footage/scene01.mov
   Unlocked: footage/scene01.mov`}
      />

      <h2>Lock Behavior</h2>

      <h3>What Locks Prevent</h3>
      <ul>
        <li><strong>Modifications:</strong> Other users cannot modify locked files</li>
        <li><strong>Deletions:</strong> Locked files cannot be deleted by others</li>
        <li><strong>Renames:</strong> Locked files cannot be renamed by others</li>
        <li><strong>Force pushes:</strong> Force push affecting locked files blocked</li>
      </ul>

      <h3>What Locks Allow</h3>
      <ul>
        <li><strong>Reading:</strong> Anyone can still read/view locked files</li>
        <li><strong>Cloning:</strong> Locks don&apos;t prevent cloning the repository</li>
        <li><strong>Pulling:</strong> You can still pull changes (including locked files)</li>
      </ul>

      <h3>Lock Expiration</h3>
      <CodeBlock
        language="bash"
        code={`# Locks automatically expire to prevent abandoned locks

Default TTL: 8 hours

When a lock expires:
- File becomes unlockable by anyone
- Push will fail if you still have uncommitted changes
- Other users can acquire the lock

Extend a lock:
$ dits lock --ttl 8h footage/scene01.mov
Lock extended: expires in 8h`}
      />

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Best Practices</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Lock files before editing, unlock immediately after</li>
            <li>Always provide a reason so team knows what you&apos;re doing</li>
            <li>Use shorter TTLs for quick edits, longer for complex work</li>
            <li>Check locks before starting work on shared files</li>
          </ul>
        </AlertDescription>
      </Alert>

      <h2>Related Commands</h2>
      <ul>
        <li>
          <Link href="/docs/cli/files">File Commands</Link> - Stage and commit files
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link> - Push and pull changes
        </li>
        <li>
          <Link href="/docs/cli/branches">Branch Commands</Link> - Branching strategies
        </li>
      </ul>
    </div>
  );
}
