import { Metadata } from "next";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Info, Terminal, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Installation",
  description: "Install Dits on your system",
};

const platforms = [
  {
    os: "macOS",
    architectures: ["Apple Silicon (M1/M2/M3)", "Intel x64"],
    minVersion: "macOS 11 (Big Sur)",
    notes: "macFUSE required for VFS features",
  },
  {
    os: "Linux",
    architectures: ["x64 (glibc)", "ARM64 (glibc)", "x64 (musl)", "ARM64 (musl)"],
    minVersion: "glibc 2.17+ or musl",
    notes: "FUSE3 required for VFS features",
  },
  {
    os: "Windows",
    architectures: ["x64", "ARM64"],
    minVersion: "Windows 10",
    notes: "Dokany required for VFS features",
  },
];

export default function InstallationPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Installation</h1>
      <p className="lead text-xl text-muted-foreground">
        Dits can be installed on macOS, Linux, and Windows. Choose the installation
        method that works best for your workflow.
      </p>

      <h2>Quick Install</h2>
      <p>
        The fastest way to install Dits is via npm, which works on all platforms
        and automatically downloads the correct binary for your system.
      </p>

      <Tabs defaultValue="npm" className="not-prose my-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="npm">npm</TabsTrigger>
          <TabsTrigger value="curl">curl</TabsTrigger>
          <TabsTrigger value="brew">Homebrew</TabsTrigger>
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
        </TabsList>

        <TabsContent value="npm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                npm / bun / pnpm
                <Badge variant="secondary">Recommended</Badge>
              </CardTitle>
              <CardDescription>
                Works on all platforms. No Rust toolchain required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                <code>{`# npm
npm install -g @byronwade/dits

# bun
bun install -g @byronwade/dits

# pnpm
pnpm install -g @byronwade/dits`}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Shell Script</CardTitle>
              <CardDescription>
                One-liner installation for macOS and Linux.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                <code>curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh</code>
              </pre>
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Security Note</AlertTitle>
                <AlertDescription>
                  You can inspect the script before running it by opening the URL
                  in your browser or using <code>curl -fsSL URL</code> without piping to sh.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brew" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Homebrew</CardTitle>
              <CardDescription>
                For macOS and Linux users who prefer Homebrew.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                <code>{`# Add the tap
brew tap byronwade/dits

# Install
brew install dits`}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cargo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cargo</CardTitle>
              <CardDescription>
                Build from source. Requires Rust 1.75 or later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                <code>{`# Install Rust if needed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Dits
cargo install dits`}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <h2>System Requirements</h2>
      <Table className="not-prose my-6">
        <TableHeader>
          <TableRow>
            <TableHead>Operating System</TableHead>
            <TableHead>Architectures</TableHead>
            <TableHead>Minimum Version</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {platforms.map((platform) => (
            <TableRow key={platform.os}>
              <TableCell className="font-medium">{platform.os}</TableCell>
              <TableCell>
                <ul className="list-none p-0 m-0 space-y-1">
                  {platform.architectures.map((arch) => (
                    <li key={arch} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {arch}
                    </li>
                  ))}
                </ul>
              </TableCell>
              <TableCell>{platform.minVersion}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {platform.notes}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2>Verify Installation</h2>
      <p>After installation, verify that Dits is working correctly:</p>
      <pre className="not-prose">
        <code>{`$ dits --version
dits 0.1.2

$ dits --help
Dits - Distributed version control for video and large files

Usage: dits <COMMAND>

Commands:
  init      Create a new repository
  clone     Clone a repository
  status    Show repository status
  add       Add files to staging
  commit    Create a commit
  ...`}</code>
      </pre>

      <h2>Installing FUSE (Optional)</h2>
      <p>
        FUSE is only required if you want to use the Virtual Filesystem feature,
        which allows you to mount repositories as drives without downloading all
        files.
      </p>

      <Tabs defaultValue="macos-fuse" className="not-prose my-6">
        <TabsList>
          <TabsTrigger value="macos-fuse">macOS</TabsTrigger>
          <TabsTrigger value="linux-fuse">Linux</TabsTrigger>
          <TabsTrigger value="windows-fuse">Windows</TabsTrigger>
        </TabsList>

        <TabsContent value="macos-fuse" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>macFUSE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4">
                <code>brew install macfuse</code>
              </pre>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>System Extension Required</AlertTitle>
                <AlertDescription>
                  macFUSE requires enabling a system extension. Follow the
                  prompts after installation and restart your Mac.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linux-fuse" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>FUSE3</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                <code>{`# Debian/Ubuntu
sudo apt install fuse3

# Fedora
sudo dnf install fuse3

# Arch Linux
sudo pacman -S fuse3`}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="windows-fuse" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dokany</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Download and install Dokany from the official website:
              </p>
              <a
                href="https://github.com/dokan-dev/dokany/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://github.com/dokan-dev/dokany/releases
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <h2>Troubleshooting</h2>

      <h3>Command not found</h3>
      <p>
        If you get a &quot;command not found&quot; error after installation, ensure that the
        installation directory is in your PATH:
      </p>
      <pre className="not-prose">
        <code>{`# For npm global installs, add to your shell profile:
export PATH="$PATH:$(npm config get prefix)/bin"

# For cargo installs:
export PATH="$PATH:$HOME/.cargo/bin"`}</code>
      </pre>

      <h3>Permission denied</h3>
      <p>
        On macOS or Linux, if you get permission errors with the curl installer:
      </p>
      <pre className="not-prose">
        <code>{`# Install to a local directory
curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh -s -- --prefix=$HOME/.local`}</code>
      </pre>

      <h3>SSL/TLS errors</h3>
      <p>
        If you encounter SSL certificate errors, ensure your system&apos;s CA
        certificates are up to date:
      </p>
      <pre className="not-prose">
        <code>{`# macOS
brew install ca-certificates

# Ubuntu/Debian
sudo apt update && sudo apt install ca-certificates`}</code>
      </pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          Follow the <Link href="/docs/getting-started">Quick Start Guide</Link>{" "}
          to create your first repository
        </li>
        <li>
          Learn about <Link href="/docs/concepts">Core Concepts</Link>
        </li>
        <li>
          Explore the <Link href="/docs/cli-reference">CLI Reference</Link>
        </li>
      </ul>
    </div>
  );
}
