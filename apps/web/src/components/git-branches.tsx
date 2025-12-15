"use client";

import { useEffect, useRef, useState } from "react";

interface Point {
    x: number;
    y: number;
}

interface Branch {
    points: Point[];
    color: string;
    width: number;
    progress: number;
}

export function GitBranches() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const branchesRef = useRef<Branch[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Branch colors with varying opacity
        const colors = [
            "rgba(120, 180, 80, 0.35)",  // main - olive green
            "rgba(80, 200, 120, 0.3)",   // feature - emerald
            "rgba(100, 160, 100, 0.25)", // develop - sage
            "rgba(140, 200, 100, 0.25)", // hotfix - lime
            "rgba(90, 170, 90, 0.2)",    // release - green
        ];

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;
            ctx.scale(2, 2);
            setDimensions({ width: rect.width, height: rect.height });
            generateBranches(rect.width, rect.height);
        };

        const generateBranches = (w: number, h: number) => {
            const branches: Branch[] = [];
            const gridX = 50;
            const gridY = 35;

            // Left side main branch
            branches.push({
                points: generateMainPath(60, -30, h + 50, gridY),
                color: colors[0],
                width: 2.5,
                progress: 0,
            });

            // Left feature branches (multiple)
            [80, 200, 350, 500].forEach((startY, i) => {
                if (startY < h) {
                    branches.push({
                        points: generateFeaturePath(60, startY, 120 + i * 30, gridX * (1 + i % 2), gridY),
                        color: colors[1 + (i % 3)],
                        width: 1.5,
                        progress: 0,
                    });
                }
            });

            // Center-left branch
            branches.push({
                points: generateMainPath(w * 0.35, -50, h + 30, gridY),
                color: colors[2],
                width: 2,
                progress: 0,
            });

            // Center-left feature
            [150, 380].forEach((startY, i) => {
                if (startY < h) {
                    branches.push({
                        points: generateFeaturePath(w * 0.35, startY, 100 + i * 40, gridX, gridY),
                        color: colors[3],
                        width: 1.5,
                        progress: 0,
                    });
                }
            });

            // Right side main branch
            branches.push({
                points: generateMainPath(w - 60, -20, h + 40, gridY),
                color: colors[0],
                width: 2.5,
                progress: 0,
            });

            // Right feature branches (going left)
            [100, 280, 450].forEach((startY, i) => {
                if (startY < h) {
                    branches.push({
                        points: generateFeaturePathLeft(w - 60, startY, 140 + i * 25, gridX * (1 + i % 2), gridY),
                        color: colors[1 + (i % 3)],
                        width: 1.5,
                        progress: 0,
                    });
                }
            });

            // Center-right branch
            branches.push({
                points: generateMainPath(w * 0.7, -40, h + 20, gridY),
                color: colors[4],
                width: 2,
                progress: 0,
            });

            branchesRef.current = branches;
        };

        // Generate main branch path (straight down)
        function generateMainPath(x: number, startY: number, endY: number, stepY: number): Point[] {
            const points: Point[] = [];
            for (let y = startY; y <= endY; y += stepY) {
                points.push({ x, y });
            }
            return points;
        }

        // Generate feature branch path (branches right, goes down, merges back)
        function generateFeaturePath(startX: number, startY: number, length: number, offsetX: number, stepY: number): Point[] {
            const points: Point[] = [];
            points.push({ x: startX, y: startY });
            points.push({ x: startX + offsetX, y: startY });
            for (let y = startY + stepY; y < startY + length; y += stepY) {
                points.push({ x: startX + offsetX, y });
            }
            points.push({ x: startX, y: startY + length });
            return points;
        }

        // Generate feature branch path going left
        function generateFeaturePathLeft(startX: number, startY: number, length: number, offsetX: number, stepY: number): Point[] {
            const points: Point[] = [];
            points.push({ x: startX, y: startY });
            points.push({ x: startX - offsetX, y: startY });
            for (let y = startY + stepY; y < startY + length; y += stepY) {
                points.push({ x: startX - offsetX, y });
            }
            points.push({ x: startX, y: startY + length });
            return points;
        }

        const animate = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            branchesRef.current.forEach((branch, branchIndex) => {
                // Animate progress
                if (branch.progress < 1) {
                    branch.progress = Math.min(1, branch.progress + 0.008 + branchIndex * 0.001);
                }

                const pointsToShow = Math.floor(branch.points.length * branch.progress);
                if (pointsToShow < 2) return;

                // Draw branch line
                ctx.strokeStyle = branch.color;
                ctx.lineWidth = branch.width;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                ctx.beginPath();
                for (let i = 0; i < pointsToShow; i++) {
                    const point = branch.points[i];
                    if (i === 0) {
                        ctx.moveTo(point.x, point.y);
                    } else {
                        ctx.lineTo(point.x, point.y);
                    }
                }
                ctx.stroke();

                // Draw commit nodes with glow
                for (let i = 0; i < pointsToShow; i++) {
                    if (i % 3 === 0 || i === branch.points.length - 1) {
                        const point = branch.points[i];
                        const nodeColor = branch.color.replace(/[\d.]+\)$/, "0.6)");
                        const glowColor = branch.color.replace(/[\d.]+\)$/, "0.15)");

                        // Glow
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
                        ctx.fillStyle = glowColor;
                        ctx.fill();

                        // Node
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                        ctx.fillStyle = nodeColor;
                        ctx.fill();

                        // Inner dot
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = branch.color.replace(/[\d.]+\)$/, "0.9)");
                        ctx.fill();
                    }
                }
            });

            // Continue animation if not complete
            const allComplete = branchesRef.current.every(b => b.progress >= 1);
            if (!allComplete) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        resize();
        animate();

        window.addEventListener("resize", resize);
        return () => {
            window.removeEventListener("resize", resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
    );
}
