import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PERSONAL_SHIELDED_POOL,
  BUSINESS_CONFIDENTIAL_TOKEN,
  assertRailEnabled,
  PrivacyRailUnavailableError,
  personalPool,
  disclosureFor,
  strkeyPayload,
} from "../dist/index.js";

test("both rails are NO_GO and cannot be enabled", () => {
  for (const rail of ["personal-shielded-pool", "business-confidential-token"]) {
    assert.throws(() => assertRailEnabled(rail), (e) => e instanceof PrivacyRailUnavailableError && e.rail === rail && e.blockers.length > 0);
  }
  assert.equal(PERSONAL_SHIELDED_POOL.verdict, "NO_GO");
  assert.equal(BUSINESS_CONFIDENTIAL_TOKEN.verdict, "NO_GO");
  assert.ok(Object.isFrozen(PERSONAL_SHIELDED_POOL) && Object.isFrozen(PERSONAL_SHIELDED_POOL.pools[0]));
});

test("personal pools are the locked Testnet set, with checksummed ids and pinned code", () => {
  assert.equal(PERSONAL_SHIELDED_POOL.pools.length, 4);
  for (const p of PERSONAL_SHIELDED_POOL.pools) {
    assert.equal(strkeyPayload(p.id)?.kind, "C");
    assert.equal(strkeyPayload(p.token)?.kind, "C");
    assert.match(p.wasmSha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(personalPool("CCW3LL6DAYESXPLCI5XVHYAM2I6XOW7PUAZLXDH4UAVETQN332B5XIHL")?.asset, "XLM");
  assert.equal(personalPool("CBKLEZ3T7EFGQS3OFB4KGAAKEZ3KF2YJTWBOXWKUIKTIFWJ56UF6SNKI"), null, "the superseded pool is not offered");
  assert.equal(PERSONAL_SHIELDED_POOL.trustedSetup, "local (single party)");
});

test("disclosure models never call a deposit or withdrawal private, and business never hides counterparties", () => {
  assert.equal(disclosureFor("personal-shielded-pool", "deposit").fields.amount, "public");
  assert.equal(disclosureFor("personal-shielded-pool", "withdrawal").fields.recipient, "public");
  const shielded = disclosureFor("personal-shielded-pool", "shielded-transfer");
  assert.equal(shielded.fields.recipient, "hidden");
  assert.equal(shielded.fields.feePayer, "public");
  const conf = disclosureFor("business-confidential-token", "confidential-transfer");
  assert.equal(conf.fields.sender, "public");
  assert.equal(conf.fields.recipient, "public");
  assert.equal(conf.fields.amount, "hidden");
  assert.equal(disclosureFor("personal-shielded-pool", "privateTransfer"), null);
});
