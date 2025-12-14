import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Webhook, Zap, Shield, Clock, CheckCircle, XCircle, Info } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Webhooks",
  description: "Real-time notifications and event-driven integrations with Dits",
};

export default function WebhooksPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Webhooks & Events</h1>
      <p className="lead text-xl text-muted-foreground">
        Real-time notifications for repository events, enabling CI/CD pipelines,
        Slack notifications, and automated workflows.
      </p>

      <div className="not-prose bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 my-8">
        <div className="flex items-start gap-4">
          <Webhook className="h-8 w-8 text-primary mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-2">Event-Driven Automation</h2>
            <p className="text-muted-foreground mb-4">
              Webhooks deliver real-time notifications about repository activity,
              enabling powerful integrations and automated workflows across your creative pipeline.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">25+</div>
                <div className="text-sm text-muted-foreground">Event Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">Real-time</div>
                <div className="text-sm text-muted-foreground">Delivery</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">Secure</div>
                <div className="text-sm text-muted-foreground">Signatures</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Supported Events</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Repository Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <code className="text-sm">repo.created</code>
              <Badge variant="outline">New repository</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">repo.deleted</code>
              <Badge variant="outline">Repository removed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">repo.updated</code>
              <Badge variant="outline">Settings changed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">repo.transferred</code>
              <Badge variant="outline">Ownership changed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Push Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <code className="text-sm">push</code>
              <Badge variant="outline">Commits pushed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">push.tag</code>
              <Badge variant="outline">Tag pushed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">push.force</code>
              <Badge variant="outline">Force push</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Branch & Tag Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <code className="text-sm">branch.created</code>
              <Badge variant="outline">New branch</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">branch.deleted</code>
              <Badge variant="outline">Branch removed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">tag.created</code>
              <Badge variant="outline">New tag</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Collaboration Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <code className="text-sm">member.added</code>
              <Badge variant="outline">User added</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">member.removed</code>
              <Badge variant="outline">User removed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <code className="text-sm">lock.acquired</code>
              <Badge variant="outline">File locked</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Webhook Configuration</h2>

      <h3>Creating a Webhook</h3>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.dits.io/v1/repos/123/webhooks \\
  -H "Authorization: Bearer your_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["push", "repo.created"],
    "secret": "your_webhook_secret",
    "active": true
  }'`}
      />

      <h3>Webhook Payload Structure</h3>
      <CodeBlock
        language="json"
        code={`{
  "event": "push",
  "repository": {
    "id": 123,
    "name": "my-project",
    "full_name": "user/my-project",
    "private": false
  },
  "sender": {
    "id": 456,
    "login": "octocat",
    "type": "user"
  },
  "commits": [
    {
      "id": "abc123...",
      "message": "Add new footage",
      "author": {
        "name": "Octocat",
        "email": "octocat@example.com"
      }
    }
  ],
  "head_commit": {
    "id": "abc123...",
    "message": "Add new footage"
  }
}`}
      />

      <h2>Security & Validation</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              HMAC Signatures
            </CardTitle>
            <CardDescription>Verify webhook authenticity</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="bash"
              code={`const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

const expected = 'sha256=' + signature;`}
            />
            <p className="text-sm text-muted-foreground">
              Every webhook includes an <code>X-Hub-Signature-256</code> header for verification.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Retry Logic
            </CardTitle>
            <CardDescription>Automatic redelivery on failure</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li><strong>Immediate retry:</strong> On 5xx errors</li>
              <li><strong>Exponential backoff:</strong> Up to 23 hours</li>
              <li><strong>Manual redelivery:</strong> Via API</li>
              <li><strong>Delivery tracking:</strong> Full history available</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Common Use Cases</h2>

      <div className="grid gap-4 md:grid-cols-3 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CI/CD Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Trigger automated builds and deployments when code or assets change.
            </p>
            <ul className="text-sm space-y-1">
              <li>GitHub Actions</li>
              <li>Jenkins</li>
              <li>GitLab CI</li>
              <li>Custom pipelines</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Keep teams informed about project activity and collaboration events.
            </p>
            <ul className="text-sm space-y-1">
              <li>Slack notifications</li>
              <li>Discord webhooks</li>
              <li>Microsoft Teams</li>
              <li>Email digests</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Automatically process, transcode, or analyze uploaded media assets.
            </p>
            <ul className="text-sm space-y-1">
              <li>Video transcoding</li>
              <li>Image optimization</li>
              <li>Metadata extraction</li>
              <li>Quality validation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Implementation Examples</h2>

      <h3>Node.js Webhook Handler</h3>
      <CodeBlock
        language="bash"
        code={`const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);

  // Verify signature
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(\`sha256=\${expected}\`)
  )) {
    return res.status(401).send('Invalid signature');
  }

  // Handle event
  const { event, repository, commits } = req.body;

  switch (event) {
    case 'push':
      console.log(\`New push to \${repository.full_name}\`);
      // Trigger CI/CD pipeline
      break;
    case 'repo.created':
      console.log(\`New repository: \${repository.name}\`);
      // Set up monitoring
      break;
  }

  res.status(200).send('OK');
});

app.listen(3000);`}
      />

      <h3>Python Webhook Handler</h3>
      <CodeBlock
        language="bash"
        code={`from flask import Flask, request, jsonify
import hmac
import hashlib
import os

app = Flask(__name__)

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, f"sha256={expected}")

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Hub-Signature-256')
    payload = request.get_data()

    if not verify_signature(payload, signature, os.environ['WEBHOOK_SECRET']):
        return jsonify({'error': 'Invalid signature'}), 401

    data = request.get_json()
    event = data['event']

    if event == 'push':
        repo = data['repository']
        commits = data['commits']
        print(f"Push to {repo['full_name']}: {len(commits)} commits")
        # Trigger deployment

    elif event == 'lock.acquired':
        file_path = data['lock']['path']
        user = data['sender']['login']
        print(f"File locked: {file_path} by {user}")
        # Notify team

    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(port=3000)`}
      />

      <h2>Webhook Delivery Tracking</h2>

      <div className="not-prose overflow-x-auto my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Delivered</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                HTTP 200-299 response within 10 seconds
              </TableCell>
              <TableCell className="text-sm">
                No action needed
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Retrying</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                5xx error or timeout; automatic retry scheduled
              </TableCell>
              <TableCell className="text-sm">
                Check endpoint availability
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                4xx error or permanent failure after retries
              </TableCell>
              <TableCell className="text-sm">
                Check webhook configuration
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Detailed Documentation</AlertTitle>
        <AlertDescription>
          For complete webhook event schemas, security details, and advanced configuration options,
          see the <Link href="/docs/api/webhooks">full webhooks documentation</Link>.
        </AlertDescription>
      </Alert>
    </div>
  );
}

