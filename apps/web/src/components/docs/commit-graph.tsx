"use client";

import * as React from "react";
import { GitCommit, GitMerge, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommitNode {
    hash: string;
    label?: string;
    labels?: string[]; // Branch labels like "HEAD -> main"
    isMerge?: boolean;
    message?: string; // Optional commit message
    author?: string; // Optional author name
}

interface CommitGraphProps {
    commits: CommitNode[];
    className?: string;
}

export function CommitGraph({ commits, className }: CommitGraphProps) {
    const NODE_SIZE = 56;
    const NODE_SPACING = 100;
    const GRAPH_LEFT_MARGIN = 32;
    const CENTER_X = GRAPH_LEFT_MARGIN + NODE_SIZE / 2;
    const TOP_PADDING = 32;
    const NODE_CENTER_Y = NODE_SIZE / 2;
    const BRANCH_OFFSET = 120;
    
    // Calculate total height needed
    const totalHeight = commits.length * NODE_SPACING + TOP_PADDING * 2;
    
    // Helper to calculate Y position of a node center
    const getNodeY = (index: number) => {
        return TOP_PADDING + index * NODE_SPACING + NODE_CENTER_Y;
    };

    return (
        <div className={cn(
            "rounded-xl border-2 bg-gradient-to-br from-card/80 via-card/60 to-card/40",
            "backdrop-blur-md shadow-2xl",
            "border-border/50 dark:border-border/30",
            "p-8 relative overflow-hidden",
            className
        )}>
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                }} />
            </div>

            <div className="relative" style={{ minHeight: `${totalHeight}px` }}>
                {/* SVG for graph lines - positioned behind content */}
                <svg
                    width="100%"
                    height={totalHeight}
                    className="absolute inset-0 pointer-events-none"
                    style={{ overflow: "visible" }}
                >
                    {/* Gradient definitions for lines */}
                    <defs>
                        <linearGradient id="mainBranchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                        </linearGradient>
                        <linearGradient id="mergeBranchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0.6" />
                        </linearGradient>
                    </defs>
                    
                    {/* Draw connection lines between commits */}
                    {commits.map((commit, index) => {
                        if (index === commits.length - 1) return null;

                        const currentY = getNodeY(index);
                        const nextY = getNodeY(index + 1);
                        const isNextMerge = commits[index + 1]?.isMerge;

                        if (isNextMerge && index > 0) {
                            // Draw merge: main line + branch line converging
                            const branchStartX = CENTER_X - BRANCH_OFFSET;
                            const branchStartY = getNodeY(index - 1);
                            const mergeY = nextY;
                            const curveControlX = branchStartX + 50;
                            const curveControlY = mergeY - 15;
                            
                            return (
                                <React.Fragment key={`lines-${commit.hash}`}>
                                    {/* Main branch line (straight down to merge point) */}
                                    <line
                                        x1={CENTER_X}
                                        y1={currentY}
                                        x2={CENTER_X}
                                        y2={mergeY}
                                        stroke="url(#mainBranchGradient)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        className="drop-shadow-sm"
                                    />
                                    {/* Branch line (smooth curve from left, converging) */}
                                    <path
                                        d={`M ${branchStartX} ${branchStartY}
                                            L ${branchStartX} ${mergeY - 30}
                                            Q ${curveControlX} ${curveControlY}
                                              ${CENTER_X - 8} ${mergeY - 8}
                                            L ${CENTER_X} ${mergeY}`}
                                        fill="none"
                                        stroke="url(#mergeBranchGradient)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-sm"
                                    />
                                    {/* Horizontal connector at merge point */}
                                    <line
                                        x1={branchStartX}
                                        y1={mergeY}
                                        x2={CENTER_X}
                                        y2={mergeY}
                                        stroke="url(#mergeBranchGradient)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        className="drop-shadow-sm"
                                    />
                                </React.Fragment>
                            );
                        }

                        // Regular straight connection with gradient
                        return (
                            <line
                                key={`line-${commit.hash}`}
                                x1={CENTER_X}
                                y1={currentY}
                                x2={CENTER_X}
                                y2={nextY}
                                stroke="url(#mainBranchGradient)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                className="drop-shadow-sm"
                            />
                        );
                    })}
                </svg>

                {/* Commit nodes */}
                <div className="relative z-10">
                    {commits.map((commit, index) => {
                        const topOffset = TOP_PADDING + index * NODE_SPACING;
                        const nodeY = getNodeY(index);
                        const isHead = commit.labels?.some(l => l.includes("HEAD"));
                        
                        return (
                            <div
                                key={commit.hash}
                                className="absolute left-0 right-0 flex items-start gap-8"
                                style={{ top: `${topOffset}px` }}
                            >
                                {/* Graph line area */}
                                <div className="flex-shrink-0" style={{ width: `${GRAPH_LEFT_MARGIN + NODE_SIZE}px` }}>
                                    <div className="flex justify-center" style={{ marginLeft: `${GRAPH_LEFT_MARGIN}px` }}>
                                        {/* Commit node */}
                                        <div
                                            className={cn(
                                                "relative flex items-center justify-center",
                                                "transition-all duration-500 ease-out",
                                                "group cursor-pointer",
                                                "hover:scale-125 hover:z-20"
                                            )}
                                        >
                                            {/* Animated glow effect on hover */}
                                            <div
                                                className={cn(
                                                    "absolute inset-0 rounded-full blur-2xl opacity-0",
                                                    "group-hover:opacity-100 transition-opacity duration-500",
                                                    commit.isMerge
                                                        ? "bg-purple-500/40 dark:bg-purple-400/40"
                                                        : isHead
                                                        ? "bg-green-500/40 dark:bg-green-400/40"
                                                        : "bg-primary/40"
                                                )}
                                                style={{
                                                    transform: 'scale(1.5)',
                                                }}
                                            />
                                            
                                            {/* Outer ring for emphasis on HEAD */}
                                            {isHead && (
                                                <div
                                                    className="absolute inset-0 rounded-full border-2 border-green-500/50 dark:border-green-400/50 animate-pulse"
                                                    style={{
                                                        transform: 'scale(1.3)',
                                                    }}
                                                />
                                            )}
                                            
                                            {/* Node circle */}
                                            <div
                                                className={cn(
                                                    "relative rounded-full flex items-center justify-center",
                                                    "border-2 shadow-2xl transition-all duration-500",
                                                    "w-14 h-14 z-10",
                                                    "group-hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]",
                                                    commit.isMerge
                                                        ? "bg-gradient-to-br from-purple-600/90 via-purple-500/80 to-purple-700/90 dark:from-purple-500/90 dark:via-purple-400/80 dark:to-purple-600/90 border-purple-500 dark:border-purple-400"
                                                        : isHead
                                                        ? "bg-gradient-to-br from-green-600/90 via-green-500/80 to-green-700/90 dark:from-green-500/90 dark:via-green-400/80 dark:to-green-600/90 border-green-500 dark:border-green-400"
                                                        : "bg-gradient-to-br from-primary/90 via-primary/80 to-primary/90 border-primary"
                                                )}
                                                style={{
                                                    boxShadow: commit.isMerge
                                                        ? "0 0 0 3px rgba(168, 85, 247, 0.2), 0 8px 24px rgba(168, 85, 247, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.15)"
                                                        : isHead
                                                        ? "0 0 0 3px rgba(34, 197, 94, 0.2), 0 8px 24px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.15)"
                                                        : "0 0 0 3px rgba(var(--primary), 0.2), 0 8px 24px rgba(var(--primary), 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.15)",
                                                }}
                                            >
                                                {commit.isMerge ? (
                                                    <GitMerge className="w-7 h-7 text-white dark:text-purple-100 drop-shadow-lg" />
                                                ) : (
                                                    <GitCommit className="w-7 h-7 text-white dark:text-primary-foreground drop-shadow-lg" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Commit info */}
                                <div className="flex-1 flex flex-col gap-3 pt-3 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {/* Hash */}
                                        <code className="text-sm font-mono font-bold text-foreground bg-muted/90 dark:bg-muted/70 px-4 py-2 rounded-lg border-2 border-border/80 shadow-md backdrop-blur-sm">
                                            {commit.hash}
                                        </code>

                                        {/* Labels */}
                                        {commit.labels && commit.labels.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {commit.labels.map((label) => (
                                                    <span
                                                        key={label}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-bold",
                                                            "shadow-md border-2 backdrop-blur-sm",
                                                            "transition-all duration-300 hover:scale-110 hover:shadow-lg",
                                                            label.includes("HEAD")
                                                                ? "bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-800 dark:text-green-200 border-green-500/70 dark:border-green-400/70 shadow-green-500/30"
                                                                : "bg-gradient-to-r from-blue-500/30 to-blue-600/30 text-blue-800 dark:text-blue-200 border-blue-500/70 dark:border-blue-400/70 shadow-blue-500/30"
                                                        )}
                                                    >
                                                        {label.includes("HEAD") && <GitBranch className="inline w-3 h-3 mr-1.5" />}
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Message/Label */}
                                    {commit.label && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground/90 font-medium italic">
                                                {commit.label}
                                            </span>
                                        </div>
                                    )}

                                    {/* Optional commit message */}
                                    {commit.message && (
                                        <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                                            {commit.message}
                                        </p>
                                    )}

                                    {/* Optional author */}
                                    {commit.author && (
                                        <p className="text-xs text-muted-foreground/70">
                                            {commit.author}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default CommitGraph;
