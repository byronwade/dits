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
  CheckCircle2,
  Info,
} from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";

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
  description: "Download Dits for macOS, Linux, and Windows. Install via npm, bun, pnpm, the install script, or download prebuilt binaries directly. Free and open source version control for video production.",
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

/** Token-driven code block matching the home page's terminal treatment. */
function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="overflow-x-auto rounded-xl p-4 font-mono text-sm"
      style={{
        backgroundColor: "var(--code-background)",
        color: "var(--code-foreground)",
        border: "1px solid var(--code-border)",
      }}
    >
      <code className="border-0 bg-transparent p-0">{children}</code>
    </pre>
  );
}

export default function DownloadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {/* AGENTS.md: main with id for skip-link */}
      <main id="main-content" className="flex-1 pt-[104px]" tabIndex={-1}>
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-28" aria-labelledby="download-heading">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[420px] glow-brand" />
          </div>
          <div className="container">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="secondary" className="mb-6 font-mono">v0.1.5</Badge>
              <h1 id="download-heading" className="text-4xl font-bold tracking-tight md:text-6xl">
                Download <span className="text-gradient-brand">Dits</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
                Choose your platform and installation method. Dits is available for macOS, Linux, and Windows.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Install */}
        <section className="border-t bg-muted/30 py-20 md:py-24" aria-labelledby="quick-install-heading">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 id="quick-install-heading" className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">
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
                  <Card className="rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">npm / bun / pnpm</CardTitle>
                      <CardDescription>
                        Recommended for most users
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock>npm install -g @byronwade/dits</CodeBlock>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="outline">Cross-platform</Badge>
                        <Badge variant="outline">Auto-updates</Badge>
                        <Badge variant="outline">No Rust required</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="curl" className="mt-4">
                  <Card className="rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Shell Script</CardTitle>
                      <CardDescription>
                        Quick one-liner installation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock>
                        curl -fsSL https://raw.githubusercontent.com/byronwade/dits/main/install.sh | sh
                      </CodeBlock>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="brew" className="mt-4">
                  <Card className="rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Homebrew</CardTitle>
                        <Badge variant="outline" className="text-warning">Not yet published</Badge>
                      </div>
                      <CardDescription>
                        A Homebrew tap is planned but not published yet. For now, install with
                        npm/bun/pnpm or grab a prebuilt binary below.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock>npm install -g @byronwade/dits</CodeBlock>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="cargo" className="mt-4">
                  <Card className="rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Cargo</CardTitle>
                        <Badge variant="outline" className="text-warning">Not yet published</Badge>
                      </div>
                      <CardDescription>
                        Dits is not published to crates.io yet, so <code className="font-mono">cargo install dits</code> won&apos;t work.
                        Install with npm/bun/pnpm, or build from the GitHub source.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock>npm install -g @byronwade/dits</CodeBlock>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Manual Download */}
        <section className="border-t py-20 md:py-24" aria-labelledby="manual-download-heading">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <h2 id="manual-download-heading" className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Manual Download
              </h2>
              <div className="grid gap-6 md:grid-cols-3" role="list">
                {platforms.map((platform) => (
                  <Card key={platform.name} role="listitem" className="rounded-2xl border bg-card shadow-card">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {/* AGENTS.md: Decorative icons are aria-hidden */}
                        <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                          <platform.icon className="size-5 text-brand" aria-hidden="true" />
                        </div>
                        <CardTitle>{platform.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {platform.versions.map((version) => (
                        <Button
                          key={version.file}
                          variant="outline"
                          className="w-full justify-start"
                          render={<Link href={`https://github.com/byronwade/dits/releases/latest/download/${version.file}`} aria-label={`Download Dits for ${platform.name} ${version.arch}`} />}
                        >
                          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                          {version.arch}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Button variant="outline" render={<Link href="https://github.com/byronwade/dits/releases" target="_blank" rel="noopener noreferrer" aria-label="View all Dits releases on GitHub (opens in new tab)" />}>
                  <GithubIcon className="mr-2 h-4 w-4" />
                  View All Releases
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="border-t bg-muted/30 py-20 md:py-24" aria-labelledby="requirements-heading">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 id="requirements-heading" className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                System Requirements
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="rounded-2xl border bg-card p-6 shadow-card">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Apple className="h-5 w-5 text-brand" aria-hidden="true" /> macOS
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {requirements.macos.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="rounded-2xl border bg-card p-6 shadow-card">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Terminal className="h-5 w-5 text-brand" aria-hidden="true" /> Linux
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {requirements.linux.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="rounded-2xl border bg-card p-6 shadow-card">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Package className="h-5 w-5 text-brand" aria-hidden="true" /> Windows
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {requirements.windows.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </Card>
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
        <section className="border-t py-20 md:py-24" aria-labelledby="verify-heading">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <h2 id="verify-heading" className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                Verify Installation
              </h2>
              <CodeBlock>{`$ dits --version
dits 0.1.5

$ dits init my-project
Initialized empty Dits repository in /home/user/my-project/.dits

$ cd my-project && dits status
On branch main
No commits yet`}</CodeBlock>

              <div className="mt-8 text-center">
                <Button render={<Link href="/docs/getting-started" />}>
                  Continue to Getting Started Guide
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
