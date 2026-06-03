import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSUMPTIONS, derive } from "../cost.mjs";

test("derive converts bytes to $ and seconds", () => {
  const d = derive({ stored_bytes: 1_073_741_824, wire_bytes: 1_073_741_824 }); // 1 GiB
  assert.ok(d.cost_storage_usd_yr > 0);
  assert.ok(d.upload_seconds_at_line > 0);
  assert.equal(typeof d.cost_egress_usd_per_1k, "number");
});

test("assumptions are visible constants", () => {
  assert.ok(ASSUMPTIONS.storage_usd_per_gb_mo > 0);
  assert.ok(ASSUMPTIONS.line_mbps > 0);
});
