import assert from "node:assert/strict";
import { realpath, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = await realpath(process.cwd());
const resolvedEntry = await realpath(fileURLToPath(import.meta.resolve("@stealthbridge/sdk")));
const installedPackageRoot = await realpath(
  path.join(fixtureRoot, "node_modules", "@stealthbridge", "sdk")
);

assert.equal(resolvedEntry, path.join(installedPackageRoot, "dist", "index.js"));
assert.ok(resolvedEntry.startsWith(`${installedPackageRoot}${path.sep}`));
assert.equal(resolvedEntry.includes(`${path.sep}src${path.sep}`), false);

const packageJson = JSON.parse(
  await readFile(path.join(installedPackageRoot, "package.json"), "utf8")
);
assert.equal(packageJson.name, "@stealthbridge/sdk");
assert.match(packageJson.version, /^0\.2\.0(?:-[0-9A-Za-z.-]+)?$/);
assert.equal(packageJson.exports["."].import, "./dist/index.js");
assert.equal(packageJson.dependencies, undefined);

const sdk = await import(resolvedEntry);
assert.match(sdk.SDK_VERSION, /^0\.2\.0(?:-[0-9A-Za-z.-]+)?$/);
const browserClient = sdk.createBrowserBridgeClient();
assert.ok(browserClient instanceof sdk.StealthBridgeClient);
assert.equal(typeof browserClient.capabilities, "function");
assert.equal(typeof browserClient.network, "function");
assert.equal(typeof browserClient.corridors, "function");
assert.equal(typeof browserClient.corridorsPage, "function");
assert.equal(typeof browserClient.contracts, "function");
assert.equal(typeof browserClient.observerHead, "function");
assert.equal(typeof browserClient.readiness, "function");
assert.equal(typeof browserClient.health, "function");
assert.equal(typeof browserClient.corridor, "function");
assert.equal(typeof browserClient.transaction, "function");
assert.equal("send" in browserClient, false);
assert.equal("sign" in browserClient, false);
assert.equal("execute" in browserClient, false);
assert.equal("withdraw" in browserClient, false);

console.log(`Next.js fixture resolved packed SDK entry: ${resolvedEntry}`);
