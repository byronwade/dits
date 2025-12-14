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

export function CodeBlock({
    code,
    language = "bash",
    showLineNumbers = false,
    className,
}: CodeBlockProps) {
    const [copied, setCopied] = React.useState(false);
    const [highlightedCode, setHighlightedCode] = React.useState<string>("");
    const codeRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => {
        try {
            // Map language names to highlight.js language identifiers
            const langMap: Record<string, string> = {
                bash: 'bash',
                shell: 'bash',
                sh: 'bash',
                rust: 'rust',
                python: 'python',
                javascript: 'javascript',
                js: 'javascript',
                typescript: 'typescript',
                ts: 'typescript',
                json: 'json',
                yaml: 'yaml',
                sql: 'sql',
                html: 'xml',
                css: 'css',
                markdown: 'markdown',
                go: 'go',
                java: 'java',
                cpp: 'cpp',
                c: 'c',
                php: 'php',
                ruby: 'ruby',
                swift: 'swift',
                kotlin: 'kotlin',
            };

            const hljsLang = langMap[language.toLowerCase()] || language.toLowerCase();
            
            if (hljs.getLanguage(hljsLang)) {
                const highlighted = hljs.highlight(code, { language: hljsLang }).value;
                setHighlightedCode(highlighted);
            } else {
                // Fallback: escape HTML
                setHighlightedCode(code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
            }
        } catch (error) {
            console.error("Syntax highlighting failed:", error);
            // Fallback: escape HTML
            setHighlightedCode(code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        }
    }, [code, language]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const lines = code.split("\n");

    // Single pre element with no extra wrappers
    return (
        <div
            className={cn(
                "not-prose group relative overflow-x-auto rounded-lg text-sm leading-relaxed my-0",
                className
            )}
            style={{
                backgroundColor: "hsl(var(--code-background))",
                border: "1px solid hsl(var(--code-border))",
                margin: 0,
            }}
        >
            {/* Copy button */}
            <button
                onClick={handleCopy}
                className={cn(
                    "absolute top-2 right-2 z-10",
                    "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                    "transition-opacity duration-200",
                    copied
                        ? "bg-primary/20 text-primary opacity-100"
                        : "bg-black/30 text-white/70 hover:text-white opacity-0 group-hover:opacity-100"
                )}
                aria-label={copied ? "Copied!" : "Copy code"}
            >
                {copied ? (
                    <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                    </>
                )}
            </button>

            <pre
                className="px-4 py-0.5 m-0 overflow-x-auto font-mono text-sm leading-relaxed"
                style={{
                    backgroundColor: "transparent",
                }}
            >
                <code
                    ref={codeRef}
                    className={`hljs language-${language}`}
                    dangerouslySetInnerHTML={{ __html: highlightedCode || code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }}
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
                "px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono",
                className
            )}
        >
            {children}
        </code>
    );
}

export default CodeBlock;
