import {test} from "node:test";
import assert from "node:assert/strict";
import {parseSettlementNotification} from "../dist/index.js";

const initial={schema_version:1,previous_state:null,next_state:"draft",version:"0",
 financial_execution_authorized:false};
test("accepts the Rust journal registration and transition format without loss of BIGINT precision",()=>{
 assert.deepEqual(parseSettlementNotification(initial),initial);
 const change={...initial,previous_state:"draft",next_state:"quoted",version:"9223372036854775807"};
 assert.deepEqual(parseSettlementNotification(change),change);
});
test("rejects untrusted authority, private fields, precision loss and impossible lifecycle events",()=>{
 for(const bad of [null,[],{},
  {...initial,financial_execution_authorized:true},
  {...initial,recipient:"private-address"},
  {...initial,version:0}, {...initial,version:"00"},
  {...initial,version:"-1"},{...initial,version:"9223372036854775808"},
  {...initial,version:"1"},{...initial,next_state:"quoted"},
  {...initial,previous_state:"draft"},
  {...initial,previous_state:"chain_finalized",next_state:"payout_completed",version:"4"},
  {...initial,previous_state:"payout_completed",next_state:"payout_pending",version:"5"},
 ])assert.throws(()=>parseSettlementNotification(bad),TypeError);
});
