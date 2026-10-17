# Authenticated Read-only Business Review SDK

StealthBridge exposes `readBusinessReviewStatus` and `validBusinessReviewStatus` from `@stealthbridge/sdk`.

The reader makes an HTTPS GET to `/v1/business/reviews/{organization}/{request_id}` using a **caller-supplied, short-lived Testnet read session**. It does not generate wallet signatures, store tokens, retry requests, or authorize payment execution. It accepts only exact UUID paths and validates the complete response, including `financial_execution_authorized: false` and `signatures_verified: false`. Unexpected status or inflated reviewer claims fail closed.

Example after an independently verified, authorized backend session has been issued:

```ts
import { readBusinessReviewStatus } from "@stealthbridge/sdk";

const status = await readBusinessReviewStatus({
  apiBaseUrl: process.env.STEALTHBRIDGE_API_ORIGIN!,
  network: "testnet",
  organization: selectedOrganizationId,
  requestId: selectedReviewId,
  bearerToken: ephemeralOrganizationReadSession,
});
console.log(status.review_count, status.remaining_reviewers);
```

The identifier and ephemeral session variables above must come from your verified account workflow, **not** hardcoded examples or a public page. Never log, store in localStorage, or forward sessions through the marketing-site proxy. There is no session minting API or funds-moving SDK method enabled.

This endpoint remains unavailable until server auth configuration is reviewed and all required SQLx migrations are applied to the selected environment. CI tests validate oversized bodies, wrong networks, cross-tenant response substitution and false execution claims.

See `specs/backend-openapi.v0.3.yaml` for the pinned API contract. Product identity remains **StealthBridge**; technical wire/API version fields are solely compatibility markers.
