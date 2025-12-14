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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info, HardDrive, Cloud, Archive } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "Storage Tiers",
  description: "Manage data across different storage tiers in Dits",
};

export default function StorageTiersPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Storage Tiers</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits supports multiple storage tiers, automatically moving data between
        fast local storage, cloud storage, and cold archive based on access
        patterns and policies.
      </p>

      <h2>Storage Hierarchy</h2>
      <p>
        Dits organizes storage into three tiers:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-8">
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
              <HardDrive className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Hot (Local)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Fast local storage for actively used data. Instant access, highest
              cost per GB.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
              <Cloud className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle>Warm (Cloud)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Cloud object storage for recent data. Seconds to access, moderate
              cost.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
              <Archive className="h-6 w-6 text-purple-500" />
            </div>
            <CardTitle>Cold (Archive)</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Deep archive for rarely accessed data. Hours to retrieve, lowest
              cost.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <h2>How It Works</h2>
      <CodeBlock
        language="bash"
        code={`Data Flow:

  Add file → HOT (local .dits/objects/)
      ↓
  Push → WARM (cloud storage)
      ↓
  Age out → COLD (archive)

Access triggers promotion:
  Request archived file → Restore from COLD → WARM → HOT`}
      />

      <h2>Tier Configuration</h2>

      <h3>Basic Setup</h3>
      <CodeBlock
        language="bash"
        code={`# .dits/config
[storage]
    # Local hot storage
    hotPath = .dits/objects
    hotLimit = 100GB

[storage.warm]
    # AWS S3 for warm storage
    type = s3
    bucket = my-project-dits
    region = us-west-2

[storage.cold]
    # Glacier for archive
    type = s3-glacier
    bucket = my-project-archive
    region = us-west-2`}
      />

      <h3>Storage Backends</h3>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Backend</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Local filesystem</TableCell>
            <TableCell className="font-mono text-sm">local</TableCell>
            <TableCell>Hot</TableCell>
            <TableCell>Default for .dits/objects</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>AWS S3</TableCell>
            <TableCell className="font-mono text-sm">s3</TableCell>
            <TableCell>Warm</TableCell>
            <TableCell>Standard, IA, One Zone</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>AWS Glacier</TableCell>
            <TableCell className="font-mono text-sm">s3-glacier</TableCell>
            <TableCell>Cold</TableCell>
            <TableCell>Instant, Flexible, Deep</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Google Cloud Storage</TableCell>
            <TableCell className="font-mono text-sm">gcs</TableCell>
            <TableCell>Warm/Cold</TableCell>
            <TableCell>Standard, Nearline, Archive</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Azure Blob</TableCell>
            <TableCell className="font-mono text-sm">azure</TableCell>
            <TableCell>Warm/Cold</TableCell>
            <TableCell>Hot, Cool, Archive</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Backblaze B2</TableCell>
            <TableCell className="font-mono text-sm">b2</TableCell>
            <TableCell>Warm</TableCell>
            <TableCell>Cost-effective option</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <h2>Lifecycle Policies</h2>
      <p>
        Define rules for automatic data movement:
      </p>

      <CodeBlock
        language="bash"
        code={`# .dits/config
[lifecycle]
    # Move to warm after not accessed for 7 days
    warmAfter = 7d

    # Move to cold after not accessed for 90 days
    coldAfter = 90d

    # Delete from hot after synced to warm
    evictHotAfter = 30d

[lifecycle.rules.project-files]
    # Project files stay hot longer
    pattern = *.prproj
    warmAfter = 30d
    coldAfter = 365d

[lifecycle.rules.raw-footage]
    # Raw footage moves to cold faster
    pattern = raw/**
    warmAfter = 3d
    coldAfter = 30d`}
      />

      <h2>Manual Tier Management</h2>

      <h3>Check Storage Status</h3>
      <CodeBlock
        language="bash"
        code={`$ dits storage status

Storage Tiers:
  HOT (local):
    Path: .dits/objects/
    Used: 45.2 GB / 100 GB (45%)
    Objects: 12,456 chunks

  WARM (s3://my-project-dits):
    Used: 234.5 GB
    Objects: 45,892 chunks

  COLD (s3-glacier://my-project-archive):
    Used: 1.2 TB
    Objects: 156,234 chunks

Recent Activity:
  Promoted to HOT: 234 chunks (2.1 GB) today
  Demoted to WARM: 0 chunks
  Archived to COLD: 1,234 chunks (15 GB) this week`}
      />

      <h3>Move Data Between Tiers</h3>
      <CodeBlock
        language="bash"
        code={`# Promote specific file to hot storage
$ dits storage promote footage/scene1.mov
Promoting footage/scene1.mov...
  Restoring from WARM... done
  10,234 chunks (10.2 GB) now in HOT storage

# Demote to warm (keep locally accessible but push to cloud)
$ dits storage demote footage/old-takes/
Demoting footage/old-takes/...
  Uploading to WARM... done
  5,678 chunks (5.5 GB) demoted

# Archive to cold storage
$ dits storage archive footage/2023-archive/
Archiving footage/2023-archive/...
  Moving to COLD... done
  Note: Retrieval will take 3-5 hours`}
      />

      <h3>Pin Data to Tier</h3>
      <CodeBlock
        language="bash"
        code={`# Keep file always in hot storage
$ dits storage pin hot footage/hero-shot.mov
Pinned footage/hero-shot.mov to HOT tier

# Pin entire directory
$ dits storage pin hot project-files/

# Unpin
$ dits storage unpin footage/hero-shot.mov

# List pinned items
$ dits storage pinned
HOT:
  footage/hero-shot.mov (15 GB)
  project-files/ (45 MB)`}
      />

      <h2>Retrieval from Cold Storage</h2>

      <Alert className="not-prose my-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Archive Retrieval Times</AlertTitle>
        <AlertDescription>
          Cold storage (Glacier, Archive tiers) has retrieval delays:
          <ul className="mt-2 list-disc list-inside">
            <li>Glacier Instant: 1-5 minutes</li>
            <li>Glacier Flexible: 3-5 hours</li>
            <li>Glacier Deep: 12-48 hours</li>
          </ul>
        </AlertDescription>
      </Alert>

      <CodeBlock
        language="bash"
        code={`# Request restoration (async)
$ dits storage restore footage/2023-archive/
Initiating restore from COLD storage...
Restore request submitted.
Estimated completion: 3-5 hours
You will be notified when ready.

# Check restore status
$ dits storage restore-status
In Progress:
  footage/2023-archive/ (156 GB)
    Status: RESTORING
    ETA: 2 hours remaining

# Fast restore (higher cost)
$ dits storage restore --expedited footage/urgent-file.mov
Expedited restore initiated.
Estimated completion: 1-5 minutes`}
      />

      <h2>Cost Optimization</h2>

      <h3>Analyze Storage Costs</h3>
      <CodeBlock
        language="bash"
        code={`$ dits storage cost-report

Monthly Cost Estimate:

  HOT (local): $0 (local storage)

  WARM (S3 Standard):
    Storage: 234.5 GB × $0.023/GB = $5.39
    Requests: 45,000 × $0.0004 = $0.18
    Transfer: 50 GB × $0.09/GB = $4.50
    Subtotal: $10.07

  COLD (Glacier Flexible):
    Storage: 1.2 TB × $0.004/GB = $4.80
    Retrieval: 2 restores × $0.03/GB = $3.00
    Subtotal: $7.80

  Total Estimated: $17.87/month

Optimization Suggestions:
  - Move 45 GB of inactive warm data to cold: Save $0.87/mo
  - Use Glacier Deep for 500 GB archive: Save $1.50/mo`}
      />

      <h3>Optimize Storage</h3>
      <CodeBlock
        language="bash"
        code={`# Run optimization analysis
$ dits storage optimize --dry-run

Optimization Plan:
  1. Archive 45 GB to COLD (not accessed in 90+ days)
     Savings: $0.87/month
  2. Deduplicate 12 GB across projects
     Savings: $0.28/month
  3. Remove 5 GB orphaned chunks
     Savings: $0.12/month

Total potential savings: $1.27/month

Apply optimizations? [y/N]`}
      />

      <h2>Multi-Region Configuration</h2>
      <CodeBlock
        language="bash"
        code={`# .dits/config
[storage.warm.primary]
    type = s3
    bucket = project-us-west
    region = us-west-2

[storage.warm.replica]
    type = s3
    bucket = project-eu-west
    region = eu-west-1

[storage.replication]
    enabled = true
    targets = primary, replica
    consistency = eventual`}
      />

      <h2>Storage Backends Configuration</h2>

      <h3>AWS S3</h3>
      <CodeBlock
        language="json"
        code={`[storage.warm]
    type = s3
    bucket = my-dits-bucket
    region = us-west-2
    accessKey = \${DITS_AWS_ACCESS_KEY}
    secretKey = \${DITS_AWS_SECRET_KEY}
    storageClass = STANDARD_IA  # or STANDARD, ONEZONE_IA`}
      />

      <h3>Google Cloud Storage</h3>
      <CodeBlock
        language="json"
        code={`[storage.warm]
    type = gcs
    bucket = my-dits-bucket
    project = my-project
    credentialsFile = ~/.config/gcloud/credentials.json
    storageClass = NEARLINE  # or STANDARD, COLDLINE, ARCHIVE`}
      />

      <h3>Azure Blob Storage</h3>
      <CodeBlock
        language="json"
        code={`[storage.warm]
    type = azure
    container = my-dits-container
    accountName = myaccount
    accountKey = \${DITS_AZURE_KEY}
    tier = Cool  # or Hot, Archive`}
      />

      <h2>Related Topics</h2>
      <ul>
        <li>
          <Link href="/docs/advanced/encryption">Encryption</Link>
        </li>
        <li>
          <Link href="/docs/cli/remotes">Remote Commands</Link>
        </li>
        <li>
          <Link href="/docs/configuration">Configuration</Link>
        </li>
      </ul>
    </div>
  );
}
