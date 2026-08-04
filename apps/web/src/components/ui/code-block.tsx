"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import "highlight.js/styles/github-dark.css";

interface CodeBlockProps {
    code: string;
    language?: string;
    filename?: string;
    showLineNumbers?: boolean;
    className?: string;
}

const LANG_MAP: Record<string, string> = {
    bash: "bash",
    shell: "bash",
    sh: "bash",
    rust: "rust",
    python: "python",
    javascript: "javascript",
    js: "javascript",
    typescript: "typescript",
    ts: "typescript",
    json: "json",
    yaml: "yaml",
    sql: "sql",
    html: "xml",
    css: "css",
    markdown: "markdown",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    php: "php",
    ruby: "ruby",
    swift: "swift",
    kotlin: "kotlin",
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function highlightCode(code: string, language: string): string {
    try {
        const hljsLang = LANG_MAP[language.toLowerCase()] || language.toLowerCase();
        if (hljs.getLanguage(hljsLang)) {
            return hljs.highlight(code, { language: hljsLang }).value;
        }
        return escapeHtml(code);
    } catch (error) {
        console.error("Syntax highlighting failed:", error);
        return escapeHtml(code);
    }
}

export function CodeBlock({
    code,
    language = "bash",
    className,
}: CodeBlockProps) {
    const [copied, setCopied] = React.useState(false);
    const highlightedCode = highlightCode(code, language);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className={cn(
                "not-prose group relative my-0 overflow-x-auto rounded-lg text-sm leading-relaxed",
                className
            )}
            style={{
                backgroundColor: "var(--code-background)",
                border: "1px solid var(--code-border)",
                margin: 0,
            }}
        >
            <button
                type="button"
                onClick={handleCopy}
                className={cn(
                    "absolute top-2 right-2 z-10",
                    "flex items-center gap-1.5 rounded px-2 py-1 text-xs",
                    "transition-opacity duration-200",
                    copied
                        ? "bg-primary/20 text-primary opacity-100"
                        : "bg-muted/70 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                )}
                aria-label={copied ? "Copied!" : "Copy code"}
            >
                {copied ? (
                    <>
                        <Check className="h-3 w-3" />
                        <span>Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                    </>
                )}
            </button>

            <pre
                className="m-0 overflow-x-auto px-4 py-0.5 font-mono text-sm leading-relaxed"
                style={{
                    backgroundColor: "transparent",
                }}
            >
                <code
                    className={`hljs language-${language}`}
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
            </pre>
        </div>
    );
}

export function InlineCode({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <code
            className={cn(
                "rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground",
                className
            )}
        >
            {children}
        </code>
    );
}

export default CodeBlock;
