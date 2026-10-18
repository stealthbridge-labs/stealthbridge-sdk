import test from "node:test";
import assert from "node:assert/strict";
import { AssetAmount, quotePlatformFee, MAX_PLATFORM_FEE_BPS,
  DEFAULT_PLATFORM_FEE_BPS, PlatformFeeError } from "../dist/index.js";

const asset = { network: "testnet", kind: "stellar-classic", identifier: "XLM", decimals: 7 };

test("default 0.10% fee quotes gross, net and fee in exact minor units", () => {
  const gross = AssetAmount.parse(asset, "100.0000000");
  const q = quotePlatformFee(gross);
  assert.equal(q.basisPoints, DEFAULT_PLATFORM_FEE_BPS);
  assert.equal(q.platformFee.format(), "0.1");
  assert.equal(q.recipientAmount.format(), "99.9");
  assert.equal(q.gross.format(), "100");
  assert.equal(q.rounding, "down");
  assert.equal(q.collectionEnabled, false);
});

test("fee caps cannot exceed a reviewed 0.50% quote", () => {
  assert.equal(MAX_PLATFORM_FEE_BPS, 50);
  const q = quotePlatformFee(AssetAmount.parse(asset, "100"), { basisPoints: 50 });
  assert.equal(q.platformFee.format(), "0.5");
  assert.equal(q.recipientAmount.format(), "99.5");
});

test("optional cap is applied in exact asset units", () => {
  const gross = AssetAmount.parse(asset, "100");
  const capped = quotePlatformFee(gross, { basisPoints: 50, maxFeeMinorUnits: 2000000n });
  assert.equal(capped.platformFee.format(), "0.2");
  assert.equal(capped.recipientAmount.format(), "99.8");
});

test("dust rounds down and never charges a hidden minimum", () => {
  const q = quotePlatformFee(AssetAmount.parse(asset, "0.0000001"));
  assert.equal(q.platformFee.minorUnits, 0n);
  assert.equal(q.recipientAmount.minorUnits, 1n);
});

test("zero fee policy is explicitly supported for test users", () => {
  const q = quotePlatformFee(AssetAmount.parse(asset, "50"), { basisPoints: 0 });
  assert.equal(q.platformFee.minorUnits, 0n);
  assert.equal(q.recipientAmount.format(), "50");
});

test("malformed rate and cap are rejected", () => {
  const gross = AssetAmount.parse(asset, "100");
  for (const basisPoints of [-1, 51, 0.5, NaN, Infinity]) {
    assert.throws(() => quotePlatformFee(gross, { basisPoints }), PlatformFeeError);
  }
  assert.throws(() => quotePlatformFee(gross, { maxFeeMinorUnits: -1n }), PlatformFeeError);
  assert.throws(() => quotePlatformFee(gross, { maxFeeMinorUnits: 1 }), PlatformFeeError);
  assert.throws(() => quotePlatformFee({}, {}), PlatformFeeError);
});

test("never changes the input amount or asset identity", () => {
  const gross = AssetAmount.parse(asset, "70");
  const q = quotePlatformFee(gross, {basisPoints: 10});
  assert.equal(gross.format(), "70");
  assert.equal(q.platformFee.asset.identifier, gross.asset.identifier);
  assert.equal(q.recipientAmount.asset.identifier, gross.asset.identifier);
  assert.equal(q.collectionEnabled, false);
});
