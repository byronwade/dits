import { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Info, Terminal, HardDrive, Network } from "lucide-react";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "Common issues and solutions for Dits",
};

export default function TroubleshootingPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Troubleshooting Guide</h1>
      <p className="lead text-xl text-muted-foreground">
        Common issues and their solutions. If you can't find your issue here,
        check the <Link href="https://github.com/byronwade/dits/issues">GitHub Issues</Link> or
        join our <Link href="https://github.com/byronwade/dits/discussions">community discussions</Link>.
      </p>

      <Tabs defaultValue="installation" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="basic-usage">Basic Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="installation" className="mt-6">
          <h2>Installation Issues</h2>

          <h3>Command not found after installation</h3>
          <Alert className="not-prose my-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Check if Dits is in your PATH:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Check where dits was installed
which dits

# If not found, add to PATH
export PATH="$HOME/.dits/bin:$PATH"

# Or move to system location (requires sudo)
sudo cp $(which dits) /usr/local/bin/`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Permission denied during installation</h3>
          <Alert className="not-prose my-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Use a local installation directory:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Install to user directory
curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | bash -s -- --prefix ~/.local

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Rust toolchain not found</h3>
          <Alert className="not-prose my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>For building from source</AlertTitle>
            <AlertDescription>
              <p>Install Rust using rustup:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version`}</code>
              </pre>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="basic-usage" className="mt-6">
          <h2>Basic Usage Issues</h2>

          <h3>"Repository not found" error</h3>
          <Alert className="not-prose my-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>You need to initialize a Dits repository first:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Initialize in current directory
dits init

# Check if .dits directory was created
ls -la .dits/`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Files not showing in status</h3>
          <Alert className="not-prose my-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Files need to be explicitly added to staging:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Add specific file
dits add myfile.mp4

# Add all files in directory
dits add .

# Check status
dits status`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Commit fails with no changes</h3>
          <Alert className="not-prose my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>You need staged changes to commit:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Check what's staged
dits status

# Stage files if needed
dits add .

# Then commit
dits commit -m "Your message"`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Large files causing out of memory</h3>
          <Alert className="not-prose my-4">
            <HardDrive className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Dits uses streaming chunking, but very large files may need more memory:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Increase available memory
export DITS_CHUNK_MEMORY_MB=1024

# Or use smaller chunk sizes (trades speed for memory)
dits config chunk.avg_size 32KB`}</code>
              </pre>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <h2>Performance Issues</h2>

          <h3>Slow chunking of large files</h3>
          <Alert className="not-prose my-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Expected behavior</AlertTitle>
            <AlertDescription>
              <p>Chunking is CPU-intensive but should be reasonable:</p>
              <ul className="mt-2 space-y-1">
                <li><strong>10GB file:</strong> ~30-60 seconds on modern hardware</li>
                <li><strong>100GB file:</strong> ~5-10 minutes</li>
                <li><strong>SSD storage:</strong> Much faster than HDD</li>
              </ul>
              <p className="mt-2">If significantly slower, check:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# CPU usage during chunking
top -p $(pgrep dits)

# Disk I/O
iostat -x 1`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Slow network transfers</h3>
          <Alert className="not-prose my-4">
            <Network className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Optimize network settings:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Increase connection pool
dits config network.max_connections 16

# Use resumable uploads
dits config network.resumable_uploads true

# Check network speed
dits config network.bandwidth_test`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>High memory usage</h3>
          <Alert className="not-prose my-4">
            <HardDrive className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Configure memory limits:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Limit memory per operation
dits config memory.max_per_operation 512MB

# Use disk buffering for large files
dits config storage.use_disk_buffer true

# Monitor memory usage
dits config debug.memory_profile true`}</code>
              </pre>
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <h2>Advanced Issues</h2>

          <h3>VFS mount not working</h3>
          <Alert className="not-prose my-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>FUSE Requirements</AlertTitle>
            <AlertDescription>
              <p>Install FUSE for your platform:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# macOS
brew install macfuse

# Ubuntu/Debian
sudo apt install fuse3 libfuse3-dev

# CentOS/RHEL
sudo yum install fuse3 fuse3-devel

# Test FUSE
dits mount --test /tmp/test-mount`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Chunk verification failures</h3>
          <Alert className="not-prose my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical: Check data integrity</AlertTitle>
            <AlertDescription>
              <p>This indicates data corruption:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Verify repository integrity
dits fsck

# Find corrupted chunks
dits fsck --verbose

# Recover from backup or remote
dits pull origin main --force`}</code>
              </pre>
              <p className="mt-2 text-sm">
                <strong>Never ignore checksum failures.</strong> They indicate data corruption that needs immediate attention.
              </p>
            </AlertDescription>
          </Alert>

          <h3>Lock conflicts with team collaboration</h3>
          <Alert className="not-prose my-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Check and resolve locks:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# See all locks
dits locks

# Unlock specific file
dits unlock path/to/file.mp4

# Force unlock (admin only)
dits unlock path/to/file.mp4 --force`}</code>
              </pre>
            </AlertDescription>
          </Alert>

          <h3>Storage quota exceeded</h3>
          <Alert className="not-prose my-4">
            <HardDrive className="h-4 w-4" />
            <AlertTitle>Solution</AlertTitle>
            <AlertDescription>
              <p>Manage storage usage:</p>
              <pre className="bg-muted p-3 rounded text-sm mt-2">
                <code>{`# Check storage usage
dits repo-stats

# Run garbage collection
dits gc

# Clean old branches/tags
dits branch --list --merged | xargs dits branch -d

# Move to cold storage
dits storage archive --older-than 90d`}</code>
              </pre>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <h2>Getting More Help</h2>

      <div className="not-prose grid gap-4 md:grid-cols-3 my-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documentation</CardTitle>
            <CardDescription>Explore comprehensive guides</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li><Link href="/docs/cli-reference">CLI Reference</Link></li>
              <li><Link href="/docs/configuration">Configuration Guide</Link></li>
              <li><Link href="/docs/api/rest">API Documentation</Link></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Community Support</CardTitle>
            <CardDescription>Get help from the community</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li><Link href="https://github.com/byronwade/dits/discussions">GitHub Discussions</Link></li>
              <li><Link href="https://github.com/byronwade/dits/issues">Report Issues</Link></li>
              <li><Link href="/docs/contributing">Contributing Guide</Link></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
            <CardDescription>Collect info for bug reports</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-2 rounded text-xs">
              <code>{`dits --version
dits config --list
dits repo-stats
uname -a`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <Alert className="not-prose my-6">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Debug Mode</AlertTitle>
        <AlertDescription>
          For advanced troubleshooting, enable debug logging:
          <pre className="bg-muted p-3 rounded text-sm mt-2">
            <code>dits config debug.enabled true</code>
          </pre>
        </AlertDescription>
      </Alert>
    </div>
  );
}

