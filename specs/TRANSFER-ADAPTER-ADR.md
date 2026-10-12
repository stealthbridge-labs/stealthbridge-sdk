# ADR: Keep confidential transfer adapters distinct and disabled

Status: design-only, not approved for execution. Addresses issue #2.

Confidential Tokens and Stellar Private Payments are separate research tracks with different disclosure, recovery and wallet requirements. Do not expose a generic `transfer()` API that hides those differences. Any future implementation requires pinned upstream versions, independently reproduced Testnet evidence, audited network binding and anti-replay design, explicit wallet-side witness custody/recovery, user confirmation and security review.

The `assessTransferCapability` helper only reports why a rail is unsupported; it cannot authorize or construct a transaction. It intentionally returns EXECUTION_DISABLED even when every input is true. Inputs are caller-provided and are not evidence of actual verification.

No signing, submission, payment execution or mainnet code is introduced.
