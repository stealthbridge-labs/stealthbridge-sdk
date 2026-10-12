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
 assert.match(actual,/Backend source commit: 91ffaf7fd3ee5b4c218874e21cd7cd8b94df106b/);
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
