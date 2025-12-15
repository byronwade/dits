import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Download,
  Apple,
  Terminal,
  Package,
  Github,
  CheckCircle2,
  Info,
} from "lucide-react";

/**
 * Download page following AGENTS.md guidelines:
 * - MUST: Main content has id for skip-link target
 * - MUST: Proper heading hierarchy
 * - MUST: Accessible icons with aria-hidden
 * - MUST: Links are links (using <a>/<Link>)
 */

import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata: Metadata = genMeta({
  title: "Download Dits - Version Control for Video & Large Files",
  description: "Download Dits for macOS, Linux, and Windows. Install via npm, Homebrew, Cargo, or download binaries directly. Free and open source version control for video production.",
  canonical: "https://dits.dev/download",
  keywords: [
    "download dits",
    "install dits",
    "dits installation",
    "dits download",
    "version control download",
    "video version control software",
    "macos version control",
    "linux version control",
    "windows version control",
  ],
  openGraph: {
    type: "website",
    images: [
      {
        url: "/dits.png",
        width: 1200,
        height: 630,
        alt: "Download Dits - Version Control for Video & Large Files",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
});

const platforms = [
  {
    name: "macOS",
    icon: Apple,
    versions: [
      { arch: "Apple Silicon (M1/M2/M3)", file: "dits-darwin-arm64.tar.gz" },
      { arch: "Intel", file: "dits-darwin-x64.tar.gz" },
    ],
  },
  {
    name: "Linux",
    icon: Terminal,
    versions: [
      { arch: "x64 (glibc)", file: "dits-linux-x64.tar.gz" },
      { arch: "ARM64 (glibc)", file: "dits-linux-arm64.tar.gz" },
      { arch: "x64 (musl/Alpine)", file: "dits-linux-x64-musl.tar.gz" },
      { arch: "ARM64 (musl/Alpine)", file: "dits-linux-arm64-musl.tar.gz" },
    ],
  },
  {
    name: "Windows",
    icon: Package,
    versions: [
      { arch: "x64", file: "dits-win32-x64.zip" },
      { arch: "ARM64", file: "dits-win32-arm64.zip" },
    ],
  },
];

const requirements = {
  macos: [
    "macOS 11 (Big Sur) or later",
    "macFUSE for VFS: brew install macfuse",
  ],
  linux: [
    "glibc 2.17+ or musl",
    "FUSE3 for VFS: apt install fuse3",
  ],
  windows: [
    "Windows 10 or later",
    "Dokany for VFS (optional)",
  ],
};

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* AGENTS.md: main with id for skip-link */}
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section className="container py-16 md:py-24" aria-labelledby="download-heading">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4">v0.1.2</Badge>
            <h1 id="download-heading" className="text-4xl font-bold tracking-tight md:text-5xl">
              Download Dits
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Choose your platform and installation method. Dits is available
              for macOS, Linux, and Windows.
            </p>
          </div>
        </section>

        {/* Quick Install */}
        <section className="border-y bg-muted/50" aria-labelledby="quick-install-heading">
          <div className="container py-12">
            <div className="mx-auto max-w-3xl">
              <h2 id="quick-install-heading" className="text-2xl font-bold text-center mb-6">
                Quick Install
              </h2>
              <Tabs defaultValue="npm" className="w-full">
                {/* AGENTS.md: Tabs have proper focus styling via shadcn/ui */}
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="npm">npm</TabsTrigger>
                  <TabsTrigger value="curl">curl</TabsTrigger>
                  <TabsTrigger value="brew">Homebrew</TabsTrigger>
                  <TabsTrigger value="cargo">Cargo</TabsTrigger>
                </TabsList>
                <TabsContent value="npm" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">npm / bun / pnpm</CardTitle>
                      <CardDescription>
                        Recommended for most users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                        <code>npm install -g @byronwade/dits</code>
                      </pre>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline">Cross-platform</Badge>
                        <Badge variant="outline">Auto-updates</Badge>
                        <Badge variant="outline">No Rust required</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="curl" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Shell Script</CardTitle>
                      <CardDescription>
                        Quick one-liner installation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                        <code>
                          curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
                        </code>
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="brew" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Homebrew</CardTitle>
                      <CardDescription>For macOS and Linux</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                        <code>
                          brew tap byronwade/dits && brew install dits
                        </code>
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="cargo" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cargo</CardTitle>
                      <CardDescription>
                        Build from source (requires Rust)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto">
                        <code>cargo install dits</code>
                      </pre>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Requires Rust 1.75 or later
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Manual Download */}
        <section className="container py-16" aria-labelledby="manual-download-heading">
          <div className="mx-auto max-w-4xl">
            <h2 id="manual-download-heading" className="text-2xl font-bold text-center mb-8">
              Manual Download
            </h2>
            <div className="grid gap-6 md:grid-cols-3" role="list">
              {platforms.map((platform) => (
                <Card key={platform.name} role="listitem">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {/* AGENTS.md: Decorative icons are aria-hidden */}
                      <platform.icon className="h-8 w-8 text-primary" aria-hidden="true" />
                      <CardTitle>{platform.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {platform.versions.map((version) => (
                      <Button
                        key={version.file}
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <Link
                          href={`https://github.com/byronwade/dits/releases/latest/download/${version.file}`}
                          aria-label={`Download Dits for ${platform.name} ${version.arch}`}
                        >
                          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                          {version.arch}
                        </Link>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button variant="outline" asChild>
                <Link
                  href="https://github.com/byronwade/dits/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View all Dits releases on GitHub (opens in new tab)"
                >
                  <Github className="mr-2 h-4 w-4" aria-hidden="true" />
                  View All Releases
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="border-t bg-muted/50" aria-labelledby="requirements-heading">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl">
              <h2 id="requirements-heading" className="text-2xl font-bold text-center mb-8">
                System Requirements
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Apple className="h-5 w-5" aria-hidden="true" /> macOS
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {requirements.macos.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Terminal className="h-5 w-5" aria-hidden="true" /> Linux
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {requirements.linux.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" aria-hidden="true" /> Windows
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {requirements.windows.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* AGENTS.md: Alert with proper semantics */}
              <Alert className="mt-8" role="note">
                <Info className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>FUSE is Optional</AlertTitle>
                <AlertDescription>
                  FUSE is only required for the virtual filesystem feature
                  (mounting repositories as drives). All other Dits features
                  work without it.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </section>

        {/* Verify Installation */}
        <section className="container py-16" aria-labelledby="verify-heading">
          <div className="mx-auto max-w-3xl">
            <h2 id="verify-heading" className="text-2xl font-bold text-center mb-8">
              Verify Installation
            </h2>
            <Card>
              <CardContent className="pt-6">
                <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto font-mono text-sm">
                  <code>{`$ dits --version
dits 0.1.2

$ dits init my-project
Initialized empty Dits repository in /home/user/my-project/.dits

$ cd my-project && dits status
On branch main
No commits yet`}</code>
                </pre>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <Button asChild>
                <Link href="/docs/getting-started">
                  Continue to Getting Started Guide
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
