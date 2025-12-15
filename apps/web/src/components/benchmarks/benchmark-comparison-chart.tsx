"use client";

import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ComparisonBarProps {
    label: string;
    ditsValue: number;
    otherValue: number;
    unit: string;
    ditsLabel?: string;
    otherLabel?: string;
    lowerIsBetter?: boolean;
    tooltip?: string;
}

function ComparisonBar({
    label,
    ditsValue,
    otherValue,
    unit,
    ditsLabel = "Dits",
    otherLabel = "Git LFS",
    lowerIsBetter = false,
    tooltip,
}: ComparisonBarProps) {
    const maxValue = Math.max(ditsValue, otherValue);
    const ditsPercent = (ditsValue / maxValue) * 100;
    const otherPercent = (otherValue / maxValue) * 100;

    const ditsIsBetter = lowerIsBetter ? ditsValue < otherValue : ditsValue > otherValue;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="font-medium cursor-help">{label}</span>
                        </TooltipTrigger>
                        {tooltip && (
                            <TooltipContent side="top" className="max-w-xs">
                                <p>{tooltip}</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Dits bar */}
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-16 text-xs font-medium text-primary">{ditsLabel}</div>
                    <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-md flex items-center justify-end px-2 transition-all",
                                ditsIsBetter
                                    ? "bg-gradient-to-r from-emerald-500/80 to-emerald-500"
                                    : "bg-gradient-to-r from-primary/60 to-primary"
                            )}
                            style={{ width: `${ditsPercent}%` }}
                        >
                            <span className="text-xs font-semibold text-white">
                                {ditsValue.toLocaleString()} {unit}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Other bar */}
                <div className="flex items-center gap-2">
                    <div className="w-16 text-xs font-medium text-muted-foreground">{otherLabel}</div>
                    <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-md flex items-center justify-end px-2 transition-all",
                                !ditsIsBetter
                                    ? "bg-gradient-to-r from-emerald-500/80 to-emerald-500"
                                    : "bg-gradient-to-r from-muted-foreground/60 to-muted-foreground"
                            )}
                            style={{ width: `${otherPercent}%` }}
                        >
                            <span className="text-xs font-semibold text-white">
                                {otherValue.toLocaleString()} {unit}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface BenchmarkComparisonChartProps {
    title: string;
    description?: string;
    comparisons: Array<{
        label: string;
        ditsValue: number;
        otherValue: number;
        unit: string;
        lowerIsBetter?: boolean;
        tooltip?: string;
    }>;
    ditsLabel?: string;
    otherLabel?: string;
}

export function BenchmarkComparisonChart({
    title,
    description,
    comparisons,
    ditsLabel = "Dits",
    otherLabel = "Git LFS",
}: BenchmarkComparisonChartProps) {
    return (
        <div className="rounded-xl border bg-card p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
            </div>

            <div className="space-y-6">
                {comparisons.map((comparison) => (
                    <ComparisonBar
                        key={comparison.label}
                        {...comparison}
                        ditsLabel={ditsLabel}
                        otherLabel={otherLabel}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span>Better performance</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-muted-foreground" />
                    <span>Comparison baseline</span>
                </div>
            </div>
        </div>
    );
}
