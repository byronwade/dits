// Each workload: which v2 fixture, which tools apply. Tier expectations drive CI asserts.
export const WORKLOADS = [
  { id: "reexport", label: "Re-export a finished clip",
    v1: "v1.mov", v2: "v2_reexport.mov",
    tools: ["git-lfs", "restic", "borg", "xdelta3", "dits-generic"], honestLoss: true },
  { id: "metadata", label: "Rename / metadata fix",
    v1: "v1.mp4", v2: "v2_meta.mp4",
    tools: ["restic", "borg", "xdelta3", "dits-generic"] },
  { id: "facr-regrade", label: "Re-color a few frames",
    facr: true, tools: ["dits-facr"], minDedup: 95 },
  { id: "stream", label: "Edit 2s of a stream",
    facr: true, tools: ["dits-facr"], minDedup: 75 },
  // Module E — more edit types, including the zero-byte wins.
  { id: "trim", label: "Trim / cut a clip",
    facr: true, input: "v1.mp4", tools: ["dits-facr"], minDedup: 99 },
  { id: "photo", label: "Non-destructive photo edit",
    facr: true, input: "photo.png", tools: ["dits-facr"], minDedup: 99 },
  { id: "grade-all", label: "Color-grade the whole clip",
    v1: "v1.mp4", v2: "v2_grade.mp4", tools: ["restic", "dits-generic"], honestLoss: true },
];
