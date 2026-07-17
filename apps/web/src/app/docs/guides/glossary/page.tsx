import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocPageHeader } from "@/components/doc-page-header";
import { Book } from "lucide-react";

export const metadata: Metadata = {
    title: "Glossary - Terminology",
    description: "Definitions of key terms and concepts used in Dits",
};

const glossaryTerms = [
    {
        term: "Blob",
        definition: "The raw content of a file stored in the repository. In Dits, blobs are chunked and deduplicated.",
    },
    {
        term: "Branch",
        definition: "An independent line of development. Branches allow you to work on features without affecting the main codebase.",
    },
    {
        term: "Chunk",
        definition: "A portion of file content created by the chunking algorithm and stored locally by its BLAKE3 identifier.",
    },
    {
        term: "Clone",
        definition: "Creating a repository copy. Dits currently supports clone from another local filesystem path only; network clone fails.",
    },
    {
        term: "Commit",
        definition: "A snapshot of your repository at a point in time. Each commit has a unique identifier and records changes made since the last commit.",
    },
    {
        term: "Content Addressing",
        definition: "Identifying content by its cryptographic hash rather than its location. This enables deduplication - identical content is stored only once.",
    },
    {
        term: "Content-Defined Chunking (CDC)",
        definition: "A chunking algorithm that determines chunk boundaries based on file content rather than fixed sizes. This improves deduplication when files are modified.",
    },
    {
        term: "Deduplication",
        definition: "The process of eliminating duplicate copies of data. In Dits, identical chunks are stored only once, saving storage space.",
    },
    {
        term: "FastCDC",
        definition: "The default chunking algorithm in Dits. It's a fast, efficient content-defined chunking implementation optimized for large files.",
    },
    {
        term: "Fetch",
        definition: "A roadmap remote operation. The current command returns a nonzero error without changing objects, refs, or the working tree.",
    },
    {
        term: "FUSE",
        definition: "Filesystem in Userspace. Dits has an experimental, local-only mount path behind the optional fuser Cargo feature.",
    },
    {
        term: "HEAD",
        definition: "A reference to the currently checked-out commit. Usually points to the tip of the current branch.",
    },
    {
        term: "Hash",
        definition: "A fixed-size identifier computed from content. Dits uses BLAKE3 for its content-addressed objects and chunks.",
    },
    {
        term: "Hook",
        definition: "A local script associated with a supported Dits workflow event, such as a commit step.",
    },
    {
        term: "Hydration",
        definition: "Materializing file bytes from objects already available to a local repository. Remote on-demand hydration is not implemented.",
    },
    {
        term: "Index",
        definition: "Also called the staging area. A snapshot of files you've marked to include in the next commit.",
    },
    {
        term: "Lock",
        definition: "A local advisory record of editing intent. Current locks are not synchronized, remote leases, authorization, or enforcement against other tools.",
    },
    {
        term: "Merge",
        definition: "Combining changes from different branches into a single branch. Dits supports various merge strategies.",
    },
    {
        term: "Mount",
        definition: "An experimental local FUSE view, available only in source builds that enable the fuser feature. It does not fetch from a remote.",
    },
    {
        term: "Origin",
        definition: "A conventional remote configuration name. Local clone records its source path as origin, but remote transfer remains disabled.",
    },
    {
        term: "P2P (Peer-to-Peer)",
        definition: "Planned direct repository exchange between peers. Current P2P code is nonfunctional scaffolding and transfers no repository data.",
    },
    {
        term: "Proxy File",
        definition: "A low-resolution or placeholder version of a large file. Used for preview while keeping full-quality originals available.",
    },
    {
        term: "Pull",
        definition: "A roadmap remote operation. The current command returns a nonzero error without changing objects, refs, or the working tree.",
    },
    {
        term: "Push",
        definition: "A roadmap remote operation. The current command returns a nonzero error and uploads no repository data.",
    },
    {
        term: "Rebase",
        definition: "Replaying commits from one branch onto another. Creates a linear history by avoiding merge commits.",
    },
    {
        term: "Ref",
        definition: "Short for reference. A pointer to a commit, typically a branch name or tag.",
    },
    {
        term: "Remote",
        definition: "A named URL stored in local configuration. Saving one does not enable repository exchange in the current alpha.",
    },
    {
        term: "Repository (Repo)",
        definition: "A directory containing your project files and the complete history of changes, stored in the .dits directory.",
    },
    {
        term: "BLAKE3",
        definition: "The cryptographic hash function Dits uses for current content identifiers. A digest detects changed bytes but is not an author signature.",
    },
    {
        term: "Sparse Checkout",
        definition: "Selecting local paths for the working tree. It is not network partial clone or remote on-demand hydration.",
    },
    {
        term: "Stage",
        definition: "Marking changes to include in the next commit. Done with 'dits add'.",
    },
    {
        term: "Stash",
        definition: "Temporarily storing uncommitted changes so you can work on something else, then restore them later.",
    },
    {
        term: "Storage Tier",
        definition: "A lifecycle label used by local freeze/thaw experiments. Automatic cloud-tier movement is not a current capability.",
    },
    {
        term: "Tag",
        definition: "A named reference to a specific commit, typically used to mark release versions.",
    },
    {
        term: "Tree",
        definition: "An object representing a directory. Trees contain references to blobs (files) and other trees (subdirectories).",
    },
    {
        term: "VFS (Virtual Filesystem)",
        definition: "The experimental local FUSE mount path. It is feature-gated and does not provide remote hydration.",
    },
    {
        term: "Wire Protocol",
        definition: "A future repository-exchange contract. No complete Dits client/server wire protocol is implemented today.",
    },
    {
        term: "Working Directory",
        definition: "The directory containing your actual project files. Changes here are tracked by Dits.",
    },
];

export default function GlossaryPage() {
    const sortedTerms = glossaryTerms.sort((a, b) => a.term.localeCompare(b.term));

    // Group by first letter
    const grouped = sortedTerms.reduce((acc, term) => {
        const letter = term.term[0].toUpperCase();
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(term);
        return acc;
    }, {} as Record<string, typeof glossaryTerms>);

    return (
        <div className="prose dark:prose-invert max-w-none">
            <DocPageHeader
                eyebrow="Guides"
                title="Glossary"
                description="Definitions of key terms and concepts used throughout the Dits documentation."
            />

            <div className="not-prose my-8">
                <div className="flex flex-wrap gap-2 mb-8">
                    {Object.keys(grouped).sort().map(letter => (
                        <a
                            key={letter}
                            href={`#section-${letter}`}
                            className="px-3 py-1 bg-muted rounded hover:bg-brand hover:text-background transition-colors text-sm font-medium"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {Object.keys(grouped).sort().map(letter => (
                    <div key={letter} id={`section-${letter}`} className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Book className="h-5 w-5 text-brand" />
                            {letter}
                        </h2>
                        <div className="space-y-3">
                            {grouped[letter].map(({ term, definition }) => (
                                <Card key={term}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">{term}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{definition}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <h2>Related Resources</h2>
            <ul>
                <li><Link href="/docs/concepts">Core Concepts</Link> - Deep dive into how Dits works</li>
                <li><Link href="/docs/guides/faq">FAQ</Link> - Answers to common questions</li>
                <li><Link href="/docs/cli-reference">CLI Reference</Link> - Command documentation</li>
            </ul>
        </div>
    );
}
