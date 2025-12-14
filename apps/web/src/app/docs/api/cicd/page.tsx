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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Zap,
  Shield,
  Clock,
  Settings,
  CheckCircle,
  GitBranch,
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
              <li>Build game assets on texture updates</li>
              <li>Transcode videos when raw footage is added</li>
              <li>Run automated tests on code changes</li>
              <li>Deploy to staging when commits are tagged</li>
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
              <li>Validate video codecs and formats</li>
              <li>Check image resolutions and quality</li>
              <li>Verify metadata completeness</li>
              <li>Run automated review processes</li>
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

      <h2>Environment Variables</h2>
      <Card className="my-6">
        <CardContent className="pt-6 space-y-3">
          <div className="text-sm">
            <code className="bg-muted px-2 py-1 rounded">DITS_TOKEN</code>
            <p className="text-muted-foreground">API token for authentication (required)</p>
          </div>
          <div className="text-sm">
            <code className="bg-muted px-2 py-1 rounded">DITS_REMOTE_URL</code>
            <p className="text-muted-foreground">Repository remote URL</p>
          </div>
          <div className="text-sm">
            <code className="bg-muted px-2 py-1 rounded">DITS_CACHE_DIR</code>
            <p className="text-muted-foreground">Override cache directory location</p>
          </div>
        </CardContent>
      </Card>

      <h2>Platform Configuration</h2>

      <Tabs defaultValue="github" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="github">GitHub Actions</TabsTrigger>
          <TabsTrigger value="gitlab">GitLab CI</TabsTrigger>
          <TabsTrigger value="jenkins">Jenkins</TabsTrigger>
          <TabsTrigger value="circleci">CircleCI</TabsTrigger>
        </TabsList>

        <TabsContent value="github" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                GitHub Actions Workflow
              </CardTitle>
              <CardDescription>
                .github/workflows/dits.yml
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`name: Dits CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Dits CLI
        run: |
          curl -fsSL https://get.dits.io | sh
          echo "$HOME/.dits/bin" >> $GITHUB_PATH

      - name: Configure Dits
        run: |
          dits config set user.name "GitHub Actions"
          dits config set user.email "actions@github.com"
        env:
          DITS_TOKEN: \${{ secrets.DITS_TOKEN }}

      - name: Pull assets
        run: |
          dits pull origin main
          dits status

      - name: Validate assets
        run: |
          dits verify --all
          dits check-integrity

      - name: Build assets
        run: |
          # Your build commands here
          npm run build:assets

      - name: Push changes
        if: github.ref == 'refs/heads/main'
        run: |
          dits add .
          dits commit -m "CI: Build assets [\${{ github.sha }}]"
          dits push origin main
        env:
          DITS_TOKEN: \${{ secrets.DITS_TOKEN }}`}</code></pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gitlab" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                GitLab CI Configuration
              </CardTitle>
              <CardDescription>
                .gitlab-ci.yml
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`stages:
  - prepare
  - build
  - deploy

variables:
  DITS_CACHE_DIR: /cache/dits

install-dits:
  stage: prepare
  script:
    - curl -fsSL https://get.dits.io | sh
    - dits --version
  cache:
    key: dits-cli
    paths:
      - ~/.dits/bin

build-assets:
  stage: build
  before_script:
    - export PATH="$HOME/.dits/bin:$PATH"
    - dits config set user.name "GitLab CI"
    - dits config set user.email "ci@gitlab.com"
  script:
    - dits pull origin $CI_COMMIT_REF_NAME
    - dits verify --all
    - npm run build:assets
    - dits add .
    - dits commit -m "CI: Build assets [$CI_COMMIT_SHA]"
  cache:
    key: dits-cache
    paths:
      - $DITS_CACHE_DIR
  only:
    - main
    - develop

deploy-production:
  stage: deploy
  script:
    - dits push origin main
  environment:
    name: production
  only:
    - main
  when: manual`}</code></pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jenkins" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Jenkins Pipeline
              </CardTitle>
              <CardDescription>
                Jenkinsfile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`pipeline {
    agent any
    
    environment {
        DITS_TOKEN = credentials('dits-api-token')
        DITS_CACHE_DIR = '/var/cache/dits'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh '''
                    curl -fsSL https://get.dits.io | sh
                    export PATH="$HOME/.dits/bin:$PATH"
                    dits --version
                '''
            }
        }
        
        stage('Pull') {
            steps {
                sh '''
                    dits config set user.name "Jenkins"
                    dits config set user.email "jenkins@example.com"
                    dits pull origin main
                    dits status
                '''
            }
        }
        
        stage('Validate') {
            steps {
                sh '''
                    dits verify --all
                    dits check-integrity
                '''
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build:assets'
            }
        }
        
        stage('Push') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    dits add .
                    dits commit -m "CI: Build assets [$BUILD_NUMBER]"
                    dits push origin main
                '''
            }
        }
    }
    
    post {
        always {
            sh 'dits cache-stats'
        }
    }
}`}</code></pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circleci" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                CircleCI Configuration
              </CardTitle>
              <CardDescription>
                .circleci/config.yml
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`version: 2.1

executors:
  default:
    docker:
      - image: cimg/node:18.0

commands:
  install-dits:
    steps:
      - run:
          name: Install Dits CLI
          command: |
            curl -fsSL https://get.dits.io | sh
            echo 'export PATH="$HOME/.dits/bin:$PATH"' >> $BASH_ENV

jobs:
  build:
    executor: default
    steps:
      - checkout
      - install-dits
      - run:
          name: Configure Dits
          command: |
            dits config set user.name "CircleCI"
            dits config set user.email "ci@circleci.com"
      - run:
          name: Pull assets
          command: dits pull origin main
      - run:
          name: Validate
          command: dits verify --all
      - run:
          name: Build
          command: npm run build:assets
      - run:
          name: Push changes
          command: |
            dits add .
            dits commit -m "CI: Build [$CIRCLE_SHA1]"
            dits push origin main

workflows:
  version: 2
  build-and-deploy:
    jobs:
      - build:
          filters:
            branches:
              only:
                - main
                - develop`}</code></pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <h2>Webhook Triggers</h2>
      <p>
        Configure webhooks to trigger CI/CD pipelines when specific events occur
        in your Dits repository:
      </p>

      <CodeBlock
        language="bash"
        code={`# Configure webhook for push events
dits webhook add \\
  --event push \\
  --url https://api.github.com/repos/owner/repo/dispatches \\
  --secret $WEBHOOK_SECRET

# List configured webhooks
dits webhook list

# Test webhook delivery
dits webhook test <webhook-id>`}
      />

      <h2>Best Practices</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Use sparse checkout for large repos</li>
              <li>Cache Dits data between builds</li>
              <li>Use parallel chunk downloads</li>
              <li>Set appropriate cache sizes</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Store tokens in secrets manager</li>
              <li>Use short-lived tokens when possible</li>
              <li>Limit token scopes to required permissions</li>
              <li>Enable audit logging</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert className="not-prose my-6">
        <Settings className="h-4 w-4" />
        <AlertTitle>Need Custom Integration?</AlertTitle>
        <AlertDescription>
          For advanced integrations or custom CI/CD platforms, use the{" "}
          <Link href="/docs/api/rest" className="underline">REST API</Link> directly
          or configure <Link href="/docs/api/webhooks" className="underline">webhooks</Link> for event-driven workflows.
        </AlertDescription>
      </Alert>

      <div className="text-center my-8">
        <Button asChild size="lg">
          <Link href="/docs/api/webhooks">
            <Settings className="h-4 w-4" />
            Learn About Webhooks
          </Link>
        </Button>
      </div>
    </div>
  );
}
