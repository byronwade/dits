# CI/CD Integration Guide

Integrate Dits with continuous integration and deployment pipelines.

---

## Overview

Dits integrates with popular CI/CD platforms to enable automated workflows for media assets. This guide covers setup and best practices for:

- GitHub Actions
- GitLab CI/CD
- Jenkins
- CircleCI
- Azure DevOps

---

## Authentication in CI

### Service Account Setup

```bash
# Create a service account (admin)
dits-admin user create \
    --email ci@example.com \
    --name "CI Service Account" \
    --type service

# Generate API token
dits-admin token create \
    --user ci@example.com \
    --name "CI Token" \
    --scopes "repo:read,repo:write,repo:push,repo:pull" \
    --expires 365d
```

### Token Storage

Store the token as a secret in your CI platform:
- GitHub: Repository Settings → Secrets → Actions
- GitLab: Settings → CI/CD → Variables
- Jenkins: Credentials → Add Credentials

### Token Usage

```yaml
# Use in environment
env:
  DITS_TOKEN: ${{ secrets.DITS_TOKEN }}

# Or pass directly
- run: dits --token "$DITS_TOKEN" push
```

---

## GitHub Actions

### Basic Workflow

```yaml
# .github/workflows/dits.yml
name: Dits CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Dits
        uses: dits-io/setup-dits@v1
        with:
          version: 'latest'

      - name: Configure Dits
        run: |
          dits config set user.name "GitHub Actions"
          dits config set user.email "actions@github.com"

      - name: Pull latest assets
        env:
          DITS_TOKEN: ${{ secrets.DITS_TOKEN }}
        run: |
          dits clone https://dits.io/myorg/assets assets
          cd assets
          dits pull

      - name: Verify integrity
        run: |
          cd assets
          dits fsck
```

### Media Processing Workflow

```yaml
# .github/workflows/media-process.yml
name: Process Media

on:
  repository_dispatch:
    types: [dits_push]
  workflow_dispatch:
    inputs:
      file_path:
        description: 'File to process'
        required: true

jobs:
  process:
    runs-on: ubuntu-latest

    steps:
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg

      - name: Install Dits
        uses: dits-io/setup-dits@v1

      - name: Clone repository
        env:
          DITS_TOKEN: ${{ secrets.DITS_TOKEN }}
        run: |
          dits clone https://dits.io/myorg/project .

      - name: Generate proxies
        run: |
          for file in $(find . -name "*.mov" -o -name "*.mp4"); do
            echo "Processing: $file"
            proxy_file="${file%.*}_proxy.mp4"
            ffmpeg -i "$file" -vf "scale=1280:-2" -c:v libx264 -preset fast "$proxy_file"
          done

      - name: Upload proxies
        env:
          DITS_TOKEN: ${{ secrets.DITS_TOKEN }}
        run: |
          dits add *_proxy.mp4
          dits commit -m "Generate proxies [ci skip]"
          dits push
```

### Dits Webhook Trigger

```yaml
# Trigger on Dits push events
on:
  repository_dispatch:
    types: [dits_push, dits_commit]

jobs:
  respond:
    runs-on: ubuntu-latest
    steps:
      - name: Handle Dits event
        run: |
          echo "Event: ${{ github.event.action }}"
          echo "Repository: ${{ github.event.client_payload.repository }}"
          echo "Commit: ${{ github.event.client_payload.commit }}"
```

### Caching for Performance

```yaml
- name: Cache Dits
  uses: actions/cache@v3
  with:
    path: ~/.cache/dits
    key: dits-${{ runner.os }}-${{ hashFiles('**/dits.lock') }}
    restore-keys: |
      dits-${{ runner.os }}-

- name: Pull with cache
  run: dits pull --use-cache
```

---

## GitLab CI/CD

### Basic Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - sync
  - process
  - deploy

variables:
  DITS_ENDPOINT: https://dits.io
  DITS_REPO: myorg/project

.dits-setup:
  before_script:
    - curl -sSL https://get.dits.io | sh
    - dits config set user.name "GitLab CI"
    - dits config set user.email "ci@gitlab.com"

sync-assets:
  stage: sync
  extends: .dits-setup
  script:
    - dits clone $DITS_ENDPOINT/$DITS_REPO assets
    - cd assets && dits pull
    - dits fsck
  artifacts:
    paths:
      - assets/
  cache:
    key: dits-cache
    paths:
      - ~/.cache/dits

process-media:
  stage: process
  needs: [sync-assets]
  script:
    - apt-get update && apt-get install -y ffmpeg
    - cd assets
    - |
      for file in *.mov; do
        ffmpeg -i "$file" -c:v libx264 "${file%.mov}.mp4"
      done
  artifacts:
    paths:
      - assets/*.mp4

deploy-assets:
  stage: deploy
  needs: [process-media]
  extends: .dits-setup
  script:
    - cd assets
    - dits add *.mp4
    - dits commit -m "Process media from CI"
    - dits push
  only:
    - main
```

### Large File Handling

```yaml
# For large media files
sync-large-assets:
  stage: sync
  extends: .dits-setup
  variables:
    GIT_STRATEGY: none
  script:
    # Use sparse checkout for specific files
    - dits init
    - dits remote add origin $DITS_ENDPOINT/$DITS_REPO
    - dits config set checkout.sparse true
    - dits sparse add "*.prproj"
    - dits sparse add "Media/*.mov"
    - dits pull
  timeout: 2h  # Extended timeout for large files
```

---

## Jenkins

### Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        DITS_TOKEN = credentials('dits-token')
        DITS_REPO = 'https://dits.io/myorg/project'
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    curl -sSL https://get.dits.io | sh
                    dits config set user.name "Jenkins"
                    dits config set user.email "jenkins@example.com"
                '''
            }
        }

        stage('Sync') {
            steps {
                sh '''
                    dits clone $DITS_REPO assets
                    cd assets && dits pull
                '''
            }
        }

        stage('Process') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    cd assets
                    # Run processing scripts
                    ./scripts/process-media.sh
                '''
            }
        }

        stage('Push') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    cd assets
                    dits add .
                    dits commit -m "Jenkins build #${BUILD_NUMBER}"
                    dits push
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            slackSend channel: '#alerts', message: "Dits sync failed: ${BUILD_URL}"
        }
    }
}
```

### Jenkins Shared Library

```groovy
// vars/dits.groovy
def call(Map config = [:]) {
    def token = config.token ?: env.DITS_TOKEN
    def repo = config.repo

    withEnv(["DITS_TOKEN=${token}"]) {
        sh "dits clone ${repo} ."
        sh "dits pull"
    }
}

def push(String message) {
    sh """
        dits add .
        dits commit -m "${message}"
        dits push
    """
}

// Usage in Jenkinsfile
@Library('shared-library') _

pipeline {
    stages {
        stage('Sync') {
            steps {
                dits repo: 'https://dits.io/org/project'
            }
        }
        stage('Push') {
            steps {
                dits.push("Update from CI")
            }
        }
    }
}
```

---

## CircleCI

### Config

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  dits: dits-io/dits@1.0

executors:
  media-processor:
    docker:
      - image: cimg/base:current
    resource_class: large

jobs:
  sync-assets:
    executor: media-processor
    steps:
      - dits/install
      - dits/configure:
          name: "CircleCI"
          email: "ci@circleci.com"
      - dits/clone:
          repository: $DITS_REPO
      - persist_to_workspace:
          root: .
          paths:
            - assets

  process-media:
    executor: media-processor
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Install FFmpeg
          command: sudo apt-get update && sudo apt-get install -y ffmpeg
      - run:
          name: Process videos
          command: |
            cd assets
            for f in *.mov; do
              ffmpeg -i "$f" -c:v libx264 "${f%.mov}.mp4"
            done
      - persist_to_workspace:
          root: .
          paths:
            - assets

  push-results:
    executor: media-processor
    steps:
      - attach_workspace:
          at: .
      - dits/install
      - dits/configure:
          name: "CircleCI"
          email: "ci@circleci.com"
      - run:
          name: Push results
          command: |
            cd assets
            dits add *.mp4
            dits commit -m "Processed by CircleCI"
            dits push

workflows:
  process-workflow:
    jobs:
      - sync-assets
      - process-media:
          requires:
            - sync-assets
      - push-results:
          requires:
            - process-media
          filters:
            branches:
              only: main
```

---

## Azure DevOps

### Azure Pipeline

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: dits-credentials

stages:
  - stage: Sync
    jobs:
      - job: SyncAssets
        steps:
          - task: Bash@3
            displayName: 'Install Dits'
            inputs:
              targetType: 'inline'
              script: |
                curl -sSL https://get.dits.io | sh
                dits config set user.name "Azure DevOps"
                dits config set user.email "azdo@example.com"

          - task: Bash@3
            displayName: 'Clone repository'
            inputs:
              targetType: 'inline'
              script: |
                dits clone $(DITS_REPO) assets
                cd assets && dits pull
            env:
              DITS_TOKEN: $(DITS_TOKEN)

          - publish: $(System.DefaultWorkingDirectory)/assets
            artifact: dits-assets

  - stage: Process
    dependsOn: Sync
    jobs:
      - job: ProcessMedia
        steps:
          - download: current
            artifact: dits-assets

          - task: Bash@3
            displayName: 'Process media'
            inputs:
              targetType: 'inline'
              script: |
                cd $(Pipeline.Workspace)/dits-assets
                # Processing logic here

  - stage: Push
    dependsOn: Process
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: PushToDits
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: Bash@3
                  displayName: 'Push results'
                  inputs:
                    targetType: 'inline'
                    script: |
                      cd $(Pipeline.Workspace)/dits-assets
                      dits add .
                      dits commit -m "Azure DevOps Build $(Build.BuildNumber)"
                      dits push
                  env:
                    DITS_TOKEN: $(DITS_TOKEN)
```

---

## Webhook Integration

### Setting Up Webhooks

```bash
# Create webhook for CI triggers
dits webhook create \
    --repo myorg/project \
    --url https://api.github.com/repos/org/repo/dispatches \
    --events push,commit \
    --secret $WEBHOOK_SECRET
```

### Webhook Payload

```json
{
  "event": "push",
  "repository": {
    "id": "550e8400-...",
    "name": "project",
    "organization": "myorg"
  },
  "commits": [
    {
      "hash": "abc123...",
      "message": "Update assets",
      "author": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "timestamp": "2025-01-08T12:00:00Z"
    }
  ],
  "ref": "refs/heads/main",
  "pusher": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Webhook Handler

```javascript
// Express webhook handler
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhook/dits', express.json(), (req, res) => {
    // Verify signature
    const signature = req.headers['x-dits-signature'];
    const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== `sha256=${expected}`) {
        return res.status(401).send('Invalid signature');
    }

    const { event, repository, commits } = req.body;

    console.log(`Event: ${event}`);
    console.log(`Repository: ${repository.name}`);
    console.log(`Commits: ${commits.length}`);

    // Trigger CI pipeline
    triggerPipeline(repository, commits);

    res.status(200).send('OK');
});
```

---

## Best Practices

### 1. Use Caching

```yaml
# Cache Dits objects between runs
- name: Cache Dits objects
  uses: actions/cache@v3
  with:
    path: |
      ~/.cache/dits
      .dits/cache
    key: dits-${{ runner.os }}-${{ github.sha }}
    restore-keys: |
      dits-${{ runner.os }}-
```

### 2. Parallel Processing

```yaml
# Process files in parallel
jobs:
  process:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: |
          # Get files for this shard
          files=$(dits ls-files | awk "NR % 4 == ${{ matrix.shard }} - 1")
          for f in $files; do
            process "$f"
          done
```

### 3. Selective Sync

```bash
# Only sync changed files
changed=$(dits diff --name-only HEAD~1)
for file in $changed; do
    process "$file"
done
```

### 4. Skip CI Commits

```bash
# Prevent infinite loops
dits commit -m "Auto-generated [skip ci]"
```

### 5. Artifact Management

```yaml
# Clean up old artifacts
- name: Cleanup
  run: |
    dits gc --prune-old --aggressive
    dits cache clear --older-than 7d
```

---

## Troubleshooting

### Common Issues

**Authentication failures:**
```bash
# Verify token
curl -H "Authorization: Bearer $DITS_TOKEN" \
    https://api.dits.io/v1/user

# Check token scopes
dits auth status
```

**Timeouts on large files:**
```bash
# Increase timeout
dits config set transfer.timeout 30m

# Use chunked transfer
dits push --chunked
```

**Disk space issues:**
```bash
# Use sparse checkout
dits config set checkout.sparse true
dits sparse add "*.prproj"

# Clean cache
dits cache clear
```

---

## Notes

- Always use secrets for tokens, never hardcode
- Consider using self-hosted runners for large files
- Set appropriate timeouts for media processing
- Use webhooks for event-driven pipelines
- Implement proper error handling and retries
