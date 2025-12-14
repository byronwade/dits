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
import { Server, Shield, Database, Settings, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Self-Hosting Guide",
    description: "Complete guide to self-hosting Dits on your own infrastructure",
};

export default function SelfHostingPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Self-Hosting Guide</h1>
            <p className="lead text-xl text-muted-foreground">
                Run Dits on your own infrastructure with complete control over your data,
                security, and customization.
            </p>

            <Alert className="not-prose my-6">
                <Shield className="h-4 w-4" />
                <AlertTitle>Full Data Sovereignty</AlertTitle>
                <AlertDescription>
                    Self-hosting gives you complete control over your data and compliance
                    with any regulatory requirements.
                </AlertDescription>
            </Alert>

            <h2>Why Self-Host?</h2>

            <div className="grid gap-6 md:grid-cols-3 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Security & Privacy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Complete data ownership</li>
                            <li>Custom security policies</li>
                            <li>Air-gapped networks</li>
                            <li>Regulatory compliance</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Customization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Custom integrations</li>
                            <li>Modified workflows</li>
                            <li>Branding options</li>
                            <li>Feature flags</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            Infrastructure Control
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Choose your hardware</li>
                            <li>Storage optimization</li>
                            <li>Network configuration</li>
                            <li>Cost management</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>System Requirements</h2>

            <div className="overflow-x-auto my-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Minimum</TableHead>
                            <TableHead>Recommended</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>CPU</TableCell>
                            <TableCell>4 cores</TableCell>
                            <TableCell>8+ cores</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>RAM</TableCell>
                            <TableCell>8 GB</TableCell>
                            <TableCell>32+ GB</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Storage</TableCell>
                            <TableCell>100 GB SSD</TableCell>
                            <TableCell>1+ TB NVMe</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Network</TableCell>
                            <TableCell>100 Mbps</TableCell>
                            <TableCell>1+ Gbps</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>OS</TableCell>
                            <TableCell colSpan={2}>Linux (Ubuntu 22.04, Debian 12, RHEL 9)</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <h2>Installation Methods</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Docker (Recommended)</CardTitle>
                        <CardDescription>
                            Fastest and easiest deployment method
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Docker Compose for quick setup with all dependencies included.
                        </p>
                        <Link href="/docs/deployment/docker" className="text-primary hover:underline text-sm">
                            View Docker deployment guide →
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Binary Installation</CardTitle>
                        <CardDescription>
                            Direct installation without containers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Download latest release
curl -LO https://releases.dits.io/latest/dits-server

# Make executable
chmod +x dits-server

# Run server
./dits-server --config /etc/dits/config.toml`}</code></pre>
                    </CardContent>
                </Card>
            </div>

            <h2>Configuration</h2>

            <h3>Server Configuration File</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# /etc/dits/config.toml

[server]
host = "0.0.0.0"
port = 8080
tls_cert = "/etc/dits/ssl/cert.pem"
tls_key = "/etc/dits/ssl/key.pem"

[database]
url = "postgres://dits:password@localhost:5432/dits"
max_connections = 50
ssl_mode = "require"

[storage]
type = "local"
path = "/var/lib/dits/chunks"
# Or use S3-compatible storage:
# type = "s3"
# bucket = "dits-chunks"
# region = "us-east-1"

[cache]
type = "redis"
url = "redis://localhost:6379"
size = "4GB"

[auth]
jwt_secret = "your-secure-secret"
token_expiry = "24h"

[logging]
level = "info"
format = "json"
output = "/var/log/dits/server.log"`}</code></pre>

            <h2>Security Hardening</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Recommended Security Measures</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium mb-2">Network Security</h4>
                        <ul className="text-sm space-y-1">
                            <li>Enable TLS 1.3 for all connections</li>
                            <li>Use firewall to restrict access</li>
                            <li>Set up VPN for admin access</li>
                            <li>Enable rate limiting</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">System Security</h4>
                        <ul className="text-sm space-y-1">
                            <li>Run as non-root user</li>
                            <li>Enable SELinux/AppArmor</li>
                            <li>Keep system updated</li>
                            <li>Use encrypted storage</li>
                        </ul>
                    </div>
                </div>
            </div>

            <h2>Systemd Service</h2>

            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# /etc/systemd/system/dits.service

[Unit]
Description=Dits Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=dits
Group=dits
ExecStart=/usr/local/bin/dits-server --config /etc/dits/config.toml
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target`}</code></pre>

            <pre className="bg-muted p-4 rounded-lg overflow-x-auto mt-4"><code>{`# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable dits
sudo systemctl start dits

# Check status
sudo systemctl status dits`}</code></pre>

            <h2>Backup Strategy</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Database Backup</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Daily database backup
pg_dump -U dits dits | gzip > \\
  /backups/db-$(date +%Y%m%d).sql.gz

# Point-in-time recovery
# Configure WAL archiving in postgresql.conf`}</code></pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Chunk Storage Backup</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Incremental backup with rsync
rsync -avz --delete \\
  /var/lib/dits/chunks/ \\
  backup-server:/backups/chunks/

# Or use deduplicating backup
restic backup /var/lib/dits/chunks`}</code></pre>
                    </CardContent>
                </Card>
            </div>

            <Alert className="not-prose my-6">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Need Help?</AlertTitle>
                <AlertDescription>
                    See our <Link href="/docs/troubleshooting" className="underline">troubleshooting guide</Link> for
                    common issues, or join the community for support.
                </AlertDescription>
            </Alert>
        </div>
    );
}
