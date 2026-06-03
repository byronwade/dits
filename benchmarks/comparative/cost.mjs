// All assumptions are explicit and surfaced on the page. No hidden math.
export const ASSUMPTIONS = {
  storage_usd_per_gb_mo: 0.023,   // S3 Standard
  egress_usd_per_gb: 0.09,        // S3 egress
  line_mbps: 50,                  // typical upload line
};

const GB = 1_073_741_824;

export function derive(metrics, a = ASSUMPTIONS) {
  const storedGb = (metrics.stored_bytes ?? 0) / GB;
  const wireGb = (metrics.wire_bytes ?? metrics.stored_bytes ?? 0) / GB;
  return {
    cost_storage_usd_yr: round(storedGb * a.storage_usd_per_gb_mo * 12, 2),
    cost_egress_usd_per_1k: round(wireGb * a.egress_usd_per_gb * 1000, 2),
    upload_seconds_at_line: round((wireGb * 8 * 1024) / a.line_mbps, 1), // GB→Mb / Mbps
  };
}

function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
