import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const generator=path.join(root,"scripts/generate-api-types.mjs");
function run(...args){
 const child=spawnSync(process.execPath,[generator,...args],{cwd:root,encoding:"utf8"});
 assert.equal(child.status,0,child.stdout+"\n"+child.stderr);
 return child.stdout;
}
test("regeneration is byte-for-byte deterministic and source-pinned",async()=>{
 const actual=await readFile(path.join(root,"src/generated/api-wire.ts"),"utf8");
 assert.equal(run("--stdout"),actual);
 assert.equal(run("--stdout"),actual);
 assert.match(run("--check"),/PASS: generated SDK types/);
 assert.match(actual,/Backend source commit: ba0e579084750be1ad7b001f98830a342fa51b5c/);
 assert.doesNotMatch(actual,/\bany\b/);
});
test("API 0.3 wire models preserve precise Testnet safety literals",async()=>{
 const actual=await readFile(path.join(root,"src/generated/api-wire.ts"),"utf8");
 assert.match(actual,/network: "testnet";/);
 assert.match(actual,/source: "stealthbridge-contracts\/deployments\/testnet\/manifest.json";/);
 assert.match(actual,/payment_execution_enabled: false;/);
 assert.match(actual,/payments: "disabled";/);
 assert.match(actual,/privacy_rail: "confidential-token" \| "private-payments";/);
 assert.match(actual,/asset_issuer\?: string \| null;/);
});
test("generated SDK types are actually consumed by public runtime client interfaces",async()=>{
 const types=await readFile(path.join(root,"src/types.ts"),"utf8");
 for(const name of ["NetworkStatus","Capabilities","Corridor","CorridorPage","Readiness","LedgerCheckpoint","TransactionObservation"]){
  assert.match(types,new RegExp("extends Api"+name+"\\b"));
 }
 const yaml=await readFile(path.join(root,"specs/backend-openapi.v0.3.yaml"),"utf8");
 assert.match(yaml,/^  version: 0\.3\.0$/m);
 assert.equal((yaml.match(/^components:$/gm)||[]).length,1);
});

test("pinned additive corridor preflight contract is GET-only with denied financial flags",async()=>{
 const yaml=await readFile(path.join(root,"specs/backend-openapi.v0.3.yaml"),"utf8");
 const preflight=yaml.split("  /v1/corridors/{id}/preflight:\n")[1]?.split("\n  /v1/")[0]??"";
 assert.match(preflight,/^    get:$/m);
 assert.doesNotMatch(preflight,/^    post:$/m);
 assert.match(preflight,/CorridorPreflight/);
 for(const key of ["payment_execution_enabled","fee_quote_available","liquidity_verified",
  "issuer_verified","privacy_verified","fiat_payouts_enabled"])
  assert.match(yaml,new RegExp(key+": \\{type: boolean, const: false\\}"));
});

test("pinned business corridor batch is explicit public GET-only metadata",async()=>{
 const yaml=await readFile(path.join(root,"specs/backend-openapi.v0.3.yaml"),"utf8");
 const route=yaml.split("  /v1/corridors/batch:\n")[1]?.split("\n  /v1/")[0]??"";
 assert.match(route,/^    get:$/m);
 assert.doesNotMatch(route,/^    post:$/m);
 assert.match(route,/CorridorBatch/);
 assert.match(yaml,/source: \{type: string, const: operator-corridor-batch\}/);
});

test("pinned batch preflight is GET-only and explicitly nonfinancial",async()=>{
 const yaml=await readFile(path.join(root,"specs/backend-openapi.v0.3.yaml"),"utf8");
 const route=yaml.split("  /v1/corridors/batch/preflight:\n")[1]?.split("\n  /v1/")[0]??"";
 assert.match(route,/^    get:$/m);
 assert.doesNotMatch(route,/^    post:$/m);
 assert.match(route,/CorridorBatchPreflight/);
 assert.match(yaml,/source: \{type: string, const: live-batch-metadata-preflight\}/);
});

test("pinned customer recipient projection is GET-only and never exposes code hashes",async()=>{
 const yaml=await readFile(path.join(root,"specs/backend-openapi.v0.3.yaml"),"utf8");
 const route=yaml.split("  /v1/wallet/recipient/{address}:\n")[1]?.split("\n  /v1/")[0]??"";
 assert.match(route,/^    get:$/m);
 assert.doesNotMatch(route,/^    post:$/m);
 assert.match(route,/RecipientPresence/);
 const schema=yaml.split("    RecipientPresence:\n")[1]?.split("\n    CorridorBatch:")[0]??"";
 assert.match(schema,/contract_instance_found/);
 assert.doesNotMatch(schema,/executable_wasm_hash/);
});

test("classic Testnet account existence projection is GET-only with no payout or private data",async()=>{
 const yaml=await readFile(path.join(root,"specs/backend-openapi.v0.3.yaml"),"utf8");
 const route=yaml.split("  /v1/wallet/classic-recipient/{address}:\n")[1]?.split("\n  /v1/")[0]??"";
 assert.match(route,/^    get:$/m);
 assert.doesNotMatch(route,/^    post:$/m);
 assert.match(route,/ClassicRecipientPresence/);
 const schema=yaml.split("    ClassicRecipientPresence:\n")[1]?.split("\n    RecipientPresence:")[0]??"";
 assert.match(schema,/classic_account_found/);
 assert.doesNotMatch(schema,/balances|signers|trustlines/);
});
