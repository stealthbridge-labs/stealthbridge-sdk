import {test} from "node:test";
import assert from "node:assert/strict";
import {canonicalStellarAccountAddress} from "../dist/index.js";

// Deterministically derived test bytes, NOT a funded account or private key.
const VALID="GAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7JZX";

test("accepts a checksum-valid classic G-address and normalizes copy-paste",()=>{
 assert.equal(canonicalStellarAccountAddress(VALID),VALID);
 assert.equal(canonicalStellarAccountAddress("  "+VALID.toLowerCase()+" "),VALID);
});

test("rejects broken checksum, wrong StrKey type and malformed addresses",()=>{
 for(const invalid of [
  VALID.slice(0,-1)+"A","C"+VALID.slice(1),
  "G"+"A".repeat(55),"M"+VALID.slice(1),
  VALID.slice(1),"",VALID+"X","G".repeat(56)
 ])assert.equal(canonicalStellarAccountAddress(invalid),null,invalid);
});

test("validating addresses is read-only and never implies wallet ownership",()=>{
 assert.equal("sign" in canonicalStellarAccountAddress,false);
 assert.equal(typeof canonicalStellarAccountAddress(VALID),"string");
});
