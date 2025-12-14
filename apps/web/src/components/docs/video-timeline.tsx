"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TimelineFrame {
    type: "I" | "P" | "B";
    label?: string;
}

interface TimelineChunk {
    frames: number;
    label?: string;
}

interface VideoTimelineProps {
    frames?: TimelineFrame[];
    chunks?: TimelineChunk[];
    className?: string;
    showLegend?: boolean;
}

const frameColors = {
    I: "bg-primary text-primary-foreground",
    P: "bg-muted text-muted-foreground",
    B: "bg-secondary text-secondary-foreground",
};

const frameDescriptions = {
    I: "Keyframe (complete image)",
    P: "Predicted frame",
    B: "Bidirectional frame",
};

export function VideoTimeline({
    frames = [
        { type: "I" },
        { type: "P" },
        { type: "P" },
        { type: "P" },
        { type: "I" },
        { type: "P" },
        { type: "P" },
        { type: "P" },
        { type: "I" },
    ],
    chunks = [
        { frames: 4, label: "Chunk 1" },
        { frames: 4, label: "Chunk 2" },
        { frames: 1, label: "..." },
    ],
    className,
    showLegend = true,
}: VideoTimelineProps) {
    return (
        <div className={cn("rounded-lg border bg-card p-6", className)}>
            {/* Frames row */}
            <div className="mb-2">
                <div className="flex gap-1">
                    {frames.map((frame, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-sm",
                                frameColors[frame.type]
                            )}
                        >
                            {frame.type}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chunk brackets */}
            <div className="flex gap-1 mb-4">
                {chunks.map((chunk, i) => (
                    <div
                        key={i}
                        className="flex flex-col items-center"
                        style={{ width: `${chunk.frames * 44 - 4}px` }}
                    >
                        <div className="w-full border-t-2 border-l-2 border-r-2 border-primary/50 h-3 rounded-t" />
                        <span className="text-xs text-muted-foreground mt-1">{chunk.label}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                    {(Object.keys(frameDescriptions) as Array<keyof typeof frameDescriptions>).map((type) => (
                        <div key={type} className="flex items-center gap-2 text-sm">
                            <div
                                className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold",
                                    frameColors[type]
                                )}
                            >
                                {type}
                            </div>
                            <span className="text-muted-foreground">{frameDescriptions[type]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default VideoTimeline;
