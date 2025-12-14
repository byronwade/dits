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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Lock,
  Key,
  Database,
  Network,
  AlertTriangle,
  CheckCircle,
  Users,
  Server
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security Architecture",
  description: "Dits security framework, encryption, and compliance features",
};

export default function SecurityPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Security Architecture</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits implements a comprehensive security framework designed for handling
        sensitive creative assets with end-to-end encryption, access controls,
        and compliance features.
      </p>

      <Alert className="not-prose my-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>Security First Design</AlertTitle>
        <AlertDescription>
          Security is built into every layer of Dits, from the wire protocol
          to data storage, ensuring your creative assets remain protected.
        </AlertDescription>
      </Alert>

      <h2>Security Principles</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              Defense in Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>Multiple security layers</li>
              <li>No single point of failure</li>
              <li>Secure defaults</li>
              <li>Principle of least privilege</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Zero Trust Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>Verify all access requests</li>
              <li>End-to-end encryption</li>
              <li>Continuous authentication</li>
              <li>Micro-segmentation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Encryption Layers</h2>

      <div className="space-y-6 my-8">
        <Card>
          <CardHeader>
            <CardTitle>Transport Layer Security (TLS 1.3)</CardTitle>
            <CardDescription>All network communications are encrypted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Features</h4>
                <ul className="text-sm space-y-1">
                  <li>Perfect forward secrecy</li>
                  <li>Certificate pinning support</li>
                  <li>Mutual TLS for service-to-service</li>
                  <li>HSTS headers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Protocols</h4>
                <ul className="text-sm space-y-1">
                  <li>HTTPS for web traffic</li>
                  <li>QUIC for chunk transfers</li>
                  <li>SSH for Git operations</li>
                  <li>mTLS for internal services</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Encryption (Phase 9)</CardTitle>
            <CardDescription>End-to-end encryption for stored data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">At Rest</h4>
                <ul className="text-sm space-y-1">
                  <li>AES-256-GCM encryption</li>
                  <li>Convergent encryption for deduplication</li>
                  <li>Key wrapping with user keys</li>
                  <li>Hardware security modules (HSM)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">In Transit</h4>
                <ul className="text-sm space-y-1">
                  <li>TLS 1.3 with PFS</li>
                  <li>QUIC with built-in encryption</li>
                  <li>Forward secrecy</li>
                  <li>Certificate validation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Management</CardTitle>
            <CardDescription>Secure key lifecycle and storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Key Types</h4>
                <Table className="not-prose">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key Type</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Rotation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Master Keys</TableCell>
                      <TableCell>Encrypt data encryption keys</TableCell>
                      <TableCell>HSM/KMS</TableCell>
                      <TableCell>Annual</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Data Keys</TableCell>
                      <TableCell>Encrypt chunk data</TableCell>
                      <TableCell>Database (encrypted)</TableCell>
                      <TableCell>Per upload</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">User Keys</TableCell>
                      <TableCell>User authentication</TableCell>
                      <TableCell>Derived from password</TableCell>
                      <TableCell>On password change</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Alert className="not-prose">
                <Key className="h-4 w-4" />
                <AlertTitle>Convergent Encryption</AlertTitle>
                <AlertDescription>
                  Dits uses convergent encryption for chunks, allowing deduplication while maintaining
                  security. The same data always produces the same ciphertext, enabling efficient storage
                  without compromising confidentiality.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Access Control</h2>

      <div className="grid gap-6 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>JWT Tokens:</strong>
              <p className="text-muted-foreground">Stateless authentication with expiration</p>
            </div>
            <div className="text-sm">
              <strong>API Keys:</strong>
              <p className="text-muted-foreground">Scoped tokens for programmatic access</p>
            </div>
            <div className="text-sm">
              <strong>SSH Keys:</strong>
              <p className="text-muted-foreground">Git-compatible authentication</p>
            </div>
            <div className="text-sm">
              <strong>SAML/OAuth:</strong>
              <p className="text-muted-foreground">Enterprise SSO integration</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Role-Based Access Control (RBAC):</strong>
              <ul className="mt-1 space-y-1">
                <li>Owner, Admin, Member, Guest roles</li>
                <li>Repository-level permissions</li>
                <li>Fine-grained access control</li>
              </ul>
            </div>
            <div className="text-sm">
              <strong>Object-Level Permissions:</strong>
              <ul className="mt-1 space-y-1">
                <li>File and directory access</li>
                <li>Branch protection rules</li>
                <li>Lock management</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Data Integrity & Verification</h2>

      <div className="grid gap-4 md:grid-cols-3 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>BLAKE3 hash verification</li>
              <li>Manifest integrity checks</li>
              <li>Chunk validation on read</li>
              <li>Corruption detection</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit Logging</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>All API operations logged</li>
              <li>File access tracking</li>
              <li>Authentication events</li>
              <li>Compliance reporting</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backup Security</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Encrypted backups</li>
              <li>Secure key storage</li>
              <li>Integrity verification</li>
              <li>Point-in-time recovery</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Network Security</h2>

      <Card className="my-6">
        <CardHeader>
          <CardTitle>Firewall & Network Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3">Perimeter Security</h4>
              <ul className="text-sm space-y-2">
                <li><strong>Web Application Firewall (WAF):</strong> SQL injection, XSS prevention</li>
                <li><strong>DDoS Protection:</strong> Rate limiting, traffic filtering</li>
                <li><strong>SSL/TLS Termination:</strong> Certificate management, HSTS</li>
                <li><strong>API Gateway:</strong> Request validation, throttling</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Internal Security</h4>
              <ul className="text-sm space-y-2">
                <li><strong>Service Mesh:</strong> mTLS between services</li>
                <li><strong>Network Segmentation:</strong> Zero trust networking</li>
                <li><strong>Container Security:</strong> Image scanning, runtime protection</li>
                <li><strong>Secrets Management:</strong> Encrypted secret storage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2>Compliance & Standards</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Industry Standards</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li><Badge variant="outline" className="mr-2">SOC 2</Badge> Security, availability, and confidentiality</li>
              <li><Badge variant="outline" className="mr-2">ISO 27001</Badge> Information security management</li>
              <li><Badge variant="outline" className="mr-2">GDPR</Badge> Data protection and privacy</li>
              <li><Badge variant="outline" className="mr-2">CCPA</Badge> California privacy rights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creative Industry Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li><Badge variant="outline" className="mr-2">MPAA</Badge> Content security standards</li>
              <li><Badge variant="outline" className="mr-2">SMPTE</Badge> Media technology standards</li>
              <li><Badge variant="outline" className="mr-2">C2PA</Badge> Content provenance and authenticity</li>
              <li><Badge variant="outline" className="mr-2">DDEX</Badge> Music industry standards</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2>Security Monitoring</h2>

      <div className="space-y-4 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Real-time Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="font-semibold mb-2">Access Monitoring</h4>
                <ul className="text-sm space-y-1">
                  <li>Authentication failures</li>
                  <li>Unauthorized access attempts</li>
                  <li>Suspicious activity patterns</li>
                  <li>Geographic access anomalies</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Protection</h4>
                <ul className="text-sm space-y-1">
                  <li>Encryption key access</li>
                  <li>Data exfiltration attempts</li>
                  <li>Backup integrity</li>
                  <li>Storage access patterns</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">System Security</h4>
                <ul className="text-sm space-y-1">
                  <li>Network intrusion attempts</li>
                  <li>Malware detection</li>
                  <li>Configuration changes</li>
                  <li>Performance anomalies</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Response Plan</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li><strong>Detection:</strong> Automated monitoring and alerting</li>
                  <li><strong>Assessment:</strong> Security team evaluation within 15 minutes</li>
                  <li><strong>Containment:</strong> Isolate affected systems</li>
                  <li><strong>Recovery:</strong> Restore from secure backups</li>
                  <li><strong>Lessons Learned:</strong> Post-incident review and improvements</li>
                </ol>
              </div>

              <Alert className="not-prose">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>24/7 Security Operations</AlertTitle>
                <AlertDescription>
                  Enterprise deployments include dedicated security operations center (SOC)
                  with 24/7 monitoring and incident response capabilities.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2>Privacy & Data Protection</h2>

      <Card className="my-6">
        <CardHeader>
          <CardTitle>Data Minimization & Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3">Data Collection</h4>
              <ul className="text-sm space-y-2">
                <li><strong>Minimal Data:</strong> Only collect necessary user information</li>
                <li><strong>Purpose Limitation:</strong> Data used only for stated purposes</li>
                <li><strong>Retention Limits:</strong> Data deleted when no longer needed</li>
                <li><strong>Consent Management:</strong> Clear user consent for data processing</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">User Rights</h4>
              <ul className="text-sm space-y-2">
                <li><strong>Access:</strong> Users can view their data</li>
                <li><strong>Portability:</strong> Export data in standard formats</li>
                <li><strong>Correction:</strong> Update inaccurate information</li>
                <li><strong>Deletion:</strong> Right to be forgotten</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2>Telemetry & Usage Analytics</h2>

      <Alert className="not-prose my-6">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Privacy-First Telemetry</AlertTitle>
        <AlertDescription>
          Dits includes optional, privacy-focused telemetry to help us improve the product.
          Unlike Git which has no telemetry, Dits collects anonymized usage data when enabled.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              What We Collect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Usage Statistics</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>Command usage frequency (e.g., "add", "commit", "push")</li>
                  <li>Performance metrics (operation duration, file sizes)</li>
                  <li>Error occurrences (anonymized error types)</li>
                  <li>Platform information (OS, architecture)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Anonymized Data Only</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>No file names, paths, or content</li>
                  <li>No user identifiers or personal data</li>
                  <li>No repository contents or metadata</li>
                  <li>Randomly generated session IDs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Privacy Guarantees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Data Protection</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li><strong>Opt-in only:</strong> Disabled by default</li>
                  <li><strong>Local storage:</strong> Data stored locally until uploaded</li>
                  <li><strong>Encrypted transmission:</strong> HTTPS/TLS 1.3</li>
                  <li><strong>Data minimization:</strong> Only essential metrics</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">User Control</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>Easy disable: <code>dits telemetry off</code></li>
                  <li>Status check: <code>dits telemetry status</code></li>
                  <li>Manual upload control</li>
                  <li>Clear data retention policies</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="my-8">
        <CardHeader>
          <CardTitle>Telemetry vs Git</CardTitle>
          <CardDescription>
            Understanding how Dits telemetry differs from Git's approach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aspect</TableHead>
                <TableHead>Git</TableHead>
                <TableHead>Dits</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Telemetry</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">None</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="text-xs">Optional</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  Git is purely local. Dits includes server features that benefit from usage insights.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Architecture</TableCell>
                <TableCell>Distributed, offline-first</TableCell>
                <TableCell>Hybrid (local + optional cloud)</TableCell>
                <TableCell className="text-sm">
                  Ditshub provides hosted collaboration features that Git doesn't offer.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Data Collection</TableCell>
                <TableCell>Zero data collection</TableCell>
                <TableCell>Anonymized usage statistics</TableCell>
                <TableCell className="text-sm">
                  Helps improve Ditshub services and user experience.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Privacy Controls</TableCell>
                <TableCell>N/A (no data collected)</TableCell>
                <TableCell>Opt-in, easy disable</TableCell>
                <TableCell className="text-sm">
                  Users have full control over data sharing preferences.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="my-8">
        <CardHeader>
          <CardTitle>Telemetry Commands</CardTitle>
          <CardDescription>
            Control telemetry settings from the command line
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Enable Telemetry</h4>
              <code className="text-sm bg-background px-2 py-1 rounded">
                dits telemetry enable
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Opt into telemetry and help improve Dits
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Disable Telemetry</h4>
              <code className="text-sm bg-background px-2 py-1 rounded">
                dits telemetry disable
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Turn off all telemetry collection
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Check Status</h4>
              <code className="text-sm bg-background px-2 py-1 rounded">
                dits telemetry status
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                View current telemetry settings and last upload
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert className="not-prose">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Transparency Commitment</AlertTitle>
        <AlertDescription>
          We believe in transparency about data practices. Telemetry helps us build better tools
          for creative professionals while respecting user privacy. You can always disable it,
          and we only collect the minimum data needed to improve Dits.
        </AlertDescription>
      </Alert>

      <h2>Security Best Practices</h2>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle>For Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <li className="text-sm">Implement least privilege access</li>
            <li className="text-sm">Regular security audits and penetration testing</li>
            <li className="text-sm">Employee security training</li>
            <li className="text-sm">Secure development lifecycle (SDL)</li>
            <li className="text-sm">Regular backup and disaster recovery testing</li>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>For Individual Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <li className="text-sm">Use strong, unique passwords</li>
            <li className="text-sm">Enable two-factor authentication</li>
            <li className="text-sm">Regularly review access permissions</li>
            <li className="text-sm">Keep software and systems updated</li>
            <li className="text-sm">Use encrypted connections (HTTPS)</li>
          </CardContent>
        </Card>
      </div>

      <Alert className="not-prose my-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>Security is Everyone's Responsibility</AlertTitle>
        <AlertDescription>
          While Dits provides robust security features, maintaining security requires
          cooperation between the platform, organizations, and users. Security is not
          a product, but a process.
        </AlertDescription>
      </Alert>

      <h2>Security Resources</h2>

      <div className="grid gap-4 md:grid-cols-3 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li><Link href="/docs/architecture/security">Security Architecture</Link></li>
              <li><Link href="/docs/api/webhooks">Webhook Security</Link></li>
              <li><Link href="/docs/troubleshooting">Security Troubleshooting</Link></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>GDPR Compliance Guide</li>
              <li>SOC 2 Report</li>
              <li>Security Whitepaper</li>
              <li>Penetration Test Reports</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Security Advisories</li>
              <li>Bug Bounty Program</li>
              <li>Security Contact</li>
              <li>Incident Response</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center my-8">
        <p className="text-sm text-muted-foreground">
          Security concerns or questions? Contact our security team at{" "}
          <Link href="mailto:security@dits.io" className="text-primary hover:underline">
            security@dits.io
          </Link>
        </p>
      </div>
    </div>
  );
}

