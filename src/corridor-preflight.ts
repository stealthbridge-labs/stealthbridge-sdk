import type {Corridor} from "./types.js";

/** Public network/database status and exact configured corridor metadata only. */
export interface CorridorPreflight {
 schema_version:1;
 network:"testnet";
 source:"live-corridor-metadata-preflight";
 observed_at_unix:number;
 corridor:Corridor;
 network_fresh:boolean;
 ledger_sequence:number|null;
 database_schema_ready:boolean;
 read_only_dependencies_ready:boolean;
 payment_execution_enabled:false;
 fee_quote_available:false;
 liquidity_verified:false;
 issuer_verified:false;
 privacy_verified:false;
 fiat_payouts_enabled:false;
}
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const keys=["schema_version","network","source","observed_at_unix","corridor",
 "network_fresh","ledger_sequence","database_schema_ready","read_only_dependencies_ready",
 "payment_execution_enabled","fee_quote_available","liquidity_verified",
 "issuer_verified","privacy_verified","fiat_payouts_enabled"].sort().join(",");
function corridorValid(v:unknown):v is Corridor {
 if(!plain(v)||Object.keys(v).sort().join(",")!==
  "asset_code,asset_issuer,destination_country,id,origin_country,privacy_rail")return false;
 return typeof v.id==="string"&&uuid.test(v.id)&&
  typeof v.origin_country==="string"&&/^[A-Z]{2}$/.test(v.origin_country)&&
  typeof v.destination_country==="string"&&/^[A-Z]{2}$/.test(v.destination_country)&&
  v.destination_country!==v.origin_country&&
  typeof v.asset_code==="string"&&/^[a-zA-Z0-9_:-]{1,64}$/.test(v.asset_code)&&
  (v.asset_issuer===null||(typeof v.asset_issuer==="string"&&v.asset_issuer.length>0&&v.asset_issuer.length<=128))&&
  (v.privacy_rail==="private-payments"||v.privacy_rail==="confidential-token");
}
/** Reject forged positive execution claims, replay, mismatched IDs and inconsistent RPC/schema state. */
export function validCorridorPreflight(
 value:unknown,expectedId?:string,now=Math.floor(Date.now()/1000)
):value is CorridorPreflight{
 if(!plain(value)||Object.keys(value).sort().join(",")!==keys||
  value.schema_version!==1||value.network!=="testnet"||
  value.source!=="live-corridor-metadata-preflight"||
  !Number.isSafeInteger(value.observed_at_unix)||typeof value.observed_at_unix!=="number"||
  value.observed_at_unix>now+30||value.observed_at_unix<now-120||
  !corridorValid(value.corridor)||
  (expectedId!==undefined&&value.corridor.id.toLowerCase()!==expectedId.toLowerCase())||
  typeof value.network_fresh!=="boolean"||
  typeof value.database_schema_ready!=="boolean"||
  value.read_only_dependencies_ready!==
    (value.network_fresh&&value.database_schema_ready)||
  ["payment_execution_enabled","fee_quote_available","liquidity_verified",
   "issuer_verified","privacy_verified","fiat_payouts_enabled"].some(k=>value[k]!==false))
  return false;
 return value.network_fresh?
  typeof value.ledger_sequence==="number"&&Number.isSafeInteger(value.ledger_sequence)&&value.ledger_sequence>0:
  value.ledger_sequence===null;
}
