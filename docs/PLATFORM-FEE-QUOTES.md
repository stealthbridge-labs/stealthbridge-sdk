# Platform fee quotation: a transparent, test-only SDK foundation

**Current status: quote-only. The SDK does not collect, sign, escrow, transfer or send tokens.**

## Business proposal (not yet an active charge)

- Starting illustrative rate: **10 basis points (0.10%)**, with a hard SDK quote cap of **50 basis points (0.50%)**.
- Fee applies **inside the user's specified gross amount**, not as a surprise extra.
- `gross = recipientAmount + platformFee`.
- Fees use exact **integer minor units**, rounded **down**; tiny payments may have no fee.
- Optional per-transaction fee cap can lower the collected amount, never increase it.
- The caller must display gross, fee, net, network, asset and proposed collection identity before a future **separately consented transaction**.
- This is not an FX spread, compliance approval, network fee, liquidity fee, or guarantee of an executable payment.
- `collectionEnabled: false` is always returned by the quote function.

Example:

```ts
import { AssetAmount, quotePlatformFee } from "@stealthbridge/sdk";
const xlm = { network: "testnet", kind: "stellar-classic", identifier: "XLM", decimals: 7 } as const;
const amount = AssetAmount.parse(xlm, "100");
const quote = quotePlatformFee(amount, { basisPoints: 10 });
console.log(quote.platformFee.format()); // "0.1"
console.log(quote.recipientAmount.format()); // "99.9"
console.log(quote.collectionEnabled); // false
```

## What a future separately deployed fee-collection contract needs

1. An allowlisted **actual SEP-41 token contract** with validated decimals,
   issuer and permitted operations. Never treat a network's native transaction
   fee as business revenue; Stellar network fees are charged separately.
2. An explicit, user-authorized transfer with a fixed gross amount, quoted
   rate, treasury destination, fee cap, expiry and a replay-resistant payment ID.
3. Atomic payment and fee settlement; never charge a fee for a failed payment.
   Never take custody by simply redirecting user assets to the operator wallet.
4. Bounded, reviewed governance settings for platform rate and treasury,
   emergency pause, tested authorization, idempotency, event accuracy,
   recipient visibility and emergency recovery.
5. Separate company treasury/key custody from the deployment signer; audited
   upgrade controls, legal/issuer/asset reviews, and liquidity/settlement
   proofs before real-value Mainnet use.
6. Security testing with an **isolated Testnet demo asset** before any
   production implementation. On-chain transfers are publicly observable
   unless an independently vetted privacy primitive is actually integrated.

The [three verified Stellar Testnet governance contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts/blob/main/deployments/testnet/VERIFIED-GOVERNANCE-RELEASE-2026-10-17.md)
do not contain a fee collector or any asset transfer function.

## Determinism and limitations

Both Node and browser consumers use the same `AssetAmount` and
`quotePlatformFee` functions and therefore receive the same gross/fee/net
values for identical validated asset inputs. Tests cover exact amount
arithmetic, zero rates, maximum-rate rejection, overflow-prone values,
minor-unit rounding and caps.

No currency conversion, Mainnet transaction construction, delegated signing,
wallet approval request or production fee schedule is included in this module.
