import { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Github,
  GitBranch,
  Zap,
  CheckCircle,
  Clock,
  Shield,
  Settings,
  Play
} from "lucide-react";

export const metadata: Metadata = {
  title: "CI/CD Integration",
  description: "Integrate Dits into your CI/CD pipelines for automated workflows",
};

export default function CICDPages() {
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

      <h2>Supported CI/CD Platforms</h2>

      <Tabs defaultValue="github-actions" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="github-actions">GitHub Actions</TabsTrigger>
          <TabsTrigger value="gitlab-ci">GitLab CI</TabsTrigger>
          <TabsTrigger value="jenkins">Jenkins</TabsTrigger>
          <TabsTrigger value="generic">Generic</TabsTrigger>
        </TabsList>

        <TabsContent value="github-actions" className="mt-6">
          <h3>GitHub Actions Integration</h3>

          <h4>Basic Repository Sync</h4>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`name: Sync Assets
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Dits CLI
        run: |
          curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh

      - name: Sync to Dits repository
        run: |
          dits remote add origin $DITS_REMOTE_URL
          dits push origin main
        env:
          DITS_TOKEN: $DITS_TOKEN`}</code>
          </pre>

          <h4>Automated Video Processing</h4>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`name: Process Videos
on:
  push:
    paths:
      - &apos;raw-footage/**&apos;

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Install FFmpeg
        run: sudo apt update &amp;&amp; sudo apt install -y ffmpeg

      - name: Install Dits CLI
        run: curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh

      - name: Clone repository
        run: |
          dits clone $DITS_REMOTE_URL ./project
          cd project

      - name: Process new videos
        run: |
          NEW_VIDEOS=$(dits status --porcelain | grep &apos;^??&apos; | grep -E &apos;\\.(mp4|mov|mxf)$&apos; | cut -c4-)
          for video in $NEW_VIDEOS; do
            ffmpeg -i "$video" -vf scale=720:-1 "$video%.*_proxy.mp4"
          done

      - name: Commit processed assets
        run: |
          dits add .
          dits commit -m "Add processed video assets [CI]"
          dits push origin main
        env:
          DITS_TOKEN: $DITS_TOKEN`}</code>
          </pre>

          <h4>Quality Checks</h4>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`name: Quality Checks
on: pull_request

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Install Dits CLI
        run: curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh

      - name: Clone PR branch
        run: |
          dits clone $DITS_REMOTE_URL ./project --branch $GITHUB_HEAD_REF
          cd project

      - name: Check video formats
        run: |
          find . -name "*.mp4" -o -name "*.mov" | while read file; do
            codec=$(ffprobe -v quiet -print_format json -show_streams "$file" | jq -r &apos;.streams[0].codec_name&apos;)
            if [[ "$codec" != "h264" && "$codec" != "prores" ]]; then
              echo "❌ Invalid codec: $file ($codec)"
              exit 1
            fi
            resolution=$(ffprobe -v quiet -print_format json -show_streams "$file" | jq -r &apos;.streams[0].width + "x" + .streams[0].height&apos;)
            echo "✅ $file: $codec @ $resolution"
          done

      - name: Validate file sizes
        run: |
          find . -type f -size +1G | while read file; do
            echo "⚠️ Large file detected: $file"
            size=$(ls -lh "$file" | awk &apos;{print $5}&apos;)
            if [[ $(stat -f%z "$file") -gt 10737418240 ]]; then
              echo "❌ File too large: $file ($size)"
              exit 1
            fi
          done`}</code>
          </pre>
        </TabsContent>

        <TabsContent value="gitlab-ci" className="mt-6">
          <h3>GitLab CI Integration</h3>

          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`stages:
  - test
  - build
  - deploy

variables:
  DITS_REMOTE: \$DITS_REMOTE_URL
  DITS_TOKEN: \$DITS_TOKEN

# Test stage - validate assets
test:assets:
  stage: test
  image: ubuntu:22.04
  before_script:
    - apt update && apt install -y curl jq ffmpeg
    - curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
  script:
    - dits clone \$DITS_REMOTE ./assets --depth 1
    - cd assets
    - |
      # Validate all video files
      find . -name "*.mp4" -exec sh -c '
        file="\$1"
        echo "Checking \$file..."
        # Check if file is valid
        if ! ffprobe -v error "\$file" >/dev/null 2>&1; then
          echo "❌ Corrupted file: \$file"
          exit 1
        fi
        echo "✅ Valid: \$file"
      ' _ {} \\;
  only:
    - merge_requests

# Build stage - process assets
build:assets:
  stage: build
  image: ubuntu:22.04
  before_script:
    - apt update && apt install -y curl ffmpeg
    - curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
  script:
    - dits clone \$DITS_REMOTE ./project
    - cd project
    - |
      # Generate thumbnails for new videos
      NEW_VIDEOS=\$(dits status --porcelain | grep '^??' | grep '\\.mp4\$' | cut -c4-)
      for video in \$NEW_VIDEOS; do
        echo "Generating thumbnail for \$video"
        ffmpeg -i "\$video" -ss 00:00:01 -vframes 1 "\${video%.*}_thumb.jpg"
      done
    - |
      # Commit processed assets
      if [ -n "\$(dits status --porcelain)" ]; then
        dits add .
        dits commit -m "Add processed assets [CI: \$CI_COMMIT_SHORT_SHA]"
        dits push origin main
      fi
  only:
    - main

# Deploy stage - trigger external services
deploy:staging:
  stage: deploy
  image: curlimages/curl:latest
  script:
    - |
      # Notify external service about new assets
      curl -X POST \$WEBHOOK_URL \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$WEBHOOK_TOKEN" \\
        -d '{
          "event": "assets_updated",
          "commit": "'\$CI_COMMIT_SHA'",
          "repository": "'\$CI_PROJECT_NAME'"
        }'
  only:
    - main`}</code>
          </pre>
        </TabsContent>

        <TabsContent value="jenkins" className="mt-6">
          <h3>Jenkins Pipeline</h3>

          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`pipeline {
    agent any

    environment {
        DITS_REMOTE = credentials('dits-remote-url')
        DITS_TOKEN = credentials('dits-token')
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    # Install Dits CLI
                    curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh

                    # Install FFmpeg for video processing
                    apt update && apt install -y ffmpeg
                '''
            }
        }

        stage('Clone Assets') {
            steps {
                sh '''
                    dits clone $DITS_REMOTE ./assets
                    cd assets
                '''
            }
        }

        stage('Process Videos') {
            steps {
                sh '''
                    cd assets

                    # Find new video files
                    NEW_VIDEOS=$(dits status --porcelain | grep '^??' | grep -E '\\.(mp4|mov)$' | cut -c4- || true)

                    if [ -n "$NEW_VIDEOS" ]; then
                        echo "Processing new videos: $NEW_VIDEOS"

                        for video in $NEW_VIDEOS; do
                            echo "Transcoding $video to H.264..."
                            ffmpeg -i "$video" -c:v libx264 -preset fast -crf 23 "\${video%.*}_processed.mp4"
                        done

                        # Commit processed videos
                        dits add .
                        dits commit -m "Add processed videos [Jenkins: \${BUILD_NUMBER}]"
                        dits push origin main
                    else
                        echo "No new videos to process"
                    fi
                '''
            }
        }

        stage('Quality Check') {
            steps {
                sh '''
                    cd assets

                    # Check video quality metrics
                    find . -name "*_processed.mp4" -exec sh -c '
                        video="$1"
                        echo "Quality check: $video"

                        # Get video bitrate
                        bitrate=$(ffprobe -v quiet -print_format json -show_format "$video" | jq -r ".format.bit_rate")

                        if [ "$bitrate" -lt 1000000 ]; then  # 1 Mbps
                            echo "⚠️ Low bitrate detected: $video (\${bitrate}bps)"
                        fi
                    ' _ {} \\;
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    # Notify CDN or external services
                    curl -X POST $DEPLOY_WEBHOOK \\
                        -H "Content-Type: application/json" \\
                        -d "{\\"status\\": \\"assets_processed\\", \\"build\\": \\"\${BUILD_NUMBER}\\"}"
                '''
            }
        }
    }

    post {
        always {
            sh 'dits --version || true'
        }
        failure {
            sh '''
                echo "Pipeline failed - cleaning up..."
                # Cleanup logic here
            '''
        }
    }
}`}</code>
          </pre>
        </TabsContent>

        <TabsContent value="generic" className="mt-6">
          <h3>Generic CI/CD Integration</h3>

          <div className="grid gap-6 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <code className="bg-muted px-2 py-1 rounded">DITS_TOKEN</code>
                  <p className="text-muted-foreground">API token for authentication</p>
                </div>
                <div className="text-sm">
                  <code className="bg-muted px-2 py-1 rounded">DITS_REMOTE_URL</code>
                  <p className="text-muted-foreground">Repository remote URL</p>
                </div>
                <div className="text-sm">
                  <code className="bg-muted px-2 py-1 rounded">DITS_API_URL</code>
                  <p className="text-muted-foreground">API base URL (optional)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <strong>Conditional Processing:</strong>
                  <p className="text-muted-foreground">Only process when assets change</p>
                </div>
                <div className="text-sm">
                  <strong>Incremental Builds:</strong>
                  <p className="text-muted-foreground">Build only what's new</p>
                </div>
                <div className="text-sm">
                  <strong>Artifact Management:</strong>
                  <p className="text-muted-foreground">Store build outputs in Dits</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <h4>Shell Script Example</h4>
          <pre className="bg-muted p-4 rounded text-sm">
            <code>{`#!/bin/bash
set -e

# Configuration
DITS_TOKEN="\${DITS_TOKEN:?Required environment variable}"
REMOTE_URL="\${REMOTE_URL:?Required environment variable}"
BRANCH="\${BRANCH:-main}"

              echo "🚀 Starting Dits CI/CD pipeline"

              # Install Dits CLI if not present
if ! command -v dits &> /dev/null; then
              echo "📦 Installing Dits CLI..."
              curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
              fi

              # Clone or update repository
              if [ -d "project" ]; then
              echo "📥 Updating repository..."
              cd project
              dits pull origin $BRANCH
              else
              echo "📥 Cloning repository..."
              dits clone "$REMOTE_URL" ./project
              cd project
              fi

              # Check for new assets
              echo "🔍 Checking for new assets..."
              NEW_FILES=$(dits status --porcelain | grep '^??' | wc -l)

              if [ "$NEW_FILES" -gt 0 ]; then
              echo "✨ Found $NEW_FILES new files"

              # Process assets (custom logic here)
              echo "⚙️ Processing assets..."
              # Your asset processing logic here

              # Commit changes
              echo "💾 Committing changes..."
              dits add .
              dits commit -m "Process assets [CI: $(date +%Y%m%d_%H%M%S)]"
              dits push origin $BRANCH

              echo "✅ Assets processed and committed"
              else
              echo "ℹ️ No new assets to process"
              fi

echo "🎉 Pipeline completed successfully"\`}</code>
          </pre>
        </TabsContent>
      </Tabs>

      <h2>Webhook Integration</h2>

      <Alert className="not-prose my-6">
        <Clock className="h-4 w-4" />
        <AlertTitle>Real-time Triggers</AlertTitle>
        <AlertDescription>
          Use webhooks to trigger CI/CD pipelines immediately when assets are pushed,
          rather than polling for changes.
        </AlertDescription>
      </Alert>

      <h3>GitHub Actions with Webhooks</h3>
      <pre className="bg-muted p-4 rounded text-sm">
        <code>{`name: Asset Processing
              on:
              repository_dispatch:
              types: [asset_pushed]

              jobs:
              process:
              runs-on: ubuntu-latest
              if: github.event.action == 'asset_pushed'
              steps:
              - name: Get webhook payload
              id: webhook
              run: |
              echo "repository=\${{ github.event.client_payload.repository }}" >> \$GITHUB_OUTPUT
              echo "commit=\${{ github.event.client_payload.commit }}" >> \$GITHUB_OUTPUT
              echo "files=\${{ github.event.client_payload.files }}" >> \$GITHUB_OUTPUT

              - name: Install Dits CLI
              run: curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh

              - name: Process specific assets
              run: |
              dits clone \${{ steps.webhook.outputs.repository }} ./assets
              cd assets

              # Process only the files mentioned in webhook
              echo "\${{ steps.webhook.outputs.files }}" | jq -r '.[]' | while read file; do
              echo "Processing \$file"
              # Your processing logic here
              done

              # Commit results
              dits add .
              dits commit -m "Process assets from webhook [CI]"
              dits push origin main
              env:
              DITS_TOKEN: \${{ secrets.DITS_TOKEN }}`}</code>
          </pre>

          <h2>Best Practices</h2>

          <div className="grid gap-4 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <li className="text-sm">Store tokens as encrypted secrets</li>
                <li className="text-sm">Use scoped API tokens with minimal permissions</li>
                <li className="text-sm">Validate webhook signatures</li>
                <li className="text-sm">Rotate tokens regularly</li>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <li className="text-sm">Use shallow clones for faster downloads</li>
                <li className="text-sm">Process assets in parallel when possible</li>
                <li className="text-sm">Cache dependencies between runs</li>
                <li className="text-sm">Use incremental processing</li>
              </CardContent>
            </Card>
          </div>

          <Card className="my-6">
            <CardHeader>
              <CardTitle>Monitoring & Debugging</CardTitle>
              <CardDescription>
                Track your CI/CD pipelines and troubleshoot issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h4>Enable Debug Logging</h4>
              <pre className="bg-muted p-3 rounded text-sm mb-4">
                <code>export DITS_DEBUG=true
                  export DITS_LOG_LEVEL=debug</code>
              </pre>

              <h4>Check Repository Status</h4>
              <pre className="bg-muted p-3 rounded text-sm mb-4">
                <code>dits status --verbose
                  dits log --oneline -10</code>
              </pre>

              <h4>Validate Configuration</h4>
              <pre className="bg-muted p-3 rounded text-sm">
                <code>dits config --list
                  dits remote --list</code>
              </pre>
            </CardContent>
          </Card>

          <h2>Example Use Cases</h2>

          <div className="grid gap-4 md:grid-cols-3 my-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Production</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Auto-generate proxies</li>
                  <li>• Transcode for web delivery</li>
                  <li>• Create thumbnails</li>
                  <li>• Validate codecs</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Game Development</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Build asset bundles</li>
                  <li>• Compress textures</li>
                  <li>• Validate file formats</li>
                  <li>• Update build pipelines</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photography</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Process RAW files</li>
                  <li>• Generate web versions</li>
                  <li>• Create galleries</li>
                  <li>• Backup workflows</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center my-8">
            <Link href="/docs/api/webhooks" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Settings className="h-4 w-4" />
              Learn More About Webhooks
            </Link>
          </div>
        </div>
        );
}

