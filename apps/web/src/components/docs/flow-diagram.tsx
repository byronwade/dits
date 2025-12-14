"use client";

import * as React from "react";
import {
    ArrowDown,
    Globe,
    Wifi,
    Radio,
    Server,
    Shield,
    Zap,
    Share2,
    type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Map of icon names to icon components
const iconMap: Record<string, LucideIcon> = {
    Globe,
    Wifi,
    Radio,
    Server,
    Shield,
    Zap,
    Share2,
};

interface FlowStep {
    iconName: string;
    label: string;
    description?: string;
    priority?: number;
}

interface FlowDiagramProps {
    title?: string;
    steps: FlowStep[];
    className?: string;
    direction?: "vertical" | "horizontal";
}

export function FlowDiagram({ title, steps, className, direction = "vertical" }: FlowDiagramProps) {
    const isVertical = direction === "vertical";

    return (
        <div className={cn("rounded-lg border bg-card p-6", className)}>
            {title && (
                <h4 className="font-semibold text-lg mb-4 text-center">{title}</h4>
            )}

            <div className={cn(
                "flex gap-4",
                isVertical ? "flex-col" : "flex-row flex-wrap justify-center items-start"
            )}>
                {steps.map((step, index) => {
                    const IconComponent = iconMap[step.iconName] || Globe;

                    return (
                        <React.Fragment key={index}>
                            {/* Step */}
                            <div className={cn(
                                "flex gap-4 items-start",
                                !isVertical && "flex-col items-center text-center min-w-[140px] max-w-[180px]"
                            )}>
                                {/* Icon circle */}
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <IconComponent className="w-6 h-6 text-primary" />
                                </div>

                                {/* Content */}
                                <div className={cn(!isVertical && "flex-1")}>
                                    <div className="flex items-center gap-2">
                                        {step.priority !== undefined && (
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {step.priority}.
                                            </span>
                                        )}
                                        <h5 className="font-medium">{step.label}</h5>
                                    </div>
                                    {step.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Arrow between steps */}
                            {index < steps.length - 1 && (
                                <div className={cn(
                                    "flex items-center justify-center text-muted-foreground/40",
                                    isVertical ? "pl-5" : ""
                                )}>
                                    {isVertical ? (
                                        <ArrowDown className="w-5 h-5" />
                                    ) : (
                                        <ArrowDown className="w-5 h-5 rotate-[-90deg]" />
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

export default FlowDiagram;
