import { Metadata } from "next";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { CodeBlock } from "@/components/ui/code-block";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowRight, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Migration from Git",
    description: "Complete guide to migrating your repositories from Git to Dits",
};

export default function MigrationPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <DocPageHeader
                eyebrow="Guides"
                title="Migrating from Git to Dits"
                description="A step-by-step guide to migrating your Git repositories to Dits while preserving history and maximizing the benefits of content-addressed storage."
            />

            <Callout type="tip" title="Familiar Commands" className="not-prose my-6">
                Dits commands are designed to be familiar to Git users. Most workflows
                transfer directly with minimal changes.
            </Callout>

            <h2>Migration Options</h2>

            <div className="not-prose grid gap-6 md:grid-cols-2 my-8">
                <Card className="border-brand/40 bg-brand/5">
                    <CardHeader>
                        <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                            <ArrowRight className="size-5 text-brand" />
                        </div>
                        <CardTitle className="text-base text-brand">Quick Start (New Repo)</CardTitle>
                        <CardDescription>
                            Start fresh, import history later if needed
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">Best for:</p>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>Projects with large binary files</li>
                            <li>When Git history isn&apos;t critical</li>
                            <li>Fastest migration path</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-brand/10">
                            <ArrowRight className="size-5 text-brand" />
                        </div>
                        <CardTitle className="text-base">Full History Import</CardTitle>
                        <CardDescription>
                            Preserve complete Git history in Dits
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">Best for:</p>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>When history is valuable</li>
                            <li>Compliance requirements</li>
                            <li>Long-running projects</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Quick Start Migration</h2>
            <p>For projects where you want to start fresh with Dits:</p>

            <CodeBlock
                language="bash"
                code={`# 1. Initialize new Dits repo alongside existing project
cd your-project
dits init

# 2. Copy your .gitignore to .ditsignore
cp .gitignore .ditsignore

# 3. Add all files
dits add .

# 4. Create initial commit
dits commit -m "Initial commit: migrated from Git"

# 5. Add remote and push
dits remote add origin https://dits.example.com/your-project
dits push origin main`}
            />

            <h2>Full History Migration</h2>
            <p>To preserve your complete Git history:</p>

            <CodeBlock
                language="bash"
                code={`# 1. Import Git repository with full history
dits import git ./your-git-repo --full-history

# This will:
# - Convert all Git commits to Dits commits
# - Chunk and deduplicate all file versions
# - Preserve commit messages, authors, and dates
# - Convert Git branches and tags

# 2. Verify the import
dits log --oneline -20  # Check recent commits
dits branch -a          # Check branches
dits tag -l             # Check tags

# 3. Add remote and push
dits remote add origin https://dits.example.com/your-project
dits push origin main --all --tags`}
            />

            <h2>Command Comparison</h2>

            <div className="overflow-x-auto my-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Git Command</TableHead>
                            <TableHead>Dits Equivalent</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-mono">git init</TableCell>
                            <TableCell className="font-mono">dits init</TableCell>
                            <TableCell>Identical</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git clone</TableCell>
                            <TableCell className="font-mono">dits clone</TableCell>
                            <TableCell>Add --filter for sparse</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git add</TableCell>
                            <TableCell className="font-mono">dits add</TableCell>
                            <TableCell>Identical</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git commit</TableCell>
                            <TableCell className="font-mono">dits commit</TableCell>
                            <TableCell>Identical</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git push</TableCell>
                            <TableCell className="font-mono">dits push</TableCell>
                            <TableCell>Identical</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git pull</TableCell>
                            <TableCell className="font-mono">dits pull</TableCell>
                            <TableCell>Identical</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git lfs track</TableCell>
                            <TableCell className="font-mono">(automatic)</TableCell>
                            <TableCell>All files chunked automatically</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">git lfs pull</TableCell>
                            <TableCell className="font-mono">dits mount</TableCell>
                            <TableCell>On-demand access</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <h2>Migrating Git LFS</h2>
            <p>If you&apos;re using Git LFS, Dits handles large files natively:</p>

            <CodeBlock
                language="bash"
                code={`# 1. In your Git repo, fetch all LFS files
git lfs fetch --all

# 2. Import to Dits
dits import git . --full-history --include-lfs

# LFS pointer files are automatically converted
# to regular Dits chunks

# 3. Verify large files
dits ls-files --large  # List files > 10MB`}
            />

            <Callout type="tip" title="No More .gitattributes" className="not-prose my-6">
                Dits doesn&apos;t need special tracking for large files. All files are
                automatically chunked and deduplicated regardless of size.
            </Callout>

            <h2>Configuration Migration</h2>

            <h3>.gitignore → .ditsignore</h3>
            <CodeBlock
                language="bash"
                code={`# Copy your gitignore (syntax is identical)
cp .gitignore .ditsignore

# Or use the same file for both during transition
ln -s .gitignore .ditsignore`}
            />

            <h3>Git Config → Dits Config</h3>
            <CodeBlock
                language="bash"
                code={`# Set user info (same as Git)
dits config --global user.name "Your Name"
dits config --global user.email "you@example.com"

# Set default branch
dits config --global init.defaultBranch main

# Editor preference
dits config --global core.editor "code --wait"`}
            />

            <h2>Team Migration Checklist</h2>

            <div className="not-prose bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Before Migration</h3>
                <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Ensure all team members have pushed their work</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Document current branch structure and release process</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Set up Dits server or Ditshub account</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Install Dits CLI on all team machines</span>
                    </li>
                </ul>

                <h3 className="font-semibold mt-6 mb-4">Migration Steps</h3>
                <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Import repository with full history</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Push to new Dits remote</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Update CI/CD pipelines</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Update documentation and READMEs</span>
                    </li>
                </ul>

                <h3 className="font-semibold mt-6 mb-4">After Migration</h3>
                <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Have team clone fresh from Dits</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Archive old Git repository (read-only)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-1 flex-shrink-0" />
                        <span>Train team on new features (VFS, proxies, P2P)</span>
                    </li>
                </ul>
            </div>

            <Callout type="warning" title="Keep Git Repo as Backup" className="not-prose my-6">
                We recommend keeping your Git repository as a read-only backup for at least
                30 days after migration to ensure everything transferred correctly.
            </Callout>

            <h2>Related Resources</h2>
            <ul>
                <li><Link href="/docs/getting-started">Getting Started</Link> - First steps with Dits</li>
                <li><Link href="/docs/cli-reference">CLI Reference</Link> - Complete command documentation</li>
                <li><Link href="/docs/guides/workflows">Workflows</Link> - Team workflow patterns</li>
            </ul>
        </div>
    );
}
