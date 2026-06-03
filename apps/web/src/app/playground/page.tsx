import type { Metadata } from "next";
import { PlaygroundClient } from "@/components/playground/playground-client";

export const metadata: Metadata = {
  title: "Playground — see the engine work | Dits",
  description:
    "Interactive labs that compute live in your browser: frame-level deduplication, zero-storage trims, incremental streaming sync, and real measured codec/benchmark data.",
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
