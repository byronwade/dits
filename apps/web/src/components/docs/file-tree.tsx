"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, FileCode, FileText, FileVideo, FileImage, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeItem {
    name: string;
    type: "file" | "folder";
    children?: FileTreeItem[];
    comment?: string;
}

interface FileTreeProps {
    items: FileTreeItem[];
    className?: string;
    defaultExpanded?: boolean;
}

interface FileTreeNodeProps {
    item: FileTreeItem;
    level: number;
    defaultExpanded?: boolean;
}

function getFileIcon(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "tsx":
        case "ts":
        case "js":
        case "jsx":
        case "rs":
        case "py":
        case "go":
            return FileCode;
        case "md":
        case "txt":
        case "json":
        case "yaml":
        case "toml":
            return FileText;
        case "mp4":
        case "mov":
        case "avi":
        case "mkv":
            return FileVideo;
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "svg":
            return FileImage;
        case "mp3":
        case "wav":
        case "flac":
            return FileAudio;
        default:
            return File;
    }
}

function FileTreeNode({ item, level, defaultExpanded = true }: FileTreeNodeProps) {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    const isFolder = item.type === "folder";
    const hasChildren = isFolder && item.children && item.children.length > 0;

    const FileIcon = isFolder ? (isExpanded ? FolderOpen : Folder) : getFileIcon(item.name);

    const rowClassName = cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm font-mono",
        "hover:bg-muted/50 transition-colors",
        !hasChildren && "cursor-default"
    );

    const rowStyle = { paddingLeft: `${level * 16 + 8}px` };

    const rowContent = (
        <>
            {hasChildren ? (
                <span className="flex h-4 w-4 items-center justify-center text-muted-foreground" aria-hidden="true">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </span>
            ) : (
                <span className="w-4" aria-hidden="true" />
            )}

            <FileIcon className={cn(
                "h-4 w-4 shrink-0",
                isFolder ? "text-brand" : "text-muted-foreground"
            )} aria-hidden="true" />

            <span className={cn(
                isFolder ? "font-medium text-foreground" : "text-muted-foreground"
            )}>
                {item.name}
            </span>

            {item.comment && (
                <span className="ml-2 text-xs text-muted-foreground/60">
                    {item.comment}
                </span>
            )}
        </>
    );

    return (
        <div>
            {hasChildren ? (
                <button
                    type="button"
                    className={rowClassName}
                    style={rowStyle}
                    aria-expanded={isExpanded}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {rowContent}
                </button>
            ) : (
                <div className={rowClassName} style={rowStyle}>
                    {rowContent}
                </div>
            )}

            {hasChildren && isExpanded && (
                <div>
                    {item.children!.map((child, index) => (
                        <FileTreeNode
                            key={`${child.name}-${index}`}
                            item={child}
                            level={level + 1}
                            defaultExpanded={defaultExpanded}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FileTree({ items, className, defaultExpanded = true }: FileTreeProps) {
    return (
        <div className={cn(
            "rounded-lg border bg-card p-2 font-mono text-sm",
            className
        )}>
            {items.map((item, index) => (
                <FileTreeNode
                    key={`${item.name}-${index}`}
                    item={item}
                    level={0}
                    defaultExpanded={defaultExpanded}
                />
            ))}
        </div>
    );
}

export default FileTree;
