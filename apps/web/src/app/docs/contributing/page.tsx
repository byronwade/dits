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
import { GitBranch, Code, FileText, Bug, Heart, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Contributing to Dits",
    description: "Learn how to contribute to Dits - code, documentation, and community",
};

export default function ContributingPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Contributing to Dits</h1>
            <p className="lead text-xl text-muted-foreground">
                We welcome contributions from the community! Whether you&apos;re fixing bugs,
                adding features, or improving documentation, your help makes Dits better.
            </p>

            <Alert className="not-prose my-6">
                <Heart className="h-4 w-4" />
                <AlertTitle>Thank You!</AlertTitle>
                <AlertDescription>
                    Every contribution, no matter how small, helps improve Dits for everyone.
                    We appreciate your time and effort.
                </AlertDescription>
            </Alert>

            <h2>Ways to Contribute</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5 text-primary" />
                            Code Contributions
                        </CardTitle>
                        <CardDescription>
                            Fix bugs, add features, improve performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Bug fixes and patches</li>
                            <li>New features and enhancements</li>
                            <li>Performance optimizations</li>
                            <li>Test coverage improvements</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Documentation
                        </CardTitle>
                        <CardDescription>
                            Help others understand and use Dits
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Fix typos and errors</li>
                            <li>Add examples and tutorials</li>
                            <li>Improve explanations</li>
                            <li>Translate documentation</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bug className="h-5 w-5 text-primary" />
                            Bug Reports
                        </CardTitle>
                        <CardDescription>
                            Help us identify and fix issues
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Report bugs with details</li>
                            <li>Provide reproduction steps</li>
                            <li>Share system information</li>
                            <li>Test fixes and verify</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5 text-primary" />
                            Community
                        </CardTitle>
                        <CardDescription>
                            Help grow and support the community
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Answer questions</li>
                            <li>Share your use cases</li>
                            <li>Write blog posts</li>
                            <li>Give talks about Dits</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Getting Started</h2>

            <h3>1. Fork and Clone</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/dits.git
cd dits

# Add upstream remote
git remote add upstream https://github.com/byronwade/dits.git`}</code></pre>

            <h3>2. Set Up Development Environment</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start development server
npm run dev`}</code></pre>

            <h3>3. Create a Branch</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Create a feature branch
git checkout -b feature/my-awesome-feature

# Or a bug fix branch
git checkout -b fix/issue-123`}</code></pre>

            <h2>Pull Request Guidelines</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Before Submitting</h3>
                <ul className="space-y-2 list-disc list-inside">
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>Ensure all tests pass with <code>npm run test</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>Run linting with <code>npm run lint</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>Add tests for new functionality</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>Update documentation if needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>Write a clear commit message</span>
                    </li>
                </ul>
            </div>

            <h3>Commit Message Format</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Format: <type>(<scope>): <description>

feat(cli): add support for remote pruning
fix(storage): resolve race condition in chunk upload
docs(api): add examples for webhook configuration
test(core): add unit tests for chunking algorithm
chore(deps): update dependencies`}</code></pre>

            <h2>Code Style</h2>

            <ul>
                <li>Follow the existing code style</li>
                <li>Use TypeScript for all new code</li>
                <li>Write descriptive variable and function names</li>
                <li>Add JSDoc comments for public APIs</li>
                <li>Keep functions small and focused</li>
            </ul>

            <h2>Review Process</h2>

            <ol>
                <li><strong>Submit PR:</strong> Create a pull request with a clear description</li>
                <li><strong>CI Checks:</strong> Automated tests will run</li>
                <li><strong>Code Review:</strong> Maintainers will review your changes</li>
                <li><strong>Feedback:</strong> Address any requested changes</li>
                <li><strong>Merge:</strong> Once approved, your PR will be merged</li>
            </ol>

            <Alert className="not-prose my-6">
                <GitBranch className="h-4 w-4" />
                <AlertTitle>Need Help?</AlertTitle>
                <AlertDescription>
                    If you&apos;re stuck or have questions, don&apos;t hesitate to ask! Open a
                    discussion on GitHub or reach out in our community channels.
                </AlertDescription>
            </Alert>

            <h2>Related Resources</h2>

            <ul>
                <li><Link href="/docs/development">Development Setup Guide</Link></li>
                <li><Link href="/docs/code-of-conduct">Code of Conduct</Link></li>
                <li><Link href="https://github.com/byronwade/dits">GitHub Repository</Link></li>
                <li><Link href="https://github.com/byronwade/dits/issues">Issue Tracker</Link></li>
            </ul>
        </div>
    );
}
