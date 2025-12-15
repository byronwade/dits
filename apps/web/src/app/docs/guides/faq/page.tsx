import { Metadata } from "next";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { HelpCircle, MessageCircle, Zap } from "lucide-react";
import { generateMetadata as genMeta, generateFAQSchema, generateBreadcrumbSchema } from "@/lib/seo";
import Script from "next/script";

export const metadata: Metadata = genMeta({
    title: "FAQ - Frequently Asked Questions About Dits Version Control",
    description: "Find answers to common questions about Dits version control system. Learn about installation, usage, technical details, troubleshooting, and more. Get help with large file version control, video workflows, and creative asset management.",
    canonical: "https://dits.dev/docs/guides/faq",
    keywords: [
        "dits faq",
        "dits questions",
        "dits help",
        "version control questions",
        "dits troubleshooting",
        "large file version control faq",
        "video version control questions",
    ],
    openGraph: {
        type: "article",
        images: [
            {
                url: "/dits.png",
                width: 1200,
                height: 630,
                alt: "Dits FAQ - Frequently Asked Questions",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
    },
});

export default function FAQPage() {
    const faqs = [
        {
            question: "What is Dits?",
            answer: "Dits is a next-generation version control system designed for large files and creative workflows. It uses content-defined chunking and deduplication to efficiently handle video, images, 3D models, and other binary files that traditional VCS like Git struggle with.",
        },
        {
            question: "How is Dits different from Git LFS?",
            answer: "While Git LFS stores large files separately, Dits chunks files so only changed portions are stored, not entire files. Dits is content-addressed, meaning identical content is stored once across all files. It also supports streaming access via VFS mounting and P2P sync to share directly between machines without a central server.",
        },
        {
            question: "Can I use Dits with my existing Git workflow?",
            answer: "Dits commands are designed to be familiar to Git users. Commands like dits add, dits commit, dits push, and dits pull work similarly. You can migrate from Git gradually.",
        },
        {
            question: "How does chunking work?",
            answer: "Dits uses content-defined chunking (FastCDC algorithm) to split files into variable-sized chunks based on content boundaries. This means if you insert data in the middle of a file, only the affected chunks change - not the entire file. Each chunk is identified by its content hash (SHA-256), enabling deduplication across your entire repository.",
        },
        {
            question: "What's the maximum file size Dits can handle?",
            answer: "There's no hard limit on file size. Dits has been tested with files over 100GB. Large files are automatically chunked, so you only transfer and store what actually changes. For very large files, consider using the VFS mount feature for streaming access without downloading the entire file.",
        },
        {
            question: "How much storage space will I save?",
            answer: "Storage savings depend on your content type and edit patterns. Video projects typically see 60-80% reduction for iterative edits. Game assets see 40-60% with texture/model reuse. Documents see 70-90% for revision-heavy docs.",
        },
        {
            question: "Is my data encrypted?",
            answer: "Dits supports end-to-end encryption. You can encrypt repositories with a password or key, and data is encrypted before it leaves your machine.",
        },
        {
            question: "How do I clone a large repository quickly?",
            answer: "Use sparse checkout to clone only the metadata, then access files on-demand. Use 'dits clone --filter blob:none' to clone metadata only, then mount the repository to access files instantly.",
        },
        {
            question: "Can multiple people edit the same file?",
            answer: "Yes, but like Git, you'll need to merge changes. For binary files where automatic merging isn't possible, Dits supports file locking to prevent conflicts. Use 'dits lock' to prevent others from editing a file while you work on it.",
        },
        {
            question: "How do I work offline?",
            answer: "Dits is designed for offline work. All commits are local until you push. For mounted repositories, files you've accessed are cached locally. Use 'dits fetch' to pre-download content before going offline.",
        },
        {
            question: "What editors/software work with Dits?",
            answer: "Any software that works with regular files works with Dits. The VFS mount feature makes Dits repositories appear as normal directories. Popular tested applications include Adobe Premiere, DaVinci Resolve, Blender, Unity, Unreal Engine, VS Code, and more.",
        },
        {
            question: "My push is taking forever",
            answer: "First pushes of large files take time. Check progress with 'dits status'. Future pushes of the same files will be much faster due to chunking. Consider using a faster network or the --compress flag for slow connections.",
        },
        {
            question: "\"Too many open files\" error",
            answer: "Increase your system's file descriptor limit. On macOS/Linux, use 'ulimit -n 65536' and add it to your shell configuration file to persist.",
        },
    ];

    const faqSchema = generateFAQSchema(faqs);
    const breadcrumbSchema = generateBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Documentation", url: "/docs" },
        { name: "Guides", url: "/docs/guides" },
        { name: "FAQ", url: "/docs/guides/faq" },
    ]);

    return (
        <>
            <Script
                id="faq-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqSchema),
                }}
            />
            <Script
                id="breadcrumb-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbSchema),
                }}
            />
            <div className="prose dark:prose-invert max-w-none">
            <h1>Frequently Asked Questions</h1>
            <p className="lead text-xl text-muted-foreground">
                Quick answers to common questions about Dits. Can&apos;t find what you&apos;re looking for?
                Check our <Link href="/docs/troubleshooting">troubleshooting guide</Link> or ask in the community.
            </p>

            <h2>General Questions</h2>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            What is Dits?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dits is a next-generation version control system designed for large files and creative workflows.
                            It uses content-defined chunking and deduplication to efficiently handle video, images, 3D models,
                            and other binary files that traditional VCS like Git struggle with.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            How is Dits different from Git LFS?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            While Git LFS stores large files separately, it still has limitations:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li><strong>Dits chunks files</strong> - Only changed portions are stored, not entire files</li>
                            <li><strong>Content-addressed</strong> - Identical content is stored once across all files</li>
                            <li><strong>Streaming access</strong> - Mount repositories and access files on-demand</li>
                            <li><strong>P2P sync</strong> - Share directly between machines without central server</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            Can I use Dits with my existing Git workflow?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dits commands are designed to be familiar to Git users. Commands like <code>dits add</code>,
                            <code>dits commit</code>, <code>dits push</code>, and <code>dits pull</code> work similarly.
                            You can migrate from Git gradually - see our <Link href="/docs/guides/migration">migration guide</Link>.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <h2>Technical Questions</h2>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Zap className="h-5 w-5 text-primary" />
                            How does chunking work?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dits uses content-defined chunking (FastCDC algorithm) to split files into variable-sized chunks
                            based on content boundaries. This means if you insert data in the middle of a file, only the
                            affected chunks change - not the entire file. Each chunk is identified by its content hash
                            (SHA-256), enabling deduplication across your entire repository.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Zap className="h-5 w-5 text-primary" />
                            What&apos;s the maximum file size Dits can handle?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            There&apos;s no hard limit on file size. Dits has been tested with files over 100GB.
                            Large files are automatically chunked, so you only transfer and store what actually changes.
                            For very large files, consider using the VFS mount feature for streaming access without
                            downloading the entire file.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Zap className="h-5 w-5 text-primary" />
                            How much storage space will I save?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Storage savings depend on your content type and edit patterns. Typical results:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                            <li><strong>Video projects:</strong> 60-80% reduction for iterative edits</li>
                            <li><strong>Game assets:</strong> 40-60% with texture/model reuse</li>
                            <li><strong>Documents:</strong> 70-90% for revision-heavy docs</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Zap className="h-5 w-5 text-primary" />
                            Is my data encrypted?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dits supports end-to-end encryption. You can encrypt repositories with a password or key,
                            and data is encrypted before it leaves your machine. See the{" "}
                            <Link href="/docs/advanced/encryption">encryption guide</Link> for setup instructions.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <h2>Usage Questions</h2>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            How do I clone a large repository quickly?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            Use sparse checkout to clone only the metadata, then access files on-demand:
                        </p>
                        <pre className="bg-muted p-3 rounded text-sm"><code>{`dits clone --filter blob:none https://example.com/repo
cd repo
dits mount /mnt/repo  # Access all files instantly`}</code></pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            Can multiple people edit the same file?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Yes, but like Git, you&apos;ll need to merge changes. For binary files where automatic merging
                            isn&apos;t possible, Dits supports file locking to prevent conflicts. Use <code>dits lock</code>
                            to prevent others from editing a file while you work on it. See{" "}
                            <Link href="/docs/cli/locks">lock commands</Link>.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            How do I work offline?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dits is designed for offline work. All commits are local until you push. For mounted
                            repositories, files you&apos;ve accessed are cached locally. Use <code>dits fetch</code>
                            to pre-download content before going offline.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            What editors/software work with Dits?
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Any software that works with regular files works with Dits. The VFS mount feature makes
                            Dits repositories appear as normal directories. Popular tested applications include:
                            Adobe Premiere, DaVinci Resolve, Blender, Unity, Unreal Engine, VS Code, and more.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <h2>Troubleshooting</h2>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            My push is taking forever
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            First pushes of large files take time. Check progress with <code>dits status</code>.
                            Future pushes of the same files will be much faster due to chunking. Consider using
                            a faster network or the <code>--compress</code> flag for slow connections.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            &quot;Too many open files&quot; error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            Increase your system&apos;s file descriptor limit:
                        </p>
                        <pre className="bg-muted p-3 rounded text-sm"><code>{`# macOS/Linux
ulimit -n 65536

# Add to ~/.zshrc or ~/.bashrc to persist`}</code></pre>
                    </CardContent>
                </Card>
            </div>

            <h2>Still Have Questions?</h2>
            <div className="grid gap-4 md:grid-cols-2 my-6">
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">Documentation</h3>
                        <ul className="text-sm space-y-1">
                            <li><Link href="/docs/troubleshooting">Troubleshooting Guide</Link></li>
                            <li><Link href="/docs/guides/glossary">Glossary of Terms</Link></li>
                            <li><Link href="/docs/cli-reference">CLI Reference</Link></li>
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="font-semibold mb-2">Community</h3>
                        <ul className="text-sm space-y-1">
                            <li><a href="https://github.com/byronwade/dits/discussions">GitHub Discussions</a></li>
                            <li><a href="https://github.com/byronwade/dits/issues">Report an Issue</a></li>
                            <li><Link href="/docs/contributing">Contribute</Link></li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
    );
}
