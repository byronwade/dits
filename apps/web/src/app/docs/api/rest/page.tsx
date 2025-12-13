import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Server, Key, Database, Users, GitBranch, Webhook, Zap, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "REST API",
  description: "Complete REST API reference for Dits server integration",
};

export default function RestApiPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Dits REST API</h1>
      <p className="lead text-xl text-muted-foreground">
        Programmatic access to Dits repositories, users, and metadata through a comprehensive REST API.
      </p>

      <div className="not-prose bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 my-8">
        <div className="flex items-start gap-4">
          <Server className="h-8 w-8 text-primary mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-2">API Overview</h2>
            <p className="text-muted-foreground mb-4">
              The Dits REST API provides full programmatic access to repository management,
              user administration, and metadata operations. Built for integrations with CI/CD,
              project management tools, and custom workflows.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">100+</div>
                <div className="text-sm text-muted-foreground">API Endpoints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">REST</div>
                <div className="text-sm text-muted-foreground">Architecture</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">JSON</div>
                <div className="text-sm text-muted-foreground">Data Format</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="authentication" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="sdks">SDKs</TabsTrigger>
        </TabsList>

        <TabsContent value="authentication" className="mt-6">
          <h2>Authentication</h2>

          <div className="grid gap-6 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Bearer Tokens
                </CardTitle>
                <CardDescription>For session-based authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded text-sm">
                  <code>{`Authorization: Bearer <session_token>
Content-Type: application/json

# Token expires after 24 hours
# Obtained via POST /auth/login`}</code>
                </pre>
                <p className="text-sm text-muted-foreground mt-3">
                  Use for interactive applications and short-lived sessions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  API Tokens
                </CardTitle>
                <CardDescription>For programmatic access</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded text-sm">
                  <code>{`Authorization: Bearer dits_<api_token>
Content-Type: application/json

# Scoped permissions available
# Created in user settings`}</code>
                </pre>
                <p className="text-sm text-muted-foreground mt-3">
                  Use for CI/CD, integrations, and long-running processes.
                </p>
              </CardContent>
            </Card>
          </div>

          <h3>Authentication Endpoints</h3>
          <div className="not-prose overflow-x-auto my-4">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Method</th>
                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Endpoint</th>
                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2"><code>POST</code></td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2"><code>/auth/login</code></td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Login with username/password</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2"><code>POST</code></td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2"><code>/auth/refresh</code></td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Refresh session token</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2"><code>POST</code></td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2"><code>/auth/logout</code></td>
                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Invalidate session</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="mt-6">
          <h2>API Endpoints</h2>

          <div className="grid gap-6 my-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Repository Management
                </CardTitle>
                <CardDescription>CRUD operations for repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /repos</code>
                    <Badge variant="secondary">Public</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">POST /repos</code>
                    <Badge variant="secondary">Authenticated</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /repos/:id</code>
                    <Badge variant="secondary">Read Access</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">PATCH /repos/:id</code>
                    <Badge variant="secondary">Owner/Admin</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">DELETE /repos/:id</code>
                    <Badge variant="secondary">Owner</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Git Operations
                </CardTitle>
                <CardDescription>Branch, tag, and commit management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /repos/:id/branches</code>
                    <Badge variant="secondary">Read Access</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">POST /repos/:id/branches</code>
                    <Badge variant="secondary">Write Access</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /repos/:id/commits</code>
                    <Badge variant="secondary">Read Access</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /repos/:id/tags</code>
                    <Badge variant="secondary">Read Access</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>User accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /users</code>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /users/:id</code>
                    <Badge variant="secondary">Authenticated</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">POST /users</code>
                    <Badge variant="secondary">Public</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">PATCH /users/:id</code>
                    <Badge variant="secondary">Owner/Admin</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks & Events
                </CardTitle>
                <CardDescription>Real-time notifications and automation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <code className="text-sm">GET /repos/:id/webhooks</code>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">POST /repos/:id/webhooks</code>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm">POST /webhooks/:id/test</code>
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="not-prose my-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Complete API Reference</AlertTitle>
            <AlertDescription>
              For detailed request/response schemas, parameters, and examples,
              see the <Link href="/docs/api/rest-api">full REST API documentation</Link>.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="examples" className="mt-6">
          <h2>API Examples</h2>

          <h3>Create a Repository</h3>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`curl -X POST https://api.dits.io/v1/repos \\
  -H "Authorization: Bearer your_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-project",
    "description": "Video editing project",
    "private": false
  }'`}</code>
          </pre>

          <h3>List Repository Commits</h3>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`curl https://api.dits.io/v1/repos/123/commits \\
  -H "Authorization: Bearer your_token"`}</code>
          </pre>

          <h3>Create a Webhook</h3>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`curl -X POST https://api.dits.io/v1/repos/123/webhooks \\
  -H "Authorization: Bearer your_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/webhook",
    "events": ["push", "pull_request"],
    "secret": "your_webhook_secret"
  }'`}</code>
          </pre>

      <h3>CI/CD Integration Example</h3>
      <pre className="bg-muted p-4 rounded text-sm">
        <code>{`# .github/workflows/deploy.yml
name: Deploy
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Get latest commit from Dits
        run: |
          curl -H "Authorization: Bearer $DITS_TOKEN" \\
               https://api.dits.io/v1/repos/myorg/myrepo/commits/main

      - name: Deploy assets
        run: echo "Deploying assets..."`}</code>
      </pre>
        </TabsContent>

        <TabsContent value="sdks" className="mt-6">
          <h2>SDKs & Libraries</h2>

          <div className="grid gap-4 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle>JavaScript/TypeScript SDK</CardTitle>
                <CardDescription>Official SDK for Node.js and browsers</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded text-sm mb-3">
                  <code>npm install @dits/sdk</code>
                </pre>
                <Link href="/docs/api/sdks/javascript" className="text-primary hover:underline">
                  View JavaScript SDK docs →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Python SDK</CardTitle>
                <CardDescription>For Python applications and scripts</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded text-sm mb-3">
                  <code>pip install dits-sdk</code>
                </pre>
                <Link href="/docs/api/sdks/python" className="text-primary hover:underline">
                  View Python SDK docs →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Go SDK</CardTitle>
                <CardDescription>For Go applications and microservices</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded text-sm mb-3">
                  <code>go get github.com/dits-io/go-sdk</code>
                </pre>
                <Link href="/docs/api/sdks/go" className="text-primary hover:underline">
                  View Go SDK docs →
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rust SDK</CardTitle>
                <CardDescription>Native Rust library for performance-critical applications</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded text-sm mb-3">
                  <code>cargo add dits-sdk</code>
                </pre>
                <Link href="/docs/api/sdks/rust" className="text-primary hover:underline">
                  View Rust SDK docs →
                </Link>
              </CardContent>
            </Card>
          </div>

          <h3>SDK Usage Example</h3>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`import { Dits } from '@dits/sdk';

const client = new Dits({
  token: process.env.DITS_TOKEN,
  baseURL: 'https://api.dits.io/v1'
});

// List repositories
const repos = await client.repos.list();

// Create a new repository
const repo = await client.repos.create({
  name: 'my-project',
  description: 'Video editing project'
});

// Get repository commits
const commits = await client.repos.listCommits(repo.id);`}</code>
          </pre>
        </TabsContent>
      </Tabs>

      <h2>Rate Limits & Best Practices</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Authenticated requests</span>
              <Badge>5,000/hour</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Unauthenticated requests</span>
              <Badge>60/hour</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Search requests</span>
              <Badge>30/minute</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <li>Use API tokens for CI/CD</li>
            <li>Implement exponential backoff for retries</li>
            <li>Cache responses when possible</li>
            <li>Use webhooks for real-time updates</li>
            <li>Batch operations when available</li>
          </CardContent>
        </Card>
      </div>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>API Versioning</AlertTitle>
        <AlertDescription>
          The Dits API is versioned with the <code>v1</code> prefix. Breaking changes will be
          communicated in advance with migration guides provided.
        </AlertDescription>
      </Alert>
    </div>
  );
}

