// Display mirror of benchmarks/comparative/cost.mjs — kept in sync by hand.
// Shown inline on the page so the cost math is never hidden.
export const COST_ASSUMPTIONS = {
  storage_usd_per_gb_mo: 0.023, // S3 Standard
  egress_usd_per_gb: 0.09, // S3 egress
  line_mbps: 50, // typical upload line
};

export const COST_ASSUMPTIONS_LABEL =
  "S3 Standard $0.023/GB-mo · egress $0.09/GB · 50 Mbps upload";
