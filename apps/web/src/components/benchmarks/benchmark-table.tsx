"use client";

import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/empty-state";
import { Info, Check, X, Minus, BarChart3 } from "lucide-react";

interface Column {
    key: string;
    label: string;
    tooltip?: string;
}

interface BenchmarkTableProps {
    title?: string;
    description?: string;
    columns: Column[];
    rows: Array<{
        label: string;
        values: Record<string, string | number | boolean>;
        highlight?: boolean;
    }>;
    highlightBest?: boolean;
}

function CellValue({ value }: { value: string | number | boolean }) {
    if (typeof value === "boolean") {
        return value ? (
            <Check className="h-4 w-4 text-success mx-auto" />
        ) : (
            <X className="h-4 w-4 text-destructive mx-auto" />
        );
    }

    if (value === "—" || value === "-" || value === "N/A") {
        return <Minus className="h-4 w-4 text-muted-foreground mx-auto" />;
    }

    return <span>{String(value)}</span>;
}

export function BenchmarkTable({
    title,
    description,
    columns,
    rows,
}: BenchmarkTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            {(title || description) && (
                <div className="border-b p-4">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    {description && (
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
            )}

            {rows.length === 0 ? (
                <EmptyState
                    icon={BarChart3}
                    title="No benchmark results"
                    description="Results will appear here when a comparable run is available."
                    className="rounded-none border-0"
                />
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Metric</TableHead>
                            {columns.map((col) => (
                                <TableHead key={col.key} className="text-center font-semibold">
                                    <div className="flex items-center justify-center gap-1.5">
                                        {col.label}
                                        {col.tooltip && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger render={<Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />} />
                                                    <TooltipContent side="top" className="max-w-xs">
                                                        <p className="text-xs">{col.tooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow
                                key={row.label}
                                className={cn(
                                    row.highlight && "bg-brand/5 hover:bg-brand/10"
                                )}
                            >
                                <TableCell className="font-medium">{row.label}</TableCell>
                                {columns.map((col) => (
                                    <TableCell key={col.key} className="text-center">
                                        <CellValue value={row.values[col.key]} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
