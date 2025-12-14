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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FolderTree, Link2, GitFork, Zap } from "lucide-react";

export const metadata: Metadata = {
    title: "Submodules & Monorepos",
    description: "Manage complex projects with submodules and monorepo patterns in Dits",
};

export default function SubmodulesPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Submodules &amp; Monorepos</h1>
            <p className="lead text-xl text-muted-foreground">
                Organize complex projects with multiple repositories or unified monorepos.
                Dits supports both patterns with optimizations for large-scale projects.
            </p>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card className="border-primary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-primary" />
                            Submodules
                        </CardTitle>
                        <CardDescription>
                            Embed external repos in your project
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Independent versioning</li>
                            <li>Shared across projects</li>
                            <li>Pinned to specific commits</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FolderTree className="h-5 w-5 text-primary" />
                            Monorepos
                        </CardTitle>
                        <CardDescription>
                            All code in one repository
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Atomic changes across packages</li>
                            <li>Simplified dependencies</li>
                            <li>Single source of truth</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Submodules</h2>

            <h3>Adding a Submodule</h3>
            <CodeBlock
                language="bash"
                code={`# Add a submodule
$ dits submodule add https://dits.example.com/shared-lib libs/shared
Cloning into 'libs/shared'...
done.

# This creates:
# - libs/shared/ directory with the submodule content
# - .ditsmodules file tracking the submodule

$ cat .ditsmodules
[submodule "libs/shared"]
    path = libs/shared
    url = https://dits.example.com/shared-lib`}
            />

            <h3>Cloning with Submodules</h3>
            <CodeBlock
                language="bash"
                code={`# Clone and init submodules in one command
$ dits clone --recurse-submodules https://dits.example.com/main-project

# Or init after cloning
$ dits clone https://dits.example.com/main-project
$ cd main-project
$ dits submodule init
$ dits submodule update`}
            />

            <h3>Updating Submodules</h3>
            <CodeBlock
                language="bash"
                code={`# Update all submodules to their tracked commits
$ dits submodule update

# Update to latest remote commits
$ dits submodule update --remote

# Update specific submodule
$ dits submodule update --remote libs/shared

# Pull latest for all submodules
$ dits submodule foreach 'dits pull origin main'`}
            />

            <h3>Working Inside Submodules</h3>
            <CodeBlock
                language="bash"
                code={`# Make changes in submodule
$ cd libs/shared
$ dits checkout -b feature/update
# ... make changes ...
$ dits commit -m "Update shared lib"
$ dits push origin feature/update

# Back in main project, update reference
$ cd ../..
$ dits add libs/shared
$ dits commit -m "Update shared-lib to latest"
$ dits push origin main`}
            />

            <Alert className="not-prose my-6">
                <GitFork className="h-4 w-4" />
                <AlertTitle>Submodule Commits</AlertTitle>
                <AlertDescription>
                    Submodules track specific commits, not branches. When you update a submodule,
                    commit the change to record the new commit reference.
                </AlertDescription>
            </Alert>

            <h3>Removing Submodules</h3>
            <CodeBlock
                language="bash"
                code={`# Remove submodule
$ dits submodule deinit libs/shared
$ dits rm libs/shared
$ rm -rf .dits/modules/libs/shared

$ dits commit -m "Remove shared-lib submodule"`}
            />

            <h2>Monorepo Structure</h2>

            <p>
                For projects where you want everything in one repository:
            </p>

            <CodeBlock
                language="bash"
                code={`# Typical monorepo structure
my-project/
├── apps/
│   ├── web/          # Web application
│   ├── mobile/       # Mobile app
│   └── cli/          # Command-line tool
├── packages/
│   ├── core/         # Shared core library
│   ├── ui/           # UI component library
│   └── utils/        # Utility functions
├── assets/
│   ├── images/       # Shared images
│   └── videos/       # Video content
├── tools/
│   └── scripts/      # Build scripts
├── dits.toml
└── package.json`}
            />

            <h3>Sparse Checkout for Monorepos</h3>
            <p>
                Work on just the parts you need without downloading the entire repo:
            </p>

            <CodeBlock
                language="bash"
                code={`# Clone metadata only
$ dits clone --filter blob:none https://dits.example.com/monorepo
$ cd monorepo

# Enable sparse checkout
$ dits sparse-checkout init --cone

# Check out only what you need
$ dits sparse-checkout set apps/web packages/core packages/ui

# Now only these directories have content
$ ls apps/
web/  # Only web is present

# Add more paths later
$ dits sparse-checkout add assets/images

# Show current sparse paths
$ dits sparse-checkout list
apps/web
packages/core
packages/ui
assets/images`}
            />

            <h3>Monorepo with VFS</h3>
            <p>
                For very large monorepos, use VFS mounting for instant access:
            </p>

            <CodeBlock
                language="bash"
                code={`# Clone metadata only
$ dits clone --filter blob:none https://dits.example.com/huge-monorepo
$ cd huge-monorepo

# Mount entire repo - files load on demand
$ dits mount /mnt/project

# Access any file instantly
$ ls /mnt/project/apps/web/
# Files appear immediately, content streams when accessed

# Work normally - your editor sees regular files
$ code /mnt/project/apps/web/`}
            />

            <Alert className="not-prose my-6">
                <Zap className="h-4 w-4" />
                <AlertTitle>Best of Both Worlds</AlertTitle>
                <AlertDescription>
                    Dits monorepos combine the organizational benefits of a single repo with
                    the efficiency of only downloading what you need through sparse checkout and VFS.
                </AlertDescription>
            </Alert>

            <h2>Path-Based Permissions</h2>
            <p>
                Control access to different parts of your monorepo:
            </p>

            <CodeBlock
                language="bash"
                code={`# .dits/access.toml
[permissions]
# Default: read for all authenticated users
default = "read"

# Write access by path
[permissions.write]
"apps/web" = ["web-team", "leads"]
"apps/mobile" = ["mobile-team", "leads"]
"packages/*" = ["core-team", "leads"]
"assets/videos" = ["content-team"]

# Admin access
[permissions.admin]
"*" = ["leads", "devops"]`}
            />

            <h2>When to Use Which</h2>

            <div className="overflow-x-auto my-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Scenario</TableHead>
                            <TableHead>Recommendation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>Shared library across projects</TableCell>
                            <TableCell>Submodule</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>External dependency you fork</TableCell>
                            <TableCell>Submodule</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Tightly coupled applications</TableCell>
                            <TableCell>Monorepo</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Atomic refactors across packages</TableCell>
                            <TableCell>Monorepo</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Independent release cycles</TableCell>
                            <TableCell>Submodule or separate repos</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Game + assets + tools</TableCell>
                            <TableCell>Monorepo with sparse checkout</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/cli/repository">Repository Commands</Link> - Clone and init</li>
                <li><Link href="/docs/cli/vfs">VFS Commands</Link> - Virtual filesystem mounting</li>
                <li><Link href="/docs/guides/large-files">Large Files Guide</Link> - Binary asset management</li>
            </ul>
        </div>
    );
}
