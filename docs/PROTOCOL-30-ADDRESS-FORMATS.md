# Stellar Protocol 30 & Supported Address Formats

StealthBridge enforces strict, official SEP-23 / CAP-84 StrKey validation (exact uppercase Base32 `A-Z2-7`, version byte, canonical zero unused trailing bits for 69-character muxed forms, and little-endian CRC16-XModem checksums). Permissive prefix-only regexes are never used.

## Supported StrKey formats

| Prefix | Type | Length | Version byte | Unused Base32 bits | Where accepted in StealthBridge |
| --- | --- | --- | --- | --- | --- |
| `G...` | Classic Ed25519 account | 56 | `6 << 3` (`48`) | `0` | Freighter SEP-53 login, org/account ownership, senders, classic asset issuers, encrypted draft/review recipients, Horizon classic presence |
| `M...` | Muxed classic Ed25519 account + uint64 ID | 69 | `12 << 3` (`96`) | `1` (must be `0`) | Recipient inputs (`classifyPublicStellarAddress`, `preparePrivateTransfer`, encrypted draft vault, local review commitment, business batch CSV), classic presence check (resolves underlying `G...` on Testnet Horizon; mux ID routing is **not** verified) |
| `C...` | Soroban contract ID | 56 | `2 << 3` (`16`) | `0` | Contract event journal/cursors (`^C[A-Z2-7]{55}$`), `/v1/wallet/contracts/{address}`, recipient inputs, encrypted draft/review recipients, business batch CSV, RPC instance presence |
| `W...` | CAP-84 muxed contract + uint64 ID | 69 | `22 << 3` (`176`) | `1` (must be `0`) | Recipient inputs (`classifyPublicStellarAddress`, `preparePrivateTransfer`, encrypted draft vault, local review commitment, business batch CSV), recipient presence check (resolves underlying `C...` instance on Testnet RPC; mux ID routing and `__check_auth` permissions are **not** verified) |

## Dependency & Protocol 30 boundaries

- **Contracts (`stealthbridge-contracts`)**: Pinned at `soroban-sdk = "=27.0.6"` (`soroban-sdk` 30 is pre-release `30.0.0-rc.1`; Protocol 27 contracts execute without recompilation on Protocol 30 Testnet).
- **Preflight (`tools/smart-account-preflight`)**: Pinned at `smart-account-kit: "0.10.0"` and `@stellar/stellar-sdk: "16.4.1"`. SDK 16.4.1 parses Protocol 30 `LedgerHeader` and low-level `ScAddress::MuxedContract` XDR, while rejecting `W...` StrKey values in high-level `Address.fromString()` / `StrKey`. `smart-account-kit@0.10.0` exposes a base64 `AuthEntryInput` string overload on `signAuthEntry` for SDK 17 callers, but signing paths do not add native `W...` support.
- **Backend (`stealthbridge-backend`)**: Upgraded to `stellar-xdr = "=30.0.0"` and `stellar-strkey = "=1.0.0"` to decode Protocol 30 `LedgerHeader` + CAP-84 `ScAddress::MuxedContract` XDR and validate `G`/`C`/`M`/`W` addresses natively.
- **SDK & Frontend (`stealthbridge-sdk`, `stealthbridge-frontend`)**: Zero-runtime-dependency SEP-23 / CAP-84 StrKey decoders cross-verified against `@stellar/stellar-sdk@17.4.0` test vectors (including rejection of corrupted trailing padding bits in `M...` and `W...`).

## Security guarantees preserved

- Customer wallet authentication (`organization_login_challenges`, `customer_profiles`, `customer_ciphertext_drafts`, `customer_payment_instructions`, `organization_invitations`) remains strictly **classic `G...`-only**; muxed `M...` and `W...` formats cannot authenticate as account owners or transaction senders.
- Presence checks for `M...` and `W...` confirm existence only of the underlying `G...` account or `C...` contract instance on Stellar Testnet; they never verify mux ID subaccount routing, recipient ownership, asset support, zero-knowledge proofs, or payment execution.
