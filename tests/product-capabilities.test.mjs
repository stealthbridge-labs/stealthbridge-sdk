import test from "node:test";
import assert from "node:assert/strict";
import {
  assertModuleAvailable,
  listAvailableModules,
  ProductCapabilityError,
} from "../dist/index.js";

const manifest = [
  { module: "corridors", stage: "testnet", audiences: ["consumer", "business"], privacy: "public", evidence: "testnet-read-check" },
  { module: "payments", stage: "design", audiences: ["consumer"], privacy: "counterparty-private" },
  { module: "webhooks", stage: "mainnet", audiences: ["developer"], privacy: "public", evidence: "independent-release-approval" },
];
test("verified Testnet capability is available only to authorized audiences", () => {
  assert.equal(assertModuleAvailable(manifest, "corridors", "consumer", "testnet").module, "corridors");
  assert.throws(() => assertModuleAvailable(manifest, "corridors", "developer", "testnet"), ProductCapabilityError);
});
test("design-only or missing evidence fails closed", () => {
  assert.throws(() => assertModuleAvailable(manifest, "payments", "consumer", "testnet"), ProductCapabilityError);
  assert.throws(() => assertModuleAvailable([], "payments", "consumer", "testnet"), ProductCapabilityError);
});
test("Testnet approval never implies Mainnet approval", () => {
  assert.throws(() => assertModuleAvailable(manifest, "corridors", "consumer", "mainnet"), ProductCapabilityError);
});
test("duplicates fail closed", () => {
  assert.throws(() => assertModuleAvailable([...manifest, manifest[0]], "corridors", "consumer", "testnet"), ProductCapabilityError);
});
test("list limits modules to target environment", () => {
  assert.deepEqual(listAvailableModules(manifest, "consumer", "testnet"), ["corridors"]);
  assert.deepEqual(listAvailableModules(manifest, "developer", "mainnet"), ["webhooks"]);
});
