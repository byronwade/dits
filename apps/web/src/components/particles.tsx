"use client";

import dynamic from "next/dynamic";

// Dynamically import particles-bg with no SSR to avoid hydration issues
const ParticlesBg = dynamic(() => import("particles-bg"), { ssr: false });

export function Particles() {
    // Config for branch-like effect
    const config = {
        num: [4, 7],
        rps: 0.1,
        radius: [5, 40],
        life: [1.5, 3],
        v: [2, 3],
        tha: [-40, 40],
        alpha: [0.6, 0],
        scale: [0.1, 0.4],
        position: "all",
        color: ["#78b450", "#50c878", "#6b8e23"],
        cross: "dead",
        random: 15,
        g: 5,
        onParticleUpdate: (ctx: CanvasRenderingContext2D, particle: { p: { x: number; y: number }; radius: number }) => {
            ctx.beginPath();
            ctx.rect(
                particle.p.x - particle.radius / 2,
                particle.p.y - particle.radius / 2,
                particle.radius,
                particle.radius
            );
            ctx.fillStyle = particle.radius > 10 ? "#78b450" : "#50c878";
            ctx.fill();
            ctx.closePath();
        },
    };

    return (
        <ParticlesBg
            type="lines"
            bg={false}
            num={100}
            color="#78b450"
        />
    );
}
