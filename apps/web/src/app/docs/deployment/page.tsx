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
import { Callout } from "@/components/ui/callout";
import { DocPageHeader } from "@/components/doc-page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  Cloud,
  Shield,
  CheckCircle
} from "lucide-react";

export const metadata: Metadata = {
  title: "Deployment Guide",
  description: "Deploy Dits in production environments using Docker, Kubernetes, and cloud providers",
};

export default function DeploymentPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <DocPageHeader
        eyebrow="Deployment"
        title="Deployment Guide"
        description="Deploy Dits in production environments with high availability, scalability, and security. Choose from Docker, Kubernetes, or cloud-managed solutions."
      />

      <Callout type="tip" title="Production Ready" className="not-prose my-6">
        Dits is designed for production deployment with built-in monitoring,
        backups, and scaling capabilities.
      </Callout>

      <h2>Deployment Options</h2>

      <div className="not-prose grid gap-6 md:grid-cols-3 my-8">
        <Card className="border-brand/40 bg-brand/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand">
              <Server className="h-5 w-5 text-brand" />
              Self-Hosted
            </CardTitle>
            <CardDescription>
              Full control with Docker/Kubernetes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>Complete data sovereignty</li>
              <li>Custom scaling policies</li>
              <li>On-premise deployment</li>
              <li>Enterprise security</li>
            </ul>
            <div className="mt-4">
              <Badge variant="secondary">Most Flexible</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              Cloud Managed
            </CardTitle>
            <CardDescription>
              Hosted platform with Ditshub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>Zero infrastructure management</li>
              <li>Automatic scaling</li>
              <li>Built-in backups</li>
              <li>Global CDN</li>
            </ul>
            <div className="mt-4">
              <Badge variant="secondary">Easiest</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              Hybrid
            </CardTitle>
            <CardDescription>
              Mix of self-hosted and cloud
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>Sensitive data on-premise</li>
              <li>Public assets in cloud</li>
              <li>Geographic compliance</li>
              <li>Cost optimization</li>
            </ul>
            <div className="mt-4">
              <Badge variant="secondary">Balanced</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Architecture Overview</h2>

      <div className="not-prose bg-muted p-6 rounded-lg my-6">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-semibold mb-4">Core Components</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-info rounded-full"></div>
                <div>
                  <strong>API Server</strong>
                  <p className="text-sm text-muted-foreground">REST API, authentication, metadata</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <div>
                  <strong>Storage Service</strong>
                  <p className="text-sm text-muted-foreground">Chunk storage, deduplication, retrieval</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <div>
                  <strong>Database</strong>
                  <p className="text-sm text-muted-foreground">PostgreSQL for metadata, Redis for caching</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-brand rounded-full"></div>
                <div>
                  <strong>Worker Queue</strong>
                  <p className="text-sm text-muted-foreground">Background processing, cleanup, maintenance</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Data Flow</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-info">→</span>
                <span>Client uploads file via API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-success">→</span>
                <span>Storage service chunks and stores</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-warning">→</span>
                <span>Metadata saved to database</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-brand">→</span>
                <span>Workers handle cleanup and optimization</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Prerequisites</h2>

      <Tabs defaultValue="infrastructure" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="networking">Networking</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="infrastructure" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compute Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Server:</span>
                  <Badge variant="outline">2-4 vCPUs, 4-8GB RAM</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Storage Service:</span>
                  <Badge variant="outline">4-8 vCPUs, 16-32GB RAM</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Database:</span>
                  <Badge variant="outline">4-8 vCPUs, 16-32GB RAM</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Workers:</span>
                  <Badge variant="outline">2-4 vCPUs, 8-16GB RAM</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scaling Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <strong>Small Teams (1-50 users):</strong>
                  <p className="text-muted-foreground">Single server, 8-16 vCPUs total</p>
                </div>
                <div className="text-sm">
                  <strong>Medium Teams (50-500 users):</strong>
                  <p className="text-muted-foreground">3-5 servers, load balancing</p>
                </div>
                <div className="text-sm">
                  <strong>Large Organizations:</strong>
                  <p className="text-muted-foreground">Kubernetes cluster, auto-scaling</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="networking" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Network Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <strong>Bandwidth:</strong>
                  <p className="text-muted-foreground">1-10 Gbps depending on usage</p>
                </div>
                <div className="text-sm">
                  <strong>Latency:</strong>
                  <p className="text-muted-foreground">&lt;50ms between services</p>
                </div>
                <div className="text-sm">
                  <strong>Ports:</strong>
                  <p className="text-muted-foreground">443 (HTTPS), 5432 (PostgreSQL), 6379 (Redis)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Load Balancing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <strong>SSL Termination:</strong>
                  <p className="text-muted-foreground">Required for HTTPS</p>
                </div>
                <div className="text-sm">
                  <strong>Session Affinity:</strong>
                  <p className="text-muted-foreground">Not required (stateless API)</p>
                </div>
                <div className="text-sm">
                  <strong>Health Checks:</strong>
                  <p className="text-muted-foreground">HTTP /health endpoint</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Storage Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <strong>Local Disk:</strong>
                  <p className="text-muted-foreground">SSD/NVMe for best performance</p>
                </div>
                <div className="text-sm">
                  <strong>NFS:</strong>
                  <p className="text-muted-foreground">For shared storage clusters</p>
                </div>
                <div className="text-sm">
                  <strong>Object Storage:</strong>
                  <p className="text-muted-foreground">S3-compatible for scalability</p>
                </div>
                <div className="text-sm">
                  <strong>Hybrid:</strong>
                  <p className="text-muted-foreground">Hot data local, cold data remote</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capacity Planning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <strong>Database:</strong>
                  <p className="text-muted-foreground">100GB initial, grows with usage</p>
                </div>
                <div className="text-sm">
                  <strong>Chunk Storage:</strong>
                  <p className="text-muted-foreground">Plan for 2-5x logical data size</p>
                </div>
                <div className="text-sm">
                  <strong>Backups:</strong>
                  <p className="text-muted-foreground">Additional 100% for retention</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <h2>Quick Start Deployments</h2>

      <div className="not-prose grid gap-6 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Docker Compose (Development)
            </CardTitle>
            <CardDescription>
              Perfect for testing and small teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <strong>Components:</strong>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>PostgreSQL database</li>
                  <li>Redis cache</li>
                  <li>Dits API server</li>
                  <li>MinIO object storage</li>
                </ul>
              </div>
              <div className="text-sm">
                <strong>Setup time:</strong> 5-10 minutes
              </div>
              <Link href="/docs/deployment/docker" className="text-brand hover:underline text-sm">
                View Docker deployment guide →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Kubernetes (Production)
            </CardTitle>
            <CardDescription>
              Scalable production deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <strong>Features:</strong>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>Auto-scaling</li>
                  <li>Rolling updates</li>
                  <li>Persistent storage</li>
                  <li>Service mesh</li>
                </ul>
              </div>
              <div className="text-sm">
                <strong>Setup time:</strong> 30-60 minutes
              </div>
              <Link href="/docs/deployment/kubernetes" className="text-brand hover:underline text-sm">
                View Kubernetes deployment guide →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Configuration</h2>

      <h3>Environment Variables</h3>
      <div className="overflow-x-auto my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono">DATABASE_URL</TableCell>
              <TableCell>PostgreSQL connection string</TableCell>
              <TableCell>-</TableCell>
              <TableCell><CheckCircle className="h-4 w-4 text-success" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">REDIS_URL</TableCell>
              <TableCell>Redis connection URL</TableCell>
              <TableCell>redis://localhost:6379</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">JWT_SECRET</TableCell>
              <TableCell>Secret for JWT token signing</TableCell>
              <TableCell>-</TableCell>
              <TableCell><CheckCircle className="h-4 w-4 text-success" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">STORAGE_TYPE</TableCell>
              <TableCell>Storage backend (local, s3, minio)</TableCell>
              <TableCell>local</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">API_PORT</TableCell>
              <TableCell>Port for API server</TableCell>
              <TableCell>8080</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <h2>Security Considerations</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Network Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>HTTPS/TLS 1.3 encryption</li>
              <li>Network segmentation</li>
              <li>Firewall rules</li>
              <li>VPN for admin access</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>At-rest encryption</li>
              <li>Content integrity verification</li>
              <li>Backup encryption</li>
              <li>Secure key management</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Monitoring &amp; Maintenance</h2>

      <Callout type="note" title="Health Checks" className="not-prose my-6">
        All services expose health check endpoints at <code>/health</code> for load balancer monitoring.
      </Callout>

      <h3>Key Metrics to Monitor</h3>
      <div className="not-prose grid gap-4 md:grid-cols-3 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>API response times</li>
              <li>Chunk upload/download speeds</li>
              <li>Database query latency</li>
              <li>Cache hit rates</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>CPU utilization</li>
              <li>Memory usage</li>
              <li>Disk I/O</li>
              <li>Network bandwidth</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Active users</li>
              <li>Storage usage</li>
              <li>Repository count</li>
              <li>API call volume</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Backup &amp; Recovery</h2>

      <div className="not-prose bg-muted p-6 rounded-lg my-6">
        <h3 className="font-semibold mb-4">Backup Strategy</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Database Backups</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Daily full backups</li>
              <li>Hourly incremental backups</li>
              <li>Point-in-time recovery</li>
              <li>Encrypted storage</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Chunk Storage Backups</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Cross-region replication</li>
              <li>Immutable backups</li>
              <li>Content verification</li>
              <li>Retention policies</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Support &amp; Resources</h2>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><Link href="/docs/deployment/docker" className="text-brand hover:underline">Docker Guide</Link></li>
              <li><Link href="/docs/deployment/kubernetes" className="text-brand hover:underline">Kubernetes Guide</Link></li>
              <li><Link href="/docs/deployment/self-hosting" className="text-brand hover:underline">Self-Hosting Guide</Link></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><Link href="https://github.com/byronwade/dits/discussions" className="text-brand hover:underline">GitHub Discussions</Link></li>
              <li><Link href="https://github.com/byronwade/dits/issues" className="text-brand hover:underline">Issue Tracker</Link></li>
              <li><Link href="/docs/troubleshooting" className="text-brand hover:underline">Troubleshooting Guide</Link></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>Deployment consulting</li>
              <li>Performance optimization</li>
              <li>Enterprise integration</li>
              <li>Custom development</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Callout type="note" title="Need Help?" className="not-prose my-6">
        For deployment assistance or enterprise requirements,{" "}
        <Link href="/contact" className="underline">contact our team</Link> or{" "}
        <Link href="https://github.com/byronwade/dits/discussions" className="underline">join the community</Link>.
      </Callout>
    </div>
  );
}
