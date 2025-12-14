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
import { CodeBlock } from "@/components/ui/code-block";
import { Shield, Download, Upload, RotateCcw, Clock, HardDrive } from "lucide-react";

export const metadata: Metadata = {
    title: "Backup & Recovery",
    description: "Disaster recovery procedures and backup strategies for Dits repositories",
};

export default function BackupRecoveryPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Backup &amp; Recovery</h1>
            <p className="lead text-xl text-muted-foreground">
                Protect your repositories with robust backup strategies and know how to
                recover from data loss, corruption, or accidental deletions.
            </p>

            <Alert className="not-prose my-6">
                <Shield className="h-4 w-4" />
                <AlertTitle>Distributed by Design</AlertTitle>
                <AlertDescription>
                    Dits repositories are inherently distributed. Every clone is a full backup.
                    The more team members, the more redundancy you have.
                </AlertDescription>
            </Alert>

            <h2>Backup Strategies</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-primary" />
                            Multiple Remotes
                        </CardTitle>
                        <CardDescription>
                            Push to multiple backup locations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CodeBlock
                            language="bash"
                            code={`# Add backup remotes
dits remote add backup-s3 s3://bucket/repo
dits remote add backup-gcs gs://bucket/repo

# Push to all remotes
dits push --all origin backup-s3 backup-gcs`}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" />
                            Bundle Export
                        </CardTitle>
                        <CardDescription>
                            Create portable backup files
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CodeBlock
                            language="bash"
                            code={`# Export entire repo to file
dits bundle create backup.bundle --all

# Include only recent history
dits bundle create recent.bundle main~100..main`}
                        />
                    </CardContent>
                </Card>
            </div>

            <h2>Automated Backup Script</h2>

            <CodeBlock
                language="bash"
                code={`#!/bin/bash
# backup-repos.sh - Run via cron

BACKUP_DIR="/backups/dits"
DATE=$(date +%Y-%m-%d)

for repo in /repos/*/.dits; do
  REPO_DIR=$(dirname "$repo")
  REPO_NAME=$(basename "$REPO_DIR")
  
  cd "$REPO_DIR"
  
  # Create bundle backup
  dits bundle create "$BACKUP_DIR/$REPO_NAME-$DATE.bundle" --all
  
  # Push to backup remotes
  dits push backup-s3 --all --tags
  
  # Keep only last 30 days locally
  find "$BACKUP_DIR" -name "$REPO_NAME-*.bundle" -mtime +30 -delete
  
  echo "Backed up $REPO_NAME"
done`}
            />

            <h2>Recovery Scenarios</h2>

            <h3>Recover from Bundle</h3>
            <CodeBlock
                language="bash"
                code={`# List bundle contents
$ dits bundle list-heads backup.bundle
refs/heads/main
refs/heads/develop
refs/tags/v1.0.0

# Clone from bundle
$ dits clone backup.bundle restored-repo
$ cd restored-repo

# Re-add remote and sync
$ dits remote add origin https://server/repo
$ dits fetch origin
$ dits push origin --all --tags`}
            />

            <h3>Recover Deleted Branch</h3>
            <CodeBlock
                language="bash"
                code={`# Find the deleted branch in reflog
$ dits reflog
abc1234 HEAD@{0}: checkout: moving from deleted-branch to main
def5678 HEAD@{1}: commit: Last commit on deleted-branch
...

# Restore the branch
$ dits checkout -b deleted-branch def5678
Branch 'deleted-branch' restored.`}
            />

            <h3>Recover Deleted Commits</h3>
            <CodeBlock
                language="bash"
                code={`# Find lost commits
$ dits fsck --lost-found
Checking objects...
dangling commit abc1234: "Important work"
dangling commit def5678: "More changes"

# Recover specific commit
$ dits checkout -b recovered abc1234

# Or cherry-pick to current branch
$ dits cherry-pick abc1234`}
            />

            <h3>Recover from Corrupted Repository</h3>
            <CodeBlock
                language="bash"
                code={`# Check repository integrity
$ dits fsck --full
Checking objects...
error: corrupt object abc1234
error: missing chunk def5678

# Attempt repair from remote
$ dits fetch origin --repair
Fetching missing objects...
  Recovered: abc1234
  Recovered chunk: def5678
Repository repaired.

# If remote not available, use backup
$ dits remote add backup file:///backups/repo.bundle
$ dits fetch backup --repair`}
            />

            <Alert className="not-prose my-6">
                <RotateCcw className="h-4 w-4" />
                <AlertTitle>Chunk-Level Recovery</AlertTitle>
                <AlertDescription>
                    Dits can recover individual corrupted chunks from any source that has them,
                    including team members&apos; machines via P2P.
                </AlertDescription>
            </Alert>

            <h3>Recover Specific File Version</h3>
            <CodeBlock
                language="bash"
                code={`# Find file in history
$ dits log --all -- project.prproj
commit abc1234 (3 days ago)
    Final cut approved

commit def5678 (1 week ago)
    Client revision 2

# Restore file from specific commit
$ dits checkout abc1234 -- project.prproj
Updated 'project.prproj' from commit abc1234

# Or save as different name
$ dits show abc1234:project.prproj > project-backup.prproj`}
            />

            <h2>Reflog - Your Safety Net</h2>

            <CodeBlock
                language="bash"
                code={`# View reflog (30 days history)
$ dits reflog
abc1234 HEAD@{0}: commit: Add new feature
def5678 HEAD@{1}: pull: Fast-forward
111aaa HEAD@{2}: reset: moving to HEAD~3
222bbb HEAD@{3}: commit: Work in progress
...

# Undo last operation
$ dits reset --hard HEAD@{1}
HEAD is now at def5678

# View reflog for specific branch
$ dits reflog show feature/branch

# Increase reflog retention
$ dits config gc.reflogExpire 90.days`}
            />

            <h2>Verification &amp; Health Checks</h2>

            <CodeBlock
                language="bash"
                code={`# Full integrity check
$ dits fsck --full
Checking object directories...
Checking objects...
Checking connectivity...
All objects OK.

# Verify chunk integrity
$ dits verify-chunks
Verified 45,678 chunks. All OK.

# Regular maintenance
$ dits gc
Counting objects: 12,345
Compressing objects: 100%
Removing unreachable objects
Done.

# Check repository size
$ dits count-objects -vH
count: 12,345
size: 2.3 GB
prune-packable: 234
gc: 0 packs`}
            />

            <h2>Best Practices</h2>

            <div className="grid gap-4 md:grid-cols-2 my-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Backup Schedule
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li><strong>Hourly:</strong> Push to backup remote</li>
                            <li><strong>Daily:</strong> Create bundle backup</li>
                            <li><strong>Weekly:</strong> Verify backup integrity</li>
                            <li><strong>Monthly:</strong> Test restore procedure</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Redundancy Rules
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Minimum 3 copies (3-2-1 rule)</li>
                            <li>2 different storage types</li>
                            <li>1 offsite location</li>
                            <li>Test restores regularly</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Disaster Recovery Plan</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Recovery Steps</h3>
                <ol className="space-y-3">
                    <li>
                        <strong>1. Assess damage</strong>
                        <p className="text-sm text-muted-foreground">
                            Run <code>dits fsck --full</code> to identify corruption extent.
                        </p>
                    </li>
                    <li>
                        <strong>2. Try remote repair</strong>
                        <p className="text-sm text-muted-foreground">
                            Use <code>dits fetch origin --repair</code> to recover from central server.
                        </p>
                    </li>
                    <li>
                        <strong>3. P2P recovery</strong>
                        <p className="text-sm text-muted-foreground">
                            If available, use <code>dits p2p sync --repair</code> from team machines.
                        </p>
                    </li>
                    <li>
                        <strong>4. Bundle restore</strong>
                        <p className="text-sm text-muted-foreground">
                            Clone from most recent bundle backup if other methods fail.
                        </p>
                    </li>
                    <li>
                        <strong>5. Verify and resume</strong>
                        <p className="text-sm text-muted-foreground">
                            Run <code>dits fsck</code> again, then resume work.
                        </p>
                    </li>
                </ol>
            </div>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/cli/maintenance">Maintenance Commands</Link> - gc, fsck, prune</li>
                <li><Link href="/docs/deployment">Deployment</Link> - Server backup</li>
                <li><Link href="/docs/architecture/security">Security</Link> - Encryption and access</li>
            </ul>
        </div>
    );
}
