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
import { Users, User, Building, GitBranch, CheckCircle, Check } from "lucide-react";

export const metadata: Metadata = {
    title: "Workflows - Common Patterns",
    description: "Learn common Dits workflow patterns for solo developers, teams, and enterprises",
};

export default function WorkflowsPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Workflow Patterns</h1>
            <p className="lead text-xl text-muted-foreground">
                Choose the right workflow for your team size and project type.
                From solo projects to enterprise deployments, Dits adapts to your needs.
            </p>

            <h2>Choose Your Workflow</h2>

            <div className="grid gap-6 md:grid-cols-3 my-8">
                <Card className="border-primary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Solo Developer
                        </CardTitle>
                        <CardDescription>
                            Simple linear workflow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Single branch workflow</li>
                            <li>Direct commits to main</li>
                            <li>Minimal overhead</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Small Team
                        </CardTitle>
                        <CardDescription>
                            Feature branch workflow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Feature branches</li>
                            <li>Pull request reviews</li>
                            <li>Protected main branch</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-primary" />
                            Enterprise
                        </CardTitle>
                        <CardDescription>
                            Gitflow-style workflow
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Release branches</li>
                            <li>Hotfix process</li>
                            <li>Multiple environments</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="solo" className="not-prose my-8">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="solo">Solo Developer</TabsTrigger>
                    <TabsTrigger value="team">Small Team</TabsTrigger>
                    <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
                </TabsList>

                <TabsContent value="solo" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Simple Linear Workflow</CardTitle>
                            <CardDescription>
                                Perfect for personal projects and solo work
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Work directly on main, commit frequently, and sync when needed.
                            </p>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Daily workflow
dits status                    # Check what's changed
dits add .                     # Stage all changes
dits commit -m "Update hero section"
dits push origin main          # Sync with remote

# Work on a new feature (optional branching)
dits checkout -b new-feature   # Create branch if needed
# ... make changes ...
dits commit -m "Add feature"
dits checkout main
dits merge new-feature
dits push origin main`}</code></pre>
                        </CardContent>
                    </Card>

                    <div className="bg-muted p-6 rounded-lg">
                        <h4 className="font-semibold mb-3">When to use this workflow:</h4>
                        <ul className="text-sm space-y-1">
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Personal projects</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Early prototyping</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Documentation repos</li>
                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Configuration files</li>
                        </ul>
                    </div>
                </TabsContent>

                <TabsContent value="team" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Branch Workflow</CardTitle>
                            <CardDescription>
                                Collaborative workflow with code review
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Each feature gets its own branch. Changes are reviewed before merging to main.
                            </p>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Start new feature
dits checkout main
dits pull origin main                    # Get latest
dits checkout -b feature/video-export    # Create feature branch

# Work on feature
# ... make changes ...
dits add .
dits commit -m "feat(video): add export to MP4"
dits push origin feature/video-export

# Create pull request on Ditshub
# Team reviews and approves

# After approval, merge
dits checkout main
dits pull origin main
dits merge feature/video-export
dits push origin main
dits branch -d feature/video-export      # Clean up`}</code></pre>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="bg-muted p-6 rounded-lg">
                            <h4 className="font-semibold mb-3">Branch Naming Convention:</h4>
                            <ul className="text-sm space-y-1">
                                <li><code>feature/description</code> - New features</li>
                                <li><code>fix/description</code> - Bug fixes</li>
                                <li><code>docs/description</code> - Documentation</li>
                                <li><code>refactor/description</code> - Code cleanup</li>
                            </ul>
                        </div>

                        <div className="bg-muted p-6 rounded-lg">
                            <h4 className="font-semibold mb-3">Commit Message Format:</h4>
                            <ul className="text-sm space-y-1">
                                <li><code>feat(scope): description</code></li>
                                <li><code>fix(scope): description</code></li>
                                <li><code>docs(scope): description</code></li>
                                <li><code>chore(scope): description</code></li>
                            </ul>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="enterprise" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gitflow-Style Workflow</CardTitle>
                            <CardDescription>
                                Structured workflow for release management
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Branch structure:
# main        - Production-ready code
# develop     - Integration branch
# feature/*   - New features
# release/*   - Release preparation
# hotfix/*    - Emergency fixes

# Start new feature
dits checkout develop
dits pull origin develop
dits checkout -b feature/timeline-editor

# ... develop feature ...
dits commit -m "feat(timeline): add multi-track editing"
dits push origin feature/timeline-editor

# After review, merge to develop
dits checkout develop
dits merge feature/timeline-editor
dits push origin develop

# Prepare release
dits checkout -b release/2.0.0
# ... version bumps, final testing ...
dits commit -m "chore: bump version to 2.0.0"

# Release to production
dits checkout main
dits merge release/2.0.0
dits tag -a v2.0.0 -m "Release 2.0.0"
dits push origin main --tags

# Merge back to develop
dits checkout develop
dits merge release/2.0.0
dits push origin develop

# Emergency hotfix
dits checkout main
dits checkout -b hotfix/critical-bug
# ... fix bug ...
dits commit -m "fix: critical security issue"
dits checkout main
dits merge hotfix/critical-bug
dits tag -a v2.0.1 -m "Hotfix 2.0.1"
dits push origin main --tags`}</code></pre>
                        </CardContent>
                    </Card>

                    <div className="bg-muted p-6 rounded-lg">
                        <h4 className="font-semibold mb-3">Branch Protection Rules:</h4>
                        <ul className="text-sm space-y-2">
                            <li><strong>main:</strong> Requires 2 approvals, CI must pass, no force push</li>
                            <li><strong>develop:</strong> Requires 1 approval, CI must pass</li>
                            <li><strong>release/*:</strong> Requires QA approval before merge to main</li>
                        </ul>
                    </div>
                </TabsContent>
            </Tabs>

            <h2>Video/Creative Workflow</h2>
            <p>
                Special considerations for video production and creative projects:
            </p>

            <CodeBlock
                language="bash"
                code={`# Creative project workflow

# Clone with sparse checkout (metadata only)
dits clone --filter blob:none https://dits.example.com/film-project
cd film-project

# Mount for instant access to all files
dits mount /mnt/project

# Work on your section
dits checkout -b edit/scene-05

# Your NLE saves to mounted location
# Dits tracks changes automatically

# Commit when you hit a milestone
dits add .
dits commit -m "edit(scene-05): rough cut complete"

# Generate proxies for team review
dits proxy create renders/*.mov

# Push for team to see
dits push origin edit/scene-05

# Daily sync with team
dits fetch origin
dits merge origin/main  # Get latest from main`}
            />

            <Alert className="not-prose my-6">
                <GitBranch className="h-4 w-4" />
                <AlertTitle>P2P Collaboration</AlertTitle>
                <AlertDescription>
                    For real-time collaboration without a central server, use P2P sync:
                    <code className="block mt-2">dits p2p sync --with teammate-ip:9001</code>
                </AlertDescription>
            </Alert>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/cli/branches">Branch Commands</Link> - Branch management</li>
                <li><Link href="/docs/cli/remotes">Remote Commands</Link> - Syncing with remotes</li>
                <li><Link href="/docs/guides/collaboration">Collaboration Guide</Link> - Team workflows</li>
                <li><Link href="/docs/concepts/branching">Branching Concepts</Link> - How branching works</li>
            </ul>
        </div>
    );
}
