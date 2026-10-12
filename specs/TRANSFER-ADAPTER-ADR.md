# ADR 007 — Separate wallet-owned privacy adapters (source review 2026-10-12)

**Status:** Reviewed design boundary, **no transaction-execution implementation or protocol verification.** The current SDK does not sign, simulate for payment purposes, submit funds, store secrets or enable Mainnet. This closes a *design* issue only, not Stellar Testnet confidentiality validation.

## Upstream primary-source review

- Stellar, [Developer Preview: Confidential Tokens](https://stellar.org/blog/developers/developer-preview-confidential-tokens-on-stellar) documents an OpenZeppelin wrapper of SEP-41 assets with **private amounts/balances but public sender/recipient addresses**, UltraHonk/Noir proof verification, optional auditor key, selective disclosure, and issuer/SAC control inheritance. Freighter on Stellar Testnet is suggested for the demo. The preview is not evidence our contracts have been deployed or verified.
- Stellar, [Privacy on Stellar](https://developers.stellar.org/docs/build/apps/privacy) and [Developer Preview: Stellar Private Payments](https://stellar.org/blog/developers/developer-preview-stellar-private-payments) describe a distinct shielded-pool private-counterparty model.
- Nethermind, [Stellar Private Payments upstream README](https://github.com/NethermindEth/stellar-private-payments), explicitly labels the reference implementation work-in-progress, unaudited and unsuitable for real assets. It uses Circom/Groth16, nullifiers, user-owned notes, ASP allow/block proof trees and client-side WebAssembly proving. Its [web SDK README](https://github.com/NethermindEth/stellar-private-payments/blob/main/sdk/web/README.md) documents `signMessage`, `signTransaction`, `signAuthEntry` and an optional `FreighterSigner` integration; `derivePrivacyKeys()` is wallet-signature dependent and uses the v1 domain-separated message and SEP-53 signature verification. These are **upstream methods only**, not enabled StealthBridge methods.

**Version/security caveat:** These were reviewed as current upstream documentation on October 12, 2026; third-party alpha APIs can change without notice. Before implementing a real adapter, pin an exact reviewed upstream commit/package checksum, independently verify supported wallet methods with the intended signer, execute adversarial Testnet reproducibility tests, and obtain a security review. A type interface is not proof of wallet support.

## Never use a generic `transfer()` in this SDK

`ConfidentialTokenAdapterDesign` and `PrivatePaymentsAdapterDesign` in `src/transfer-capability.ts` are separate discriminated types:

| Dimension | Confidential Token | Private Payments |
| --- | --- | --- |
| Privacy | Amount and balance, **not addresses** | Shielded pool note/counterparty privacy |
| Proof model | UltraHonk/Noir | Circom/Groth16 |
| Public observability | Sender and recipient visible | Pool entry/exit visible, private hops distinct |
| Key custody | Wallet account and local proving material | Device-owned derivation keys, encrypted notes/nullifiers and recovery |
| Issuer/compliance | SAC freeze, auditor view-key and policy-hook analysis | ASP association sets and policy proof consistency |
| StealthBridge execution | **Disabled** | **Disabled** |

Neither adapter exports a `sign`, `submit`, `transfer`, `deposit`, `withdraw`, secret-export or money-movement function. `assessWalletOwnedAdapter` is a pure, fail-closed capability screen; it cannot accept upstream proof bytes or create a transaction. A caller-provided Boolean `independentlyVerified` does not constitute cryptographic evidence.

## Future opt-in wallet authorization flow (NOT implemented)

1. Discover the exact wallet account, network passphrase and versioned capability using supported official wallet APIs. Reject absent wallet, wrong Testnet passphrase, unsupported signer, and multisig mismatch; never request seed phrases.
2. Independently pin/Testnet-verify the contract ID/bytecode and selected proof system. Keep chain and asset identity and compliance/policy revision explicit.
3. Bind the wallet consent to **account + network passphrase + protocol rail + contract identity + unique challenge/nonce + expiry + exact public authorization summary**. Reject replayed nonce, wrong domain, expired signature, unknown tx intent, and stale policy snapshots.
4. Prover/wallet activity happens **entirely in the user's local client**. For private pools, store only encrypted device-local notes and nullifier state with a user-controlled recovery key/backup; backend must never see private keys, note plaintext, spending witnesses or decrypted balance.
5. Display the rail-specific disclosure summary and fees; require an explicit human confirmation before a wallet-specific SEP-43 signing call in a separately reviewed future module. Never infer approval from merely connecting a wallet.
6. Require independently reproducible proof verification, audit evidence, double-spend/nullifier tests, issuer-compliance review and explicit security/product approval before contemplating transaction execution. On any failure remain **EXECUTION_DISABLED**.

## Threat matrix

| Threat | Required control / test |
| --- | --- |
| Network swapping or cross-chain replay | Exact Testnet passphrase and challenge domain binding; wrong-network negative test |
| Cross-rail confusion | Discriminated privacy model + distinct prover; wrong-rail and wrong-prover negative tests |
| Backend exfiltration of notes/witnesses | Device-only encrypted backup; no storage/network interfaces in SDK descriptors |
| Signer/address mismatch | Verified wallet signature/account binding before local derivation |
| Unverified proof system | Fails `MISSING_PROOF` or `UNVERIFIED_RAIL` |
| UX dark-pattern signing | Explicit review + human consent gate in future code; **no current signing** |
| Fake upstream capability | A capability flag is not proof; output never authorizes transfers |

## Compatibility and verification

`src/transfer-capability.ts` adds **type-only** explicit adapter protocols and `assessWalletOwnedAdapter`; the existing `StealthBridgeClient` stays strictly GET-only. Unit tests exercise wrong network, missing proof, unsupported wallet/custody, replay design markers, wrong rail/prover and disabled execution. `npm run verify` runs them and also enforces the separate OpenAPI type lockfile and consumer fixture tests.

**No real asset, issuer endorsement, Testnet privacy proof or on-chain transfer is asserted.**
