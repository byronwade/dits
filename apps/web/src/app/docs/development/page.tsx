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
import { Terminal, Code, Settings, CheckCircle, Zap } from "lucide-react";

export const metadata: Metadata = {
    title: "Development Setup",
    description: "Set up your development environment for contributing to Dits",
};

export default function DevelopmentPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Development Setup</h1>
            <p className="lead text-xl text-muted-foreground">
                Set up your local development environment to contribute to Dits.
                This guide covers everything from cloning the repo to running tests.
            </p>

            <Alert className="not-prose my-6">
                <Zap className="h-4 w-4" />
                <AlertTitle>Quick Setup</AlertTitle>
                <AlertDescription>
                    Most developers can be up and running in under 10 minutes.
                </AlertDescription>
            </Alert>

            <h2>Prerequisites</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2">
                            <li><strong>Node.js 18+</strong> - JavaScript runtime</li>
                            <li><strong>npm 9+</strong> - Package manager</li>
                            <li><strong>Git 2.30+</strong> - Version control</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recommended</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2">
                            <li><strong>VS Code</strong> - Editor with extensions</li>
                            <li><strong>Docker</strong> - For integration tests</li>
                            <li><strong>PostgreSQL</strong> - Local database</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Initial Setup</h2>

            <h3>1. Clone the Repository</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Clone your fork
git clone https://github.com/YOUR_USERNAME/dits.git
cd dits

# Add upstream remote
git remote add upstream https://github.com/byronwade/dits.git

# Fetch all branches
git fetch --all`}</code></pre>

            <h3>2. Install Dependencies</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Install all dependencies
npm install

# This will install dependencies for:
# - Root workspace
# - All packages/*
# - All apps/*`}</code></pre>

            <h3>3. Build the Project</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Build all packages
npm run build

# Or build specific package
npm run build -w @dits/core
npm run build -w @dits/cli`}</code></pre>

            <h2>Project Structure</h2>

            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`dits/
├── apps/
│   ├── web/          # Documentation website (Next.js)
│   └── cli/          # Command-line interface
├── packages/
│   ├── core/         # Core library
│   ├── storage/      # Storage backends
│   ├── network/      # Network protocols
│   └── shared/       # Shared utilities
├── tests/
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   └── e2e/          # End-to-end tests
└── docs/             # Additional documentation`}</code></pre>

            <h2>Development Commands</h2>

            <Tabs defaultValue="common" className="not-prose my-8">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="common">Common</TabsTrigger>
                    <TabsTrigger value="testing">Testing</TabsTrigger>
                    <TabsTrigger value="packages">Packages</TabsTrigger>
                </TabsList>

                <TabsContent value="common" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5" />
                                Common Commands
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run dev</code>
                                    <span className="text-sm text-muted-foreground">Start development mode</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run build</code>
                                    <span className="text-sm text-muted-foreground">Build all packages</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run lint</code>
                                    <span className="text-sm text-muted-foreground">Run linting</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run format</code>
                                    <span className="text-sm text-muted-foreground">Format code</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run clean</code>
                                    <span className="text-sm text-muted-foreground">Clean build artifacts</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="testing" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                Testing Commands
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run test</code>
                                    <span className="text-sm text-muted-foreground">Run all tests</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run test:unit</code>
                                    <span className="text-sm text-muted-foreground">Run unit tests</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run test:integration</code>
                                    <span className="text-sm text-muted-foreground">Run integration tests</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run test:e2e</code>
                                    <span className="text-sm text-muted-foreground">Run end-to-end tests</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run test:coverage</code>
                                    <span className="text-sm text-muted-foreground">Generate coverage report</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="packages" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Package Commands
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run build -w @dits/core</code>
                                    <span className="text-sm text-muted-foreground">Build core package</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run test -w @dits/cli</code>
                                    <span className="text-sm text-muted-foreground">Test CLI package</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <code className="text-sm">npm run dev -w apps/web</code>
                                    <span className="text-sm text-muted-foreground">Start docs site</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <h2>VS Code Setup</h2>

            <h3>Recommended Extensions</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}`}</code></pre>

            <h3>Workspace Settings</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}`}</code></pre>

            <h2>Debugging</h2>

            <h3>VS Code Launch Configuration</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "\${workspaceFolder}/apps/cli/src/index.ts",
      "args": ["status"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "\${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal"
    }
  ]
}`}</code></pre>

            <h2>Troubleshooting</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Common Issues</h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium">Build fails with TypeScript errors</h4>
                        <p className="text-sm text-muted-foreground">
                            Try running <code>npm run clean && npm run build</code> to clear caches.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium">Dependencies not found</h4>
                        <p className="text-sm text-muted-foreground">
                            Run <code>npm install</code> from the root directory to install all workspace dependencies.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium">Tests timing out</h4>
                        <p className="text-sm text-muted-foreground">
                            Some integration tests require Docker. Ensure Docker is running.
                        </p>
                    </div>
                </div>
            </div>

            <Alert className="not-prose my-6">
                <Settings className="h-4 w-4" />
                <AlertTitle>Need Help?</AlertTitle>
                <AlertDescription>
                    If you encounter issues, check our <Link href="/docs/troubleshooting" className="underline">troubleshooting guide</Link> or
                    ask in GitHub Discussions.
                </AlertDescription>
            </Alert>
        </div>
    );
}
