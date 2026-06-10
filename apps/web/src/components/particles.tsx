"use client";

import dynamic from "next/dynamic";

// Dynamically import particles-bg with no SSR to avoid hydration issues
const ParticlesBg = dynamic(() => import("particles-bg"), { ssr: false });

export function Particles() {
    return (
        <ParticlesBg
            type="lines"
            bg={false}
            num={100}
            color="#78b450"
        />
    );
}
