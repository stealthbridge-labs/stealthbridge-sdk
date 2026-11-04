# Browser-owned private review fingerprint

Use `createPrivateReviewReceipt(draft)` after independently checking the exact
operator-configured Testnet corridor and recipient. It uses `crypto.getRandomValues`
to generate a 32-byte nonce and SHA-256 to bind the local draft to the network,
route, source/destination countries, issuer, rail, public addresses, amount and
reference. `verifyPrivateReviewReceipt(draft, receipt)` rechecks the fingerprint
**locally**; any change fails. Results have `paymentAuthorized:false` and
`zkProofVerified:false` by design.

**Never share or upload `receipt.nonceHex`**. Sharing the hash alone does not
expose the amount by simple dictionary search as long as the salt is private.
The scheme is intentionally different from a ZK pool commitment, since those
must use the canonical protocol-defined hash/verifier and audited witnesses.
The receipt does not prove privacy, ownership, issuer approval, settlement,
confidentiality or fiat delivery.

The frontend mirrors the SDK's source until packages can be pinned together in
a deployment-wide integration version; preserve the pinned backend test vector.

Run `npm test` for randomized-salt, tamper, negative parsing and cross-language
SHA-256 fixtures. No network transaction is performed by these utilities.
