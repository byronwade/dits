import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        definition: "A portion of a file created by the chunking algorithm. Dits stores files as collections of chunks, enabling efficient storage and transfer.",
    },
    {
        term: "Clone",
        definition: "Creating a complete copy of a repository, including all history and branches.",
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
        definition: "Downloading commits and objects from a remote repository without merging them into your local branches.",
    },
    {
        term: "FUSE",
        definition: "Filesystem in Userspace. A technology that allows Dits to mount repositories as virtual filesystems without kernel modifications.",
    },
    {
        term: "HEAD",
        definition: "A reference to the currently checked-out commit. Usually points to the tip of the current branch.",
    },
    {
        term: "Hash",
        definition: "A fixed-size string computed from content using a cryptographic function (SHA-256). Used to uniquely identify chunks and commits.",
    },
    {
        term: "Hook",
        definition: "A script that runs automatically at specific points in the Dits workflow, like before a commit or after a push.",
    },
    {
        term: "Hydration",
        definition: "The process of downloading actual file content when accessing a file in a sparsely-cloned or mounted repository.",
    },
    {
        term: "Index",
        definition: "Also called the staging area. A snapshot of files you've marked to include in the next commit.",
    },
    {
        term: "Lock",
        definition: "A mechanism to prevent others from editing a file while you're working on it. Essential for binary files that can't be merged.",
    },
    {
        term: "Merge",
        definition: "Combining changes from different branches into a single branch. Dits supports various merge strategies.",
    },
    {
        term: "Mount",
        definition: "Making a repository's contents accessible as a virtual filesystem. Files appear as regular files but are fetched on-demand.",
    },
    {
        term: "Origin",
        definition: "The default name for the main remote repository, typically where you cloned from.",
    },
    {
        term: "P2P (Peer-to-Peer)",
        definition: "Direct synchronization between machines without requiring a central server. Dits uses libp2p for decentralized collaboration.",
    },
    {
        term: "Proxy File",
        definition: "A low-resolution or placeholder version of a large file. Used for preview while keeping full-quality originals available.",
    },
    {
        term: "Pull",
        definition: "Fetching changes from a remote repository and merging them into your current branch. Equivalent to fetch + merge.",
    },
    {
        term: "Push",
        definition: "Uploading your local commits to a remote repository.",
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
        definition: "A repository hosted elsewhere (server, cloud, or another machine) that you sync with.",
    },
    {
        term: "Repository (Repo)",
        definition: "A directory containing your project files and the complete history of changes, stored in the .dits directory.",
    },
    {
        term: "SHA-256",
        definition: "The cryptographic hash function used by Dits to generate content identifiers. Produces a 256-bit (64 character) hash.",
    },
    {
        term: "Sparse Checkout",
        definition: "Cloning a repository without downloading all file contents. Only metadata is fetched; files are hydrated on-demand.",
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
        definition: "Different storage backends with varying performance and cost characteristics (hot, warm, cold, archive).",
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
        definition: "The feature that allows mounting Dits repositories as regular filesystems for seamless access.",
    },
    {
        term: "Wire Protocol",
        definition: "The communication protocol used between Dits clients and servers for efficient data transfer.",
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
            <h1>Glossary</h1>
            <p className="lead text-xl text-muted-foreground">
                Definitions of key terms and concepts used throughout the Dits documentation.
            </p>

            <div className="not-prose my-8">
                <div className="flex flex-wrap gap-2 mb-8">
                    {Object.keys(grouped).sort().map(letter => (
                        <a
                            key={letter}
                            href={`#section-${letter}`}
                            className="px-3 py-1 bg-muted rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {Object.keys(grouped).sort().map(letter => (
                    <div key={letter} id={`section-${letter}`} className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Book className="h-5 w-5 text-primary" />
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
