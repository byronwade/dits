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

export const metadata: Metadata = {
    title: "Hooks - Automation",
    description: "Automate workflows with Dits hooks for pre-commit, post-commit, and other events",
};

export default function HooksPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <DocPageHeader
                eyebrow="Guides"
                title="Automation with Hooks"
                description="Hooks let you run custom scripts at key points in the Dits workflow. Automate validation, testing, notifications, and more."
            />

            <Callout type="tip" title="Powerful Automation" className="not-prose my-6">
                Hooks run locally and can execute any script or program.
                Use them to enforce policies, run tests, or integrate with external tools.
            </Callout>

            <h2>Available Hooks</h2>

            <div className="not-prose grid gap-4 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Client-Side Hooks</CardTitle>
                        <CardDescription>Run on your local machine</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                            <li><strong className="text-foreground">pre-commit</strong> - Before creating a commit</li>
                            <li><strong className="text-foreground">prepare-commit-msg</strong> - Before commit message editor</li>
                            <li><strong className="text-foreground">commit-msg</strong> - Validate commit message</li>
                            <li><strong className="text-foreground">post-commit</strong> - After commit is created</li>
                            <li><strong className="text-foreground">pre-push</strong> - Before pushing to remote</li>
                            <li><strong className="text-foreground">post-checkout</strong> - After checkout/switch</li>
                            <li><strong className="text-foreground">post-merge</strong> - After merge completes</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Server-Side Hooks</CardTitle>
                        <CardDescription>Run on the remote server</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                            <li><strong className="text-foreground">pre-receive</strong> - Before accepting push</li>
                            <li><strong className="text-foreground">update</strong> - Per-branch before update</li>
                            <li><strong className="text-foreground">post-receive</strong> - After push is accepted</li>
                            <li><strong className="text-foreground">post-update</strong> - After refs are updated</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Creating Hooks</h2>
            <p>
                Hooks are executable scripts in the <code>.dits/hooks/</code> directory.
                The filename must match the hook name exactly (no extension).
            </p>

            <CodeBlock
                language="bash"
                code={`# Create hooks directory
mkdir -p .dits/hooks

# Create a pre-commit hook
cat > .dits/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linter
npm run lint
if [ $? -ne 0 ]; then
  echo "Lint failed! Fix errors before committing."
  exit 1
fi

# Run tests
npm run test
if [ $? -ne 0 ]; then
  echo "Tests failed! Fix tests before committing."
  exit 1
fi

echo "All checks passed!"
exit 0
EOF

# Make it executable
chmod +x .dits/hooks/pre-commit`}
            />

            <h2>Hook Examples</h2>

            <h3>Pre-commit: Validate Large Files</h3>
            <CodeBlock
                language="bash"
                code={`#!/bin/bash
# Prevent committing files larger than 100MB without proxy

MAX_SIZE=$((100 * 1024 * 1024))  # 100MB in bytes

for file in $(dits diff --cached --name-only); do
  if [ -f "$file" ]; then
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
    if [ "$size" -gt "$MAX_SIZE" ]; then
      echo "ERROR: $file is larger than 100MB"
      echo "Consider using: dits proxy create $file"
      exit 1
    fi
  fi
done

exit 0`}
            />

            <h3>Commit-msg: Enforce Format</h3>
            <CodeBlock
                language="bash"
                code={`#!/bin/bash
# Enforce conventional commit format

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Pattern: type(scope): description
pattern="^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,72}$"

if ! echo "$commit_msg" | head -1 | grep -qE "$pattern"; then
  echo "ERROR: Invalid commit message format"
  echo ""
  echo "Expected format: type(scope): description"
  echo "Types: feat, fix, docs, style, refactor, test, chore"
  echo ""
  echo "Example: feat(video): add timeline scrubbing"
  exit 1
fi

exit 0`}
            />

            <h3>Pre-push: Run Full Test Suite</h3>
            <CodeBlock
                language="bash"
                code={`#!/bin/bash
# Run comprehensive tests before pushing

echo "Running full test suite before push..."

# Run unit tests
npm run test:unit || exit 1

# Run integration tests
npm run test:integration || exit 1

# Verify build succeeds
npm run build || exit 1

echo "All tests passed, proceeding with push."
exit 0`}
            />

            <h3>Post-commit: Send Notification</h3>
            <CodeBlock
                language="bash"
                code={`#!/bin/bash
# Send Slack notification after commit

COMMIT_MSG=$(dits log -1 --format="%s")
AUTHOR=$(dits log -1 --format="%an")
BRANCH=$(dits branch --show-current)

curl -X POST -H 'Content-type: application/json' \\
  --data "{
    \\"text\\": \\"New commit on $BRANCH by $AUTHOR: $COMMIT_MSG\\"
  }" \\
  "$SLACK_WEBHOOK_URL"

exit 0`}
            />

            <h2>Hook Parameters</h2>

            <div className="overflow-x-auto my-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hook</TableHead>
                            <TableHead>Parameters</TableHead>
                            <TableHead>Stdin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-mono">pre-commit</TableCell>
                            <TableCell>None</TableCell>
                            <TableCell>None</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">commit-msg</TableCell>
                            <TableCell>$1 = message file path</TableCell>
                            <TableCell>None</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">pre-push</TableCell>
                            <TableCell>$1 = remote name, $2 = URL</TableCell>
                            <TableCell>ref info</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">post-checkout</TableCell>
                            <TableCell>$1 = prev ref, $2 = new ref, $3 = flag</TableCell>
                            <TableCell>None</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-mono">pre-receive</TableCell>
                            <TableCell>None</TableCell>
                            <TableCell>old-sha new-sha ref</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <h2>Sharing Hooks</h2>
            <p>
                Hooks in <code>.dits/hooks/</code> are not tracked by default. To share hooks with your team:
            </p>

            <CodeBlock
                language="bash"
                code={`# Store hooks in a tracked directory
mkdir -p scripts/hooks
cp .dits/hooks/* scripts/hooks/

# Create setup script
cat > scripts/setup-hooks.sh << 'EOF'
#!/bin/bash
cp scripts/hooks/* .dits/hooks/
chmod +x .dits/hooks/*
echo "Hooks installed!"
EOF

# Team members run after clone
./scripts/setup-hooks.sh`}
            />

            <Callout type="warning" title="Bypass Hooks" className="not-prose my-6">
                Use <code>--no-verify</code> to skip hooks in emergencies:
                <code className="block mt-2">dits commit --no-verify -m &quot;Emergency fix&quot;</code>
            </Callout>

            <h2>Related Topics</h2>
            <ul>
                <li><Link href="/docs/api/webhooks">Server Webhooks</Link> - HTTP-based automation</li>
                <li><Link href="/docs/api/cicd">CI/CD Integration</Link> - Pipeline automation</li>
                <li><Link href="/docs/cli/repository">Repository Commands</Link> - Commit and push</li>
            </ul>
        </div>
    );
}
