# Contributing to StealthBridge SDK

Welcome to `stealthbridge-sdk` (`@stealthbridge/sdk`), the dependency-free TypeScript ESM toolkit providing strict runtime schema validation, canonical SHA-256 digests, Protocol 30 StrKey validators, Web Crypto ciphertext helpers, and typed client adapters for StealthBridge.

> **SDK boundaries:** Never embed private keys, wallet seed phrases, operator credentials, mock balances, hardcoded exchange rates, or unverified payment-execution claims. Validate every external response strictly before returning it to callers.

---

## 1. Repository Architecture

- **Package format:** Pure TypeScript ESM (`"type": "module"`, Node `>= 22`, zero runtime npm dependencies).
- **Source modules (`src/`):**
  - `wallet.ts` — Official StrKey / Protocol 30 (`G`, `M`, `C`, CAP-84 `W`) parsers.
  - `client.ts`, `generated/api-wire.ts` — Typed read-only bridge client generated directly from OpenAPI v0.3 (`specs/backend-openapi.v0.3.yaml`).
  - `account-beneficiaries.ts`, `account-directory.ts`, `account-profile.ts`, `business-*.ts` — Account & organization typed clients.
  - `privacy-rails.ts`, `private-draft-vault.ts`, `private-review-commitment.ts`, `payment-instructions.ts` — Client-side encryption & explicit privacy disclosures.
  - `settlement-lifecycle.ts`, `amount.ts` — Canonical settlement digests, exact integer math, and bounded HTTP helpers.
- **Consumer verification (`tests/fixtures/`):** Isolated Node ESM (`node-esm`), Node CJS, browser bundler (`esbuild`), and Next.js App Router consumers packed from an actual `npm pack` tarball.

---

## 2. Local Setup & Verification

```bash
npm ci --no-audit --no-fund
npm run verify
```

`npm run verify` runs:
1. `npm run check:version` — SemVer & release tag checks.
2. `npm run check:api-types` — Deterministic regeneration parity against `specs/backend-openapi.v0.3.yaml`.
3. `npm run typecheck` — Strict TypeScript compiler checks.
4. `npm test` — Full unit suite + isolated `npm pack` consumer builds & bundle-size budget checks.

---

## 3. Practical Contributor Walkthroughs

### How to Add a New Typed SDK Client Method & Validator
1. **Create a focused module** in `src/<feature>.ts`:
   - Reject malformed inputs with `TypeError` before performing `fetch`.
   - Reject any response with missing/extra keys or permissive execution flags unless explicitly verified (`payment_execution_enabled === false`, etc.).
   - Never add Node built-in (`node:fs`, `node:crypto`) imports inside browser-compatible modules; use standard Web Crypto (`crypto.subtle`) where browser execution is needed.
2. **Export cleanly** from `src/index.ts`.
3. **Update package integrity fixtures & budgets:**
   - Add new `dist/<feature>.d.ts` and `dist/<feature>.js` paths to `expectedPackageFiles` in `tests/package.test.mjs`.
   - Add new sorted export symbol names to `tests/fixtures/node-esm/index.mjs`.
   - Measure actual packed/unpacked/bundle sizes cleanly if budgets need an explicit reviewed bump.
4. **Update OpenAPI models (if backend OpenAPI changed):**
   - Copy updated `api/openapi.yaml` → `specs/backend-openapi.v0.3.yaml`.
   - Run `npm run generate:api-types` and commit the deterministic `src/generated/api-wire.ts`.
   - Sync `stealthbridge-frontend/src/lib/sdk-api-wire.v0.2.ts` afterward.
5. **Add adversarial unit tests** in `tests/<feature>.test.mjs` covering malformed shapes, network mismatches, wrong-owner addresses, and error states.

---

## 4. Release & Security Policy

- Record user-facing changes in `CHANGELOG.md` under `Unreleased`.
- Only maintainers publish releases after explicit provenance and licensing review (`"private": true` remains set until public npm release approval).
- Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and disclose security issues via [SECURITY.md](SECURITY.md).
