# Business model and pricing principles

**Maturity:** Design

Business-model principles only; Dits has no hosted paid plan, price sheet, quota, or
support contract.

> Strategy, not a price sheet. Last reviewed: 2026-07-16. Dits has no hosted
> paid product today.

## Current position

The Dits local engine is open source under Apache-2.0 OR MIT. The current alpha
does not include a hosted service, paid plan, storage quota, service-level
agreement, or enterprise support contract.

Do not publish invented tiers or imply that a customer can buy a service that
does not exist.

## Intended model

Keep the durable format, local engine, and core protocol open. If the product
earns a commercial layer, charge for operational value around that foundation:

- managed remote storage and transfer;
- identity, policy, audit, retention, and administration;
- hosted review and workflow integrations;
- observability, recovery, regional operation, and service guarantees;
- migration, support, and enterprise deployment assistance.

This lets users retain access to their history without a subscription while a
commercial service earns revenue by making team operation safer and easier.

## Pricing principles

1. **Value before extraction.** Price only after pilots show which operational
   problem users will reliably pay to remove.
2. **Predictability.** Teams should be able to forecast cost from seats, stored
   data, transfer, and support without hidden deduplication assumptions.
3. **Portability.** Users can export and verify their repository with the open
   tooling.
4. **No double counting.** Deduplicated physical storage and logical source size
   must be described separately.
5. **Honest transfer accounting.** Do not promise P2P or delta-transfer savings
   until a working protocol produces measured results.
6. **Sustainable free local use.** The local engine should remain useful without
   an account or hosted dependency.

## Research required before setting prices

- Interview design partners about current Perforce, cloud-storage, transfer,
  review, and operational costs.
- Measure support and infrastructure costs with real pilot workloads.
- Separate willingness to pay for storage from policy, integrations, support,
  and recovery.
- Test whether the buyer is an engineering lead, pipeline lead, producer, IT
  operator, or studio executive.
- Validate one simple metric before considering usage-based combinations.

## Candidate packaging hypotheses

These are research hypotheses, not offers:

| Package | Intended user | Possible paid value |
|---|---|---|
| Open local engine | Individuals and evaluators | No charge; local history and format tooling |
| Managed team remote | Small and mid-sized teams | Reliable remote CAS, identity, policy, review hooks, recovery |
| Enterprise operations | Larger studios | Self-managed options, SSO, audit, regional topology, support, migration |

Specific prices, quotas, discounts, and launch dates remain unset until the
remote product exists and pilots establish cost and value.
