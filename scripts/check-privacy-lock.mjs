// Cross-repository check: the SDK's privacy rail pins must equal the canonical
// lock in stealthbridge-contracts (integrations/privacy-dependency-lock.v2.json).
// Network read of a public GitHub file; never runs in `npm test`.
import { describePrivacyRailArchitecture } from "../dist/privacy-rails.js";
import { PERSONAL_SHIELDED_POOL, BUSINESS_CONFIDENTIAL_TOKEN } from "../dist/privacy-rails-v2.js";

const ref = process.env.PRIVACY_LOCK_REF ?? "main";
const url = `https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-contracts/${ref}/integrations/privacy-dependency-lock.v2.json`;
let lock;
if (process.env.PRIVACY_LOCK_FILE) {
  const { readFile } = await import("node:fs/promises");
  lock = JSON.parse(await readFile(process.env.PRIVACY_LOCK_FILE, "utf8"));
} else {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`could not read the canonical privacy lock (${res.status})`);
  lock = await res.json();
}
if (lock.schemaVersion !== 2 || lock.canonical !== true) throw new Error("not the canonical v2 lock");

const failures = [];
const personal = describePrivacyRailArchitecture("private-payments");
const lockPersonal = lock.rails["personal-shielded-pool"];
if (personal.pinnedRef !== lockPersonal.upstream.deploymentCommit) {
  failures.push(`private-payments pinnedRef ${personal.pinnedRef} != lock deploymentCommit ${lockPersonal.upstream.deploymentCommit}`);
}
const business = describePrivacyRailArchitecture("confidential-token");
const lockBusiness = lock.rails["business-confidential-token"];
if (!business.pinnedRef?.includes(lockBusiness.upstream.commit) || !business.pinnedRef.startsWith(lockBusiness.upstream.tag)) {
  failures.push(`confidential-token pinnedRef ${business.pinnedRef} != lock ${lockBusiness.upstream.tag} (${lockBusiness.upstream.commit})`);
}
for (const [rail, spec, l] of [["private-payments", personal, lockPersonal], ["confidential-token", business, lockBusiness]]) {
  if (spec.productionReady !== false || spec.executionEnabled !== false) failures.push(`${rail}: SDK claims readiness`);
  if (l.verdict !== "NO_GO" && (spec.blockers.length > 0)) failures.push(`${rail}: lock says ${l.verdict} but SDK lists blockers`);
}
// The typed two-rail module must carry exactly the locked pools, code and verdicts.
const lockedPools = lockPersonal.testnetDeployment.contracts.filter((c) => c.role === "pool");
const sdkPools = PERSONAL_SHIELDED_POOL.pools;
if (sdkPools.length !== lockedPools.length) failures.push(`personal pools: SDK ${sdkPools.length} vs lock ${lockedPools.length}`);
for (const c of lockedPools) {
  const p = sdkPools.find((x) => x.id === c.id);
  if (!p) failures.push(`personal pool ${c.id} missing from the SDK`);
  else if (p.wasmSha256 !== c.wasmSha256) failures.push(`personal pool ${c.id} wasm ${p.wasmSha256} != lock ${c.wasmSha256}`);
}
if (PERSONAL_SHIELDED_POOL.deploymentCommit !== lockPersonal.upstream.deploymentCommit) failures.push("v2 personal deploymentCommit drift");
if (PERSONAL_SHIELDED_POOL.verdict !== lockPersonal.verdict) failures.push("v2 personal verdict drift");
if (BUSINESS_CONFIDENTIAL_TOKEN.verdict !== lockBusiness.verdict) failures.push("v2 business verdict drift");
if (!BUSINESS_CONFIDENTIAL_TOKEN.release.includes(lockBusiness.upstream.commit)) failures.push("v2 business release drift");

if (failures.length) {
  console.error("Privacy pin drift between the SDK and the canonical lock:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log(`SDK privacy pins match the canonical lock (${ref}): Personal ${personal.pinnedRef.slice(0, 12)}, Business ${lockBusiness.upstream.tag}`);
