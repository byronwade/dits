"use client";

import * as React from "react";
import { ArrowRight, ArrowDown, Server, HardDrive, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncDiagramProps {
    localChunks: string[];
    remoteChunks: string[];
    missingChunks?: string[];
    className?: string;
}

export function SyncDiagram({
    localChunks,
    remoteChunks,
    missingChunks,
    className
}: SyncDiagramProps) {
    const computedMissing = missingChunks || localChunks.filter(c => !remoteChunks.includes(c));
    const sharedChunks = localChunks.filter(c => remoteChunks.includes(c));

    return (
        <div className={cn("rounded-lg border bg-card p-6", className)}>
            {/* Header */}
            <h4 className="font-semibold text-lg mb-6 text-center">Have/Want Protocol</h4>

            {/* Two boxes side by side */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                {/* Local box */}
                <div className="flex-1 max-w-[200px]">
                    <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <HardDrive className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Local</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">Chunks:</div>
                        <div className="flex flex-wrap gap-1">
                            {localChunks.map((chunk) => (
                                <span
                                    key={chunk}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-xs font-mono",
                                        sharedChunks.includes(chunk)
                                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                            : "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                                    )}
                                >
                                    {chunk}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Arrows */}
                <div className="hidden md:flex items-center">
                    <ArrowRight className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div className="flex md:hidden items-center">
                    <ArrowDown className="h-8 w-8 text-muted-foreground/50" />
                </div>

                {/* Remote box */}
                <div className="flex-1 max-w-[200px]">
                    <div className="rounded-lg border-2 border-blue-500 bg-blue-500/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Server className="h-5 w-5 text-blue-500" />
                            <span className="font-semibold">Remote</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">Chunks:</div>
                        <div className="flex flex-wrap gap-1">
                            {remoteChunks.map((chunk) => (
                                <span
                                    key={chunk}
                                    className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-700 dark:text-green-400"
                                >
                                    {chunk}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-4 max-w-xl mx-auto">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                    </div>
                    <div>
                        <div className="font-medium">Query what remote has</div>
                        <div className="text-sm text-muted-foreground">
                            &quot;Do you have {localChunks.join(", ")}?&quot;
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                    </div>
                    <div>
                        <div className="font-medium">Remote responds with Bloom filter</div>
                        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
                            <span>Have:</span>
                            {sharedChunks.map((c) => (
                                <span key={c} className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                                    <Check className="h-3 w-3" />{c}
                                </span>
                            ))}
                            <span className="ml-2">Missing:</span>
                            {computedMissing.map((c) => (
                                <span key={c} className="inline-flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                                    <X className="h-3 w-3" />{c}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                    </div>
                    <div>
                        <div className="font-medium text-green-700 dark:text-green-400">Upload only missing chunks</div>
                        <div className="text-sm text-muted-foreground">
                            → Transfer {computedMissing.join(", ")} <span className="text-green-600 dark:text-green-400">(not {sharedChunks.join(", ")}!)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SyncDiagram;
