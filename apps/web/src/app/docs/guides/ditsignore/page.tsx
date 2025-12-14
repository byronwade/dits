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
import { FileX, Info, CheckCircle, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
    title: "Ditsignore - Ignoring Files",
    description: "Learn how to ignore files and directories in Dits repositories",
};

export default function DitsignorePage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Ignoring Files with .ditsignore</h1>
            <p className="lead text-xl text-muted-foreground">
                Control which files Dits tracks by specifying patterns in a .ditsignore file.
                Keep your repository clean by excluding build artifacts, temporary files, and sensitive data.
            </p>

            <Alert className="not-prose my-6">
                <Info className="h-4 w-4" />
                <AlertTitle>Similar to .gitignore</AlertTitle>
                <AlertDescription>
                    If you&apos;re familiar with Git, .ditsignore uses the same pattern syntax as .gitignore.
                    You can often use your existing .gitignore as a starting point.
                </AlertDescription>
            </Alert>

            <h2>Creating a .ditsignore File</h2>
            <p>Create a file named <code>.ditsignore</code> in your repository root:</p>

            <CodeBlock
                language="bash"
                code={`# Create .ditsignore
touch .ditsignore

# Or copy from your existing .gitignore
cp .gitignore .ditsignore`}
            />

            <h2>Pattern Syntax</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileX className="h-5 w-5 text-primary" />
                            Basic Patterns
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg text-sm overflow-x-auto"><code>{`# Ignore specific file
secret.key

# Ignore by extension
*.log
*.tmp
*.cache

# Ignore directory
node_modules/
build/
dist/

# Ignore files in any directory
**/debug.log`}</code></pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Negation Patterns
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg text-sm overflow-x-auto"><code>{`# Ignore all .log files
*.log

# But track important.log
!important.log

# Ignore build/ but keep build/readme
build/
!build/readme.md`}</code></pre>
                    </CardContent>
                </Card>
            </div>

            <h2>Pattern Reference</h2>

            <div className="overflow-x-auto my-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pattern</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Example Matches</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-mono">*.ext</TableCell>
                            <TableCell>All files with extension</TableCell>
                            <TableCell>file.ext, dir/file.ext</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">dir/</TableCell>
                            <TableCell>Directory and contents</TableCell>
                            <TableCell>dir/*, dir/sub/*</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">**/file</TableCell>
                            <TableCell>File in any directory</TableCell>
                            <TableCell>file, a/file, a/b/file</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">dir/**/file</TableCell>
                            <TableCell>File in dir or subdirs</TableCell>
                            <TableCell>dir/file, dir/a/b/file</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">!pattern</TableCell>
                            <TableCell>Negate (don&apos;t ignore)</TableCell>
                            <TableCell>Track despite earlier rule</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">[abc]</TableCell>
                            <TableCell>Character class</TableCell>
                            <TableCell>a, b, or c</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">?</TableCell>
                            <TableCell>Single character wildcard</TableCell>
                            <TableCell>file?.txt matches file1.txt</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <h2>Common Templates</h2>

            <h3>Node.js / JavaScript</h3>
            <CodeBlock
                language="bash"
                code={`# Dependencies
node_modules/
package-lock.json

# Build output
dist/
build/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db`}
            />

            <h3>Video Production</h3>
            <CodeBlock
                language="bash"
                code={`# Render outputs (re-generate from project)
renders/
exports/
*.mp4
*.mov

# Cache files
*.peak
*.pkf
Media Cache/

# Proxies (managed by Dits proxy system)
proxies/

# Keep project files
!*.prproj
!*.aep
!*.drp`}
            />

            <h3>Game Development</h3>
            <CodeBlock
                language="bash"
                code={`# Build outputs
Build/
Builds/
*.exe
*.app

# Cache
Library/
Temp/
obj/

# IDE
.vs/
*.csproj.user

# Keep assets
!Assets/**/*.fbx
!Assets/**/*.png`}
            />

            <h2>Checking Ignored Files</h2>

            <CodeBlock
                language="bash"
                code={`# Check if a file is ignored
$ dits check-ignore myfile.log
myfile.log

# See which rule ignores a file
$ dits check-ignore -v myfile.log
.ditsignore:5:*.log    myfile.log

# List all ignored files
$ dits status --ignored`}
            />

            <h2>Global Ignore File</h2>
            <p>
                Create a global ignore file for patterns that apply to all your repositories:
            </p>

            <CodeBlock
                language="bash"
                code={`# Set global ignore file
dits config --global core.excludesfile ~/.ditsignore_global

# Add common patterns
echo ".DS_Store" >> ~/.ditsignore_global
echo "Thumbs.db" >> ~/.ditsignore_global
echo "*.swp" >> ~/.ditsignore_global`}
            />

            <Alert className="not-prose my-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Already Tracked Files</AlertTitle>
                <AlertDescription>
                    Adding a file to .ditsignore won&apos;t remove it if it&apos;s already tracked.
                    Use <code>dits rm --cached filename</code> to untrack it first.
                </AlertDescription>
            </Alert>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/cli/files">File Commands</Link> - Managing tracked files</li>
                <li><Link href="/docs/configuration">Configuration</Link> - Global settings</li>
                <li><Link href="/docs/guides/large-files">Large Files Guide</Link> - Handling big assets</li>
            </ul>
        </div>
    );
}
