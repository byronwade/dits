"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BenchmarkMetricCardProps {
    title: string;
    value: string;
    unit?: string;
    description: string;
    comparison?: {
        label: string;
        improvement: string;
    };
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    icon?: React.ReactNode;
    variant?: "default" | "highlight";
}

export function BenchmarkMetricCard({
    title,
    value,
    unit,
    description,
    comparison,
    trend,
    trendValue,
    icon,
    variant = "default",
}: BenchmarkMetricCardProps) {
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

    return (
        <Card
            className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                variant === "highlight" && "border-brand/50 bg-brand/5"
            )}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {icon && <div className="text-brand">{icon}</div>}
                        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger render={<button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" />}>
                                <Info className="h-4 w-4" />
                                <span className="sr-only">More info</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <p className="text-sm">{description}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight">{value}</span>
                    {unit && (
                        <span className="text-lg font-medium text-muted-foreground">{unit}</span>
                    )}
                </div>

                {(comparison || (trend && trendValue)) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {comparison && (
                            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-success">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span className="font-medium">{comparison.improvement}</span>
                                <span className="text-success/70">
                                    vs {comparison.label}
                                </span>
                            </div>
                        )}

                        {trend && trendValue && (
                            <div className={cn("flex items-center gap-1", trendColor)}>
                                <TrendIcon className="h-3.5 w-3.5" />
                                <span className="text-xs">{trendValue}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            {/* Decorative gradient */}
            <div
                className={cn(
                    "absolute bottom-0 left-0 right-0 h-1",
                    variant === "highlight"
                        ? "bg-gradient-to-r from-brand/80 to-brand/40"
                        : "bg-gradient-to-r from-muted-foreground/20 to-transparent"
                )}
            />
        </Card>
    );
}
