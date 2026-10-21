import {canonicalStellarAccountAddress} from "./wallet.js";
export type ProfileUseCase="personal"|"business"|"both";
export interface ProfilePreferences{
 display_name:string;
 use_case:ProfileUseCase;
 residence_country:string|null;
}
export interface CustomerProfile extends ProfilePreferences{
 updated_at_unix:number;
}
export interface AccountProfileEnvelope{
 schema_version:1;
 network:"testnet";
 source:"neon-customer-profiles";
 account_address:string;
 profile:CustomerProfile|null;
 payment_execution_enabled:false;
 organization_payment_authorized:false;
}
const exact=(v:Record<string,unknown>,keys:string[])=>
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function validProfilePreferences(data:unknown):data is ProfilePreferences{
 if(!data||typeof data!=="object"||Array.isArray(data))return false;
 const v=data as Record<string,unknown>;
 return exact(v,["display_name","use_case","residence_country"])&&
  typeof v.display_name==="string"&&[...v.display_name].length>=1&&
  [...v.display_name].length<=80&&v.display_name.trim()===v.display_name&&
  !/[<>\u0000-\u001f\u007f]/.test(v.display_name)&&
  ["personal","business","both"].includes(String(v.use_case))&&
  (v.residence_country===null||typeof v.residence_country==="string"&&
   /^[A-Z]{2}$/.test(v.residence_country));
}
export function validAccountProfileEnvelope(data:unknown,address:string):data is AccountProfileEnvelope{
 const expected=canonicalStellarAccountAddress(address);
 if(!expected||!data||typeof data!=="object"||Array.isArray(data))return false;
 const v=data as Record<string,unknown>;
 if(!exact(v,["schema_version","network","source","account_address","profile",
  "payment_execution_enabled","organization_payment_authorized"])||
  v.schema_version!==1||v.network!=="testnet"||v.source!=="neon-customer-profiles"||
  v.account_address!==expected||v.payment_execution_enabled!==false||
  v.organization_payment_authorized!==false)return false;
 if(v.profile===null)return true;
 if(!v.profile||typeof v.profile!=="object"||Array.isArray(v.profile))return false;
 const profile=v.profile as Record<string,unknown>;
 const {updated_at_unix,...input}=profile;
 return validProfilePreferences(input)&&Object.keys(profile).length===4&&
  Number.isSafeInteger(updated_at_unix)&&Number(updated_at_unix)>0;
}
/** Cookie-based BFF access; address binds the expected response, not a
 * client-asserted identity. Writes must never sign or submit payment XDR.
 */
export async function readCustomerProfile(address:string,options:{fetchImpl?:typeof fetch,signal?:AbortSignal}={}):Promise<AccountProfileEnvelope>{
 if(!canonicalStellarAccountAddress(address))throw new TypeError("Invalid account");
 const fetcher=options.fetchImpl??fetch;
 const response=await fetcher("/api/account/profile",{
  method:"GET",credentials:"same-origin",cache:"no-store",
  ...(options.signal?{signal:options.signal}:{})
 });
 if(!response.ok)throw new Error("Customer profile unavailable");
 const data:unknown=await response.json();
 if(!validAccountProfileEnvelope(data,address))throw new Error("Invalid customer profile response");
 return data;
}
export async function saveCustomerPreferences(address:string,prefs:ProfilePreferences,
 options:{fetchImpl?:typeof fetch}={}):Promise<AccountProfileEnvelope>{
 if(!canonicalStellarAccountAddress(address)||!validProfilePreferences(prefs))
  throw new TypeError("Invalid account preferences");
 const fetcher=options.fetchImpl??fetch;
 const response=await fetcher("/api/account/profile",{
  method:"PATCH",credentials:"same-origin",cache:"no-store",
  headers:{"content-type":"application/json"},body:JSON.stringify(prefs)
 });
 if(!response.ok)throw new Error("Customer preferences not saved");
 const data:unknown=await response.json();
 if(!validAccountProfileEnvelope(data,address)||data.profile===null)
  throw new Error("Unverified profile update");
 return data;
}
