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
import { Info, Check, X, Minus } from "lucide-react";

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
            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
        ) : (
            <X className="h-4 w-4 text-red-500 mx-auto" />
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
        <div className="rounded-xl border bg-card overflow-hidden">
            {(title || description) && (
                <div className="p-4 border-b">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
            )}

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
                                                <TooltipTrigger asChild>
                                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
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
                    {rows.map((row, idx) => (
                        <TableRow
                            key={row.label}
                            className={cn(
                                row.highlight && "bg-primary/5 hover:bg-primary/10"
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
        </div>
    );
}
