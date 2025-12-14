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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Users, Share2, Lock, MessageSquare, Shield, Wifi } from "lucide-react";

export const metadata: Metadata = {
    title: "Team Collaboration",
    description: "Best practices for team collaboration with Dits",
};

export default function CollaborationPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Team Collaboration</h1>
            <p className="lead text-xl text-muted-foreground">
                Effective strategies for teams working together on creative projects.
                From small studios to enterprise productions, Dits scales with your team.
            </p>

            <h2>Collaboration Models</h2>

            <div className="grid gap-6 md:grid-cols-3 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-primary" />
                            Centralized
                        </CardTitle>
                        <CardDescription>
                            Single server, structured workflow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Central Ditshub server</li>
                            <li>Branch protection rules</li>
                            <li>Code review process</li>
                            <li>CI/CD integration</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-primary" />
                            Peer-to-Peer
                        </CardTitle>
                        <CardDescription>
                            Direct sharing without server
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Direct machine sync</li>
                            <li>No central dependency</li>
                            <li>Great for on-set work</li>
                            <li>Mesh network support</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Hybrid
                        </CardTitle>
                        <CardDescription>
                            Best of both worlds
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Central for main branches</li>
                            <li>P2P for daily syncs</li>
                            <li>Offline capable</li>
                            <li>Flexible topology</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Setting Up Team Access</h2>

            <Tabs defaultValue="ditshub" className="not-prose my-8">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ditshub">Ditshub (Hosted)</TabsTrigger>
                    <TabsTrigger value="selfhost">Self-Hosted</TabsTrigger>
                </TabsList>

                <TabsContent value="ditshub" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ditshub Team Setup</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-4">
                                <li>
                                    <strong>1. Create Organization</strong>
                                    <p className="text-sm text-muted-foreground">
                                        Create an organization on Ditshub to manage team access and billing.
                                    </p>
                                </li>
                                <li>
                                    <strong>2. Invite Team Members</strong>
                                    <CodeBlock
                                        language="bash"
                                        code={`# From web UI or CLI
dits org invite alice@team.com --role editor
dits org invite bob@team.com --role viewer`}
                                    />
                                </li>
                                <li>
                                    <strong>3. Create Repository</strong>
                                    <CodeBlock
                                        language="bash"
                                        code={`# Create private team repo
dits create myorg/project --private

# Or push existing repo
dits remote add origin https://ditshub.com/myorg/project
dits push -u origin main`}
                                    />
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="selfhost" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Self-Hosted Server</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CodeBlock
                                language="bash"
                                code={`# Deploy Dits server
docker run -d \\
  -p 9000:9000 \\
  -v /data/dits:/data \\
  -e DITS_ADMIN_USER=admin \\
  -e DITS_ADMIN_PASS=secure-password \\
  dits/server:latest

# Configure authentication
dits server config set auth.type ldap
dits server config set auth.ldap.url ldap://your-ldap-server

# Create teams
dits server team create editors
dits server team add-member editors alice
dits server team add-member editors bob`}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <h2>File Locking</h2>

            <p>
                For binary files that can&apos;t be merged, use file locking to prevent conflicts:
            </p>

            <CodeBlock
                language="bash"
                code={`# Lock a file before editing
$ dits lock project.prproj
Locked 'project.prproj' for editing.

# Check lock status
$ dits locks
Locked files:
  project.prproj    (you)      2 hours ago
  assets/hero.psd   (alice)    30 min ago

# Try to lock already-locked file
$ dits lock assets/hero.psd
Error: File is locked by alice@team.com
Locked 30 minutes ago with message: "Editing hero image"

# Unlock when done
$ dits unlock project.prproj
Unlocked 'project.prproj'.`}
            />

            <Alert className="not-prose my-6">
                <Lock className="h-4 w-4" />
                <AlertTitle>Lock Best Practices</AlertTitle>
                <AlertDescription>
                    Lock files before starting work. Include a message explaining what you&apos;re
                    doing. Unlock as soon as you&apos;re done, even if you haven&apos;t committed yet.
                </AlertDescription>
            </Alert>

            <h2>Real-Time Sync with P2P</h2>

            <CodeBlock
                language="bash"
                code={`# Enable P2P discovery on local network
$ dits p2p start
P2P node started
  Peer ID: QmYb2...xyz
  Listening: 0.0.0.0:9001

# Discover teammates
$ dits p2p discover
Found peers:
  alice-macbook (QmAbc...) - 192.168.1.10
  bob-workstation (QmDef...) - 192.168.1.11

# Sync directly with peer
$ dits p2p sync alice-macbook
Syncing with alice-macbook...
  Receiving: 45 chunks (234 MB)
  Sending: 12 chunks (56 MB)
Sync complete.

# Auto-sync mode
$ dits p2p auto-sync --interval 5m
Auto-sync enabled every 5 minutes.`}
            />

            <h2>Conflict Resolution</h2>

            <CodeBlock
                language="bash"
                code={`# Pull with potential conflicts
$ dits pull origin main
Auto-merging src/config.json
CONFLICT: assets/layout.psd modified by both

# Check conflict status
$ dits status
Unmerged paths:
  both modified: assets/layout.psd

# For binary files, choose a version
$ dits checkout --ours assets/layout.psd    # Keep yours
$ dits checkout --theirs assets/layout.psd  # Take theirs

# Or keep both
$ dits checkout --ours assets/layout.psd
$ mv assets/layout.psd assets/layout-mine.psd
$ dits checkout --theirs assets/layout.psd
$ mv assets/layout.psd assets/layout-theirs.psd
# Manually merge in your editor

# Mark as resolved
$ dits add assets/layout.psd
$ dits commit -m "Resolve layout conflict"`}
            />

            <h2>Communication Integration</h2>

            <CodeBlock
                language="bash"
                code={`# Configure Slack notifications
$ dits config hooks.slack.webhook "https://hooks.slack.com/..."

# Notify on important events
$ cat .dits/hooks/post-push
#!/bin/bash
curl -X POST -H 'Content-type: application/json' \\
  --data "{
    \\"text\\": \\"$USER pushed to $BRANCH: $(dits log -1 --format=%s)\\"
  }" \\
  "$SLACK_WEBHOOK_URL"

# Use dits notes for in-repo discussions
$ dits notes add -m "Needs color correction review" abc1234
$ dits notes show abc1234
Notes from you:
  Needs color correction review`}
            />

            <h2>Access Control</h2>

            <div className="overflow-x-auto my-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Role</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead>Use Case</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-semibold">Admin</TableCell>
                            <TableCell>Full control, settings, delete</TableCell>
                            <TableCell>Project leads, IT</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Maintainer</TableCell>
                            <TableCell>Push to main, merge PRs</TableCell>
                            <TableCell>Senior team members</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Editor</TableCell>
                            <TableCell>Push branches, create PRs</TableCell>
                            <TableCell>Regular contributors</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-semibold">Viewer</TableCell>
                            <TableCell>Read-only access</TableCell>
                            <TableCell>Clients, stakeholders</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <Alert className="not-prose my-6">
                <Shield className="h-4 w-4" />
                <AlertTitle>Path-Based Permissions</AlertTitle>
                <AlertDescription>
                    Restrict access to sensitive directories. For example, allow editors to
                    modify <code>assets/</code> but not <code>config/</code>.
                </AlertDescription>
            </Alert>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/guides/workflows">Workflow Patterns</Link> - Team workflows</li>
                <li><Link href="/docs/cli/locks">Lock Commands</Link> - File locking</li>
                <li><Link href="/docs/cli/p2p">P2P Commands</Link> - Peer-to-peer sync</li>
                <li><Link href="/docs/deployment">Deployment</Link> - Server setup</li>
            </ul>
        </div>
    );
}
