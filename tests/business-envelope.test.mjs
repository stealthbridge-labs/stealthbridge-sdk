import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {canonicalBusinessEnvelope,digestBusinessEnvelope} from "../dist/index.js";
const item=()=>({
  organization:"a12ef783-d60b-4427-aa62-d2562acd4cef",
  actor:"GTESTMAKER000000001",
  operation:"invoice-review",
  reference:"INVOICE_001",
  requestKey:"synthetic_business_request_0001",
});
test("canonical draft digest matches Rust implementation and independent Node SHA256",async()=>{
  const canonical=canonicalBusinessEnvelope(item());
  const generated=await digestBusinessEnvelope(item());
  assert.equal(generated.canonical,canonical);
  assert.equal(generated.sha256,"ca2561966d4cc43cb2593fe2fb151ab31ba7d6aefd15363975d053a8b13d4b36");
  assert.equal(generated.sha256,createHash("sha256").update(canonical,"utf8").digest("hex"));
  assert.equal(generated.financialExecutionAuthorized,false);
  assert.equal(generated.network,"testnet");
});
test("canonical review rejects tampered network boundaries, control characters and unknown operations",()=>{
  const invalid=[
    {reference:"BAD\nnetwork:public"},
    {actor:"short"},
    {organization:"00000000-0000-0000-0000-000000000000"},
    {operation:"wire-transfer"},
    {requestKey:"short"},
    {organization:"A12ef783-d60b-4427-aa62-d2562acd4cef"},
  ];
  for(const mutation of invalid){
    assert.throws(()=>canonicalBusinessEnvelope({...item(),...mutation}),TypeError);
  }
});
test("changing organization, actor, operation, reference or key changes the digest",async()=>{
  const base=(await digestBusinessEnvelope(item())).sha256;
  const changes=[
    {organization:"b12ef783-d60b-4427-aa62-d2562acd4cef"},
    {actor:"GTESTMAKER000000002"},
    {operation:"treasury-policy"},
    {reference:"INVOICE_002"},
    {requestKey:"synthetic_business_request_0002"},
  ];
  for(const change of changes){
    assert.notEqual((await digestBusinessEnvelope({...item(),...change})).sha256,base);
  }
});
