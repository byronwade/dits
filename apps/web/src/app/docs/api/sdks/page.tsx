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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Code,
  Download,
  Book,
  Github,
  CheckCircle,
  Star,
  Package,
  Terminal
} from "lucide-react";

export const metadata: Metadata = {
  title: "SDKs",
  description: "Official SDKs for integrating Dits into your applications",
};

export default function SDKsPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Official SDKs</h1>
      <p className="lead text-xl text-muted-foreground">
        Integrate Dits version control into your applications with our official SDKs.
        Available for JavaScript/TypeScript, Python, Go, and Rust.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 my-8">
        <Card className="border-blue-200">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
              <Code className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>JavaScript</CardTitle>
            <CardDescription>Node.js & Browser SDK</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">npm</Badge>
                <Badge variant="secondary">ESM</Badge>
                <Badge variant="secondary">TypeScript</Badge>
              </div>
              <CodeBlock
                language="bash"
                code={`npm install @dits/sdk`}
              />
              <div className="text-xs text-muted-foreground">
                • REST API client<br />
                • File upload/download<br />
                • Repository management<br />
                • Webhook handling
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
              <Terminal className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Python</CardTitle>
            <CardDescription>Python SDK with async support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">pip</Badge>
                <Badge variant="secondary">asyncio</Badge>
                <Badge variant="secondary">Type hints</Badge>
              </div>
              <CodeBlock
                language="bash"
                code={`pip install dits-sdk`}
              />
              <div className="text-xs text-muted-foreground">
                • Async/await support<br />
                • Data science workflows<br />
                • ML model versioning<br />
                • Large dataset handling
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-200">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center mb-2">
              <Package className="h-6 w-6 text-cyan-600" />
            </div>
            <CardTitle>Go</CardTitle>
            <CardDescription>High-performance Go SDK</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">go get</Badge>
                <Badge variant="secondary">Concurrent</Badge>
                <Badge variant="secondary">Streaming</Badge>
              </div>
              <CodeBlock
                language="bash"
                code={`go get github.com/dits-io/go-sdk`}
              />
              <div className="text-xs text-muted-foreground">
                • Concurrent operations<br />
                • Streaming uploads<br />
                • Context cancellation<br />
                • Enterprise integrations
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-2">
              <Star className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Rust</CardTitle>
            <CardDescription>Native Rust SDK with zero-copy operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">cargo</Badge>
                <Badge variant="secondary">Zero-copy</Badge>
                <Badge variant="secondary">Async</Badge>
              </div>
              <CodeBlock
                language="bash"
                code={`cargo add dits-sdk`}
              />
              <div className="text-xs text-muted-foreground">
                • Memory-safe operations<br />
                • Zero-copy chunking<br />
                • Async runtime agnostic<br />
                • Performance-critical apps
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="javascript" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
          <TabsTrigger value="go">Go</TabsTrigger>
          <TabsTrigger value="rust">Rust</TabsTrigger>
        </TabsList>

        <TabsContent value="javascript" className="mt-6">
          <h2>JavaScript/TypeScript SDK</h2>

          <h3>Installation</h3>
          <CodeBlock
            language="bash"
            code={`npm install @dits/sdk
# or
yarn add @dits/sdk
# or
pnpm add @dits/sdk`}
          />

          <h3>Basic Usage</h3>
          <CodeBlock
            language="javascript"
            code={`import { DitsClient } from '@dits/sdk';

const client = new DitsClient({
  baseURL: 'https://api.dits.io/v1',
  token: process.env.DITS_TOKEN
});

// List repositories
const repos = await client.repositories.list();

// Upload a file
await client.files.upload('path/to/video.mp4', {
  repository: 'my-project',
  commit: 'Add raw footage'
});

// Download a file
const buffer = await client.files.download('abc123...', {
  repository: 'my-project'
});`}
          />

          <h3>Advanced Features</h3>
          <ul>
            <li><strong>Streaming uploads:</strong> Handle large files without loading into memory</li>
            <li><strong>Progress callbacks:</strong> Monitor upload/download progress</li>
            <li><strong>Webhook handling:</strong> Built-in webhook signature verification</li>
            <li><strong>TypeScript support:</strong> Full type definitions included</li>
          </ul>

          <div className="flex gap-4 mt-6">
            <Button asChild>
              <Link href="https://npmjs.com/package/@dits/sdk">
                <Download className="mr-2 h-4 w-4" />
                NPM Package
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://github.com/dits-io/js-sdk">
                <Book className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="python" className="mt-6">
          <h2>Python SDK</h2>

          <h3>Installation</h3>
          <CodeBlock
            language="bash"
            code={`pip install dits-sdk
# or
poetry add dits-sdk
# or
conda install dits-sdk`}
          />

          <h3>Basic Usage</h3>
          <CodeBlock
            language="python"
            code={`import asyncio
from dits import DitsClient

async def main():
    client = DitsClient(
        base_url='https://api.dits.io/v1',
        token=os.environ['DITS_TOKEN']
    )

    # List repositories
    repos = await client.repositories.list()

    # Upload with progress
    async def progress_callback(current, total):
        print(f"Uploaded {current}/{total} bytes")

    await client.files.upload(
        'path/to/dataset.h5',
        repository='ml-project',
        progress=progress_callback
    )

asyncio.run(main())`}
          />

          <h3>Advanced Features</h3>
          <ul>
            <li><strong>Async/await support:</strong> Non-blocking I/O operations</li>
            <li><strong>DataFrame integration:</strong> Direct pandas/polars support</li>
            <li><strong>Jupyter integration:</strong> Notebook widgets and progress bars</li>
            <li><strong>ML workflows:</strong> Model versioning and dataset tracking</li>
          </ul>

          <div className="flex gap-4 mt-6">
            <Button asChild>
              <Link href="https://pypi.org/project/dits-sdk/">
                <Download className="mr-2 h-4 w-4" />
                PyPI Package
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://dits-sdk.readthedocs.io/">
                <Book className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="go" className="mt-6">
          <h2>Go SDK</h2>

          <h3>Installation</h3>
          <CodeBlock
            language="bash"
            code={`go get github.com/dits-io/go-sdk
# or with Go modules
go mod tidy`}
          />

          <h3>Basic Usage</h3>
          <CodeBlock
            language="go"
            code={`package main

import (
    "context"
    "log"
    "os"

    "github.com/dits-io/go-sdk"
)

func main() {
    client := dits.NewClient(&dits.Config{
        BaseURL: "https://api.dits.io/v1",
        Token:   os.Getenv("DITS_TOKEN"),
    })

    ctx := context.Background()

    // List repositories
    repos, err := client.Repositories.List(ctx)
    if err != nil {
        log.Fatal(err)
    }

    // Concurrent uploads
    files := []string{"video1.mp4", "video2.mp4", "video3.mp4"}
    sem := make(chan struct{}, 3) // Limit to 3 concurrent uploads

    for _, file := range files {
        go func(filename string) {
            sem <- struct{}{}
            defer func() { <-sem }()

            err := client.Files.Upload(ctx, filename, &dits.UploadOptions{
                Repository: "my-project",
                Commit:     "Add batch footage",
            })
            if err != nil {
                log.Printf("Failed to upload %s: %v", filename, err)
            }
        }(file)
    }
}`}
          />

          <h3>Advanced Features</h3>
          <ul>
            <li><strong>Context support:</strong> Proper cancellation and timeouts</li>
            <li><strong>Concurrent operations:</strong> Built-in worker pools</li>
            <li><strong>Streaming:</strong> Efficient large file handling</li>
            <li><strong>Enterprise features:</strong> Audit logging and compliance</li>
          </ul>

          <div className="flex gap-4 mt-6">
            <Button asChild>
              <Link href="https://pkg.go.dev/github.com/dits-io/go-sdk">
                <Download className="mr-2 h-4 w-4" />
                Go Reference
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://github.com/dits-io/go-sdk">
                <Book className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rust" className="mt-6">
          <h2>Rust SDK</h2>

          <h3>Installation</h3>
          <CodeBlock
            language="bash"
            code={`# Add to Cargo.toml
[dependencies]
dits-sdk = "0.1"

# Or use cargo add
cargo add dits-sdk`}
          />

          <h3>Basic Usage</h3>
          <CodeBlock
            language="python"
            code={`use dits_sdk::{Client, Config};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new(Config {
        base_url: "https://api.dits.io/v1".to_string(),
        token: std::env::var("DITS_TOKEN")?,
        ..Default::default()
    });

    // List repositories
    let repos = client.repositories().list().await?;

    // Upload with zero-copy
    let file_data = tokio::fs::read("large-video.mp4").await?;
    client.files().upload(&file_data, "my-project", "Add footage").await?;

    // Streaming download
    let mut stream = client.files().download_stream("chunk-hash").await?;
    while let Some(chunk) = stream.next().await {
        // Process chunk without full allocation
        process_chunk(&chunk?);
    }

    Ok(())
}

fn process_chunk(chunk: &[u8]) {
    // Zero-copy processing
}`}
          />

          <h3>Advanced Features</h3>
          <ul>
            <li><strong>Zero-copy operations:</strong> Direct buffer manipulation</li>
            <li><strong>Async runtime agnostic:</strong> Works with tokio, async-std, etc.</li>
            <li><strong>Memory safety:</strong> Compile-time guarantees</li>
            <li><strong>Performance:</strong> Native-speed operations</li>
          </ul>

          <div className="flex gap-4 mt-6">
            <Button asChild>
              <Link href="https://crates.io/crates/dits-sdk">
                <Download className="mr-2 h-4 w-4" />
                Crates.io
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="https://docs.rs/dits-sdk">
                <Book className="mr-2 h-4 w-4" />
                API Docs
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6 my-8">
        <h2 className="font-semibold mb-4">SDK Comparison</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-center">JavaScript</TableHead>
                <TableHead className="text-center">Python</TableHead>
                <TableHead className="text-center">Go</TableHead>
                <TableHead className="text-center">Rust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">REST API</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">File Upload/Download</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Streaming Support</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Webhook Handling</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Async/Await</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Progress Callbacks</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Type Safety</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Zero-Copy Operations</TableCell>
                <TableCell className="text-center">—</TableCell>
                <TableCell className="text-center">—</TableCell>
                <TableCell className="text-center">—</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Concurrent Operations</TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                <TableCell className="text-center"><CheckCircle className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <h2>Contributing to SDKs</h2>
      <p>
        All SDKs are open source and welcome contributions. Each SDK follows consistent patterns
        and includes comprehensive test suites.
      </p>

      <div className="grid gap-4 md:grid-cols-2 my-6">
        <Card>
          <CardHeader>
            <CardTitle>Development Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Clone the SDK repository</li>
              <li>Install dependencies</li>
              <li>Run test suite</li>
              <li>Follow contribution guidelines</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Unit tests for all functionality</li>
              <li>Integration tests with live API</li>
              <li>Performance benchmarks</li>
              <li>Cross-platform compatibility</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-center my-8">
        <Button size="lg" asChild>
          <Link href="https://github.com/dits-io">
            <Github className="mr-2 h-5 w-5" />
            View All SDKs on GitHub
          </Link>
        </Button>
      </div>
    </div>
  );
}

