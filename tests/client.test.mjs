import { test } from "node:test";
import assert from "node:assert/strict";
import { StealthBridgeClient, ApiError, createBrowserBridgeClient, createSameOriginBridgeClient } from "../dist/index.js";

const HASH = "0123456789abcdef".repeat(4);
test("rejects remote plaintext HTTP and non-testnet", () => {
  assert.throws(() => new StealthBridgeClient({apiBaseUrl:"http://api.example",network:"testnet"}),/HTTPS/);
  assert.throws(() => new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"public"}),/testnet/);
});
test("reads only a status projection for supplied transaction hash", async () => {
  const calls=[];
  const api=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet",
    fetchImpl:async (url,options)=>{
      calls.push([url,options.method]);
      return new Response(JSON.stringify({hash:HASH,status:"SUCCESS",ledger:123,latest_ledger:124,
        closed_at_unix:"1760000000",source:"stellar-rpc"}),{status:200,headers:{"content-type":"application/json"}});
    }});
  const result=await api.transaction(HASH.toUpperCase());
  assert.equal(result.status,"SUCCESS");
  assert.deepEqual(calls, [["https://api.example/v1/transactions/"+HASH,"GET"]]);
});
test("rejects malformed transaction hash without a network request", async () => {
  const api=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet",
    fetchImpl:async()=>{throw new Error("MUST NOT FETCH");}});
  assert.throws(()=>api.transaction("not a hash"),/64 hexadecimal/);
});
test("surfaces missing transaction as 404, not a fabricated pending payment", async () => {
  const api=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet",
    fetchImpl:async()=>new Response("",{status:404})});
  await assert.rejects(api.transaction(HASH),e=>e instanceof ApiError && e.status===404);
});
test("circuits remain strictly read-only", () => {
  const api=new StealthBridgeClient({apiBaseUrl:"https://api.example",network:"testnet"});
  assert.equal("send" in api,false);
  assert.equal("sign" in api,false);
});

test("createBrowserBridgeClient targets same-origin /api/bridge with abort support", async () => {
  const calls = [];
  const client = createBrowserBridgeClient({
    fetchImpl: async (url, options) => {
      calls.push([url, options.method]);
      return new Response(JSON.stringify({
        network: "testnet",
        passphrase: "Test SDF Network ; September 2015",
        protocol_version: 23,
        ledger_sequence: 123,
        ledger_closed_at_unix: "1760000000",
        ledger_hash: "ab".repeat(32),
        source: "stellar-rpc"
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.ok(client instanceof StealthBridgeClient);
  const status = await client.network();
  assert.equal(status.network, "testnet");
  assert.deepEqual(calls, [["/api/bridge/v1/network", "GET"]]);
  assert.equal("send" in client, false);
  assert.equal("sign" in client, false);
});

test("createBrowserBridgeClient propagates caller abort signal", async () => {
  const controller = new AbortController();
  const client = createBrowserBridgeClient({
    fetchImpl: async (url, options) => {
      options.signal.throwIfAborted();
      return new Response(JSON.stringify({ service: "stealthbridge", status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  controller.abort(new Error("caller cancelled request"));
  await assert.rejects(
    client.health({ signal: controller.signal }),
    /caller cancelled request/
  );
});

test("createBrowserBridgeClient rejects malformed base paths", () => {
  assert.throws(() => createBrowserBridgeClient({ basePath: "http://external.api" }), /Same-origin API base path/);
  assert.throws(() => createBrowserBridgeClient({ basePath: "//relative-protocol" }), /Same-origin API base path/);
  assert.throws(() => createBrowserBridgeClient({ basePath: "/api/bridge?token=secret" }), /Same-origin API base path/);
});

