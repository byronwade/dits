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

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 rounded-md text-sm font-mono",
                    "hover:bg-muted/50 transition-colors cursor-default",
                    isFolder && hasChildren && "cursor-pointer"
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}
            >
                {/* Expand/collapse indicator for folders with children */}
                {hasChildren ? (
                    <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                ) : (
                    <span className="w-4" />
                )}

                {/* Icon */}
                <FileIcon className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isFolder ? "text-primary" : "text-muted-foreground"
                )} />

                {/* Name */}
                <span className={cn(
                    isFolder ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                    {item.name}
                </span>

                {/* Comment */}
                {item.comment && (
                    <span className="text-muted-foreground/60 text-xs ml-2">
                        {item.comment}
                    </span>
                )}
            </div>

            {/* Children */}
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
