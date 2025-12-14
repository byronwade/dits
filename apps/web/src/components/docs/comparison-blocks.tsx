"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, Check, ArrowRight } from "lucide-react";

interface ComparisonBlocksProps {
    before: {
        label: string;
        blocks: string[];
        description?: string;
    };
    after: {
        label: string;
        blocks: string[];
        description?: string;
    };
    className?: string;
    showResult?: boolean;
    beforeResult?: string;
    afterResult?: string;
}

export function ComparisonBlocks({
    before,
    after,
    className,
    showResult = true,
    beforeResult = "All chunks change",
    afterResult = "Only affected chunks change",
}: ComparisonBlocksProps) {
    return (
        <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                {/* Before */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                            <X className="w-4 h-4 text-destructive" />
                        </div>
                        <h4 className="font-semibold">{before.label}</h4>
                    </div>

                    {before.description && (
                        <p className="text-sm text-muted-foreground mb-4">{before.description}</p>
                    )}

                    {/* Blocks visualization */}
                    <div className="flex flex-wrap gap-1 mb-4">
                        {before.blocks.map((block, i) => (
                            <div
                                key={i}
                                className="px-3 py-2 rounded bg-destructive/20 text-destructive font-mono text-sm border border-destructive/30"
                            >
                                {block}
                            </div>
                        ))}
                    </div>

                    {showResult && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <X className="w-4 h-4" />
                            <span>{beforeResult}</span>
                        </div>
                    )}
                </div>

                {/* After */}
                <div className="p-6 bg-primary/5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary" />
                        </div>
                        <h4 className="font-semibold">{after.label}</h4>
                    </div>

                    {after.description && (
                        <p className="text-sm text-muted-foreground mb-4">{after.description}</p>
                    )}

                    {/* Blocks visualization */}
                    <div className="flex flex-wrap gap-1 mb-4">
                        {after.blocks.map((block, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "px-3 py-2 rounded font-mono text-sm border",
                                    i === 0
                                        ? "bg-primary/20 text-primary border-primary/30"
                                        : "bg-muted text-muted-foreground border-border"
                                )}
                            >
                                {block}
                            </div>
                        ))}
                    </div>

                    {showResult && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                            <Check className="w-4 h-4" />
                            <span>{afterResult}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ComparisonBlocks;
