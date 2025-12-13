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
import {
  Zap,
  Shield,
  Clock,
  Settings,
} from "lucide-react";

export const metadata: Metadata = {
  title: "CI/CD Integration",
  description: "Integrate Dits into your CI/CD pipelines for automated workflows",
};

export default function CICDPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>CI/CD Integration</h1>
      <p className="lead text-xl text-muted-foreground">
        Automate your creative workflows with Dits integration in CI/CD pipelines.
        Trigger builds, run tests, and deploy assets automatically.
      </p>

      <div className="grid gap-6 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Automated Workflows
            </CardTitle>
            <CardDescription>
              Trigger CI/CD pipelines when creative assets change
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Build game assets on texture updates</li>
              <li>• Transcode videos when raw footage is added</li>
              <li>• Run automated tests on code changes</li>
              <li>• Deploy to staging when commits are tagged</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Quality Assurance
            </CardTitle>
            <CardDescription>
              Automated checks for creative asset quality and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Validate video codecs and formats</li>
              <li>• Check image resolutions and quality</li>
              <li>• Verify metadata completeness</li>
              <li>• Run automated review processes</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Supported Platforms</h2>
      <p>Dits integrates with all major CI/CD platforms:</p>
      <ul>
        <li><strong>GitHub Actions</strong> - Native integration with repository events</li>
        <li><strong>GitLab CI</strong> - Pipeline triggers and artifact management</li>
        <li><strong>Jenkins</strong> - Jenkinsfile pipeline support</li>
        <li><strong>CircleCI</strong> - Orb-based configuration</li>
      </ul>

      <h2>Basic Setup</h2>
      <p>Install the Dits CLI in your CI/CD environment:</p>
      <pre className="bg-muted p-4 rounded text-sm">
        <code>curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh</code>
      </pre>

      <h2>Environment Variables</h2>
      <Card className="my-6">
        <CardContent className="pt-6 space-y-3">
          <div className="text-sm">
            <code className="bg-muted px-2 py-1 rounded">DITS_TOKEN</code>
            <p className="text-muted-foreground">API token for authentication</p>
          </div>
          <div className="text-sm">
            <code className="bg-muted px-2 py-1 rounded">DITS_REMOTE_URL</code>
            <p className="text-muted-foreground">Repository remote URL</p>
          </div>
        </CardContent>
      </Card>

      <Alert className="not-prose my-6">
        <Clock className="h-4 w-4" />
        <AlertTitle>Coming Soon</AlertTitle>
        <AlertDescription>
          Detailed platform-specific configuration guides are being developed.
          Check back soon for GitHub Actions, GitLab CI, and Jenkins examples.
        </AlertDescription>
      </Alert>

      <div className="text-center my-8">
        <Link href="/docs/api/webhooks" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Settings className="h-4 w-4" />
          Learn About Webhooks
        </Link>
      </div>
    </div>
  );
}
