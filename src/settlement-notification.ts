import {canTransitionSettlement, isSettlementState} from "./settlement.js";
import type {SettlementState} from "./types.js";

/** Metadata emitted by the Rust journal's transactional outbox. Internal
 * integrations must authenticate delivery and re-read tenant-scoped state.
 * This payload carries no payment instruction or execution authority. */
export interface SettlementNotification {
 schema_version:1;
 previous_state:SettlementState|null;
 next_state:SettlementState;
 /** Decimal PostgreSQL BIGINT, never a JavaScript floating-point number. */
 version:string;
 financial_execution_authorized:false;
}

/** Strict parser for the implemented outbox format. Unknown/private fields,
 * impossible transitions and precision-losing versions fail closed. */
export function parseSettlementNotification(value:unknown):SettlementNotification {
 const invalid=()=>{throw new TypeError("Invalid settlement notification");};
 if(!value||typeof value!=="object"||Array.isArray(value))return invalid();
 const v=value as Record<string,unknown>;
 const fields=["schema_version","previous_state","next_state","version","financial_execution_authorized"];
 if(Object.keys(v).length!==fields.length||!fields.every(k=>Object.hasOwn(v,k))||
   v.schema_version!==1||v.financial_execution_authorized!==false||
   !isSettlementState(v.next_state)||typeof v.version!=="string"||
   !/^(0|[1-9][0-9]{0,18})$/.test(v.version)||BigInt(v.version)>9_223_372_036_854_775_807n)
   return invalid();
 if(v.version==="0"){
  if(v.previous_state!==null||v.next_state!=="draft")return invalid();
 }else if(!isSettlementState(v.previous_state)||
   !canTransitionSettlement(v.previous_state,v.next_state))return invalid();
 return {schema_version:1,previous_state:v.previous_state as SettlementState|null,
  next_state:v.next_state,version:v.version,financial_execution_authorized:false};
}
