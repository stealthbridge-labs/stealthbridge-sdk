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


test("capabilities fail closed when upstream advertises unverified money movement", async () => {
  const flags = {
    payments_enabled: false,
    confidential_token_verified: false,
    private_payments_verified: false,
    fiat_payouts_enabled: false,
  };
  const client = new StealthBridgeClient({
    apiBaseUrl: "https://api.example",
    network: "testnet",
    fetchImpl: async () => new Response(JSON.stringify(flags), {
      status: 200, headers: { "content-type": "application/json" },
    }),
  });
  assert.deepEqual(await client.capabilities(), flags);
  for (const key of Object.keys(flags)) {
    flags[key] = true;
    await assert.rejects(client.capabilities(), error => error instanceof ApiError && error.status === 502);
    flags[key] = false;
  }
});

test("liveNetwork rejects stale and future-dated ledgers without claiming payments work", async () => {
  const now = Math.floor(Date.now()/1000);
  const observation = {
    network: "testnet", passphrase: "Test SDF Network ; September 2015",
    protocol_version: 23, ledger_sequence: 123, ledger_hash: "ab".repeat(32),
    ledger_closed_at_unix: String(now - 5), source: "stellar-rpc",
  };
  const api = new StealthBridgeClient({
    apiBaseUrl: "https://api.example", network: "testnet",
    fetchImpl: async () => new Response(JSON.stringify(observation), {
      status: 200, headers: { "content-type": "application/json" },
    }),
  });
  assert.equal((await api.liveNetwork()).ledger_sequence, 123);
  observation.ledger_closed_at_unix = String(now - 400);
  await assert.rejects(api.liveNetwork(), e => e instanceof ApiError &&
    e.status === 503 && e.code === "STALE_LEDGER");
  observation.ledger_closed_at_unix = String(now + 90);
  await assert.rejects(api.liveNetwork(), e => e instanceof ApiError &&
    e.status === 503 && e.code === "STALE_LEDGER");
  assert.rejects(api.liveNetwork({maxAgeSeconds:0}), /maxAgeSeconds/);
});
