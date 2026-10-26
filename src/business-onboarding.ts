import {canonicalStellarAccountAddress} from "./wallet.js";

export type PendingBusinessApplication={
 id:string;
 display_name:string;
 status:"pending";
 role:"owner";
};
export interface BusinessOnboardingEnvelope{
 schema_version:1;
 network:"testnet";
 source:"neon-pending-business-applications";
 account_address:string;
 applications:PendingBusinessApplication[];
 has_more:boolean;
 organization_verified:false;
 payment_execution_enabled:false;
 organization_payment_authorized:false;
}
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function exact(obj:Record<string,unknown>,keys:string[]):boolean{
 return Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
}
export function validBusinessApplicationName(input:unknown):input is string{
 return typeof input==="string"&&input.length>0&&input.length<=120&&
  input.trim()===input&&!/[<>\u0000-\u001f\u007f]/.test(input);
}
/** Pending applications are not approved companies, memberships suitable
 * for financial authorization, regulated identities, or payment accounts.
 */
export function validBusinessOnboarding(
 value:unknown,expectedAddress:string
):value is BusinessOnboardingEnvelope{
 const account=canonicalStellarAccountAddress(expectedAddress);
 if(!account||!value||typeof value!=="object"||Array.isArray(value))return false;
 const data=value as Record<string,unknown>;
 if(!exact(data,["schema_version","network","source","account_address",
  "applications","has_more","organization_verified","payment_execution_enabled",
  "organization_payment_authorized"])||
  data.schema_version!==1||data.network!=="testnet"||
  data.source!=="neon-pending-business-applications"||
  data.account_address!==account||data.organization_verified!==false||
  data.payment_execution_enabled!==false||data.organization_payment_authorized!==false||
  typeof data.has_more!=="boolean"||!Array.isArray(data.applications)||
  data.applications.length>10)return false;
 const ids=new Set<string>();
 for(const value of data.applications){
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const item=value as Record<string,unknown>;
  if(!exact(item,["id","display_name","status","role"])||
   typeof item.id!=="string"||!UUID.test(item.id)||ids.has(item.id.toLowerCase())||
   !validBusinessApplicationName(item.display_name)||
   item.status!=="pending"||item.role!=="owner")return false;
  ids.add(item.id.toLowerCase());
 }
 return true;
}
export async function listBusinessApplications(
 address:string,options:{fetchImpl?:typeof fetch,signal?:AbortSignal}={}
):Promise<BusinessOnboardingEnvelope>{
 if(!canonicalStellarAccountAddress(address))throw new TypeError("Invalid Stellar account.");
 const response=await (options.fetchImpl??fetch)("/api/account/business-onboarding",{
  method:"GET",credentials:"same-origin",cache:"no-store",
  ...(options.signal?{signal:options.signal}:{}),
 });
 if(!response.ok)throw Error("Business applications are unavailable.");
 const value:unknown=await response.json();
 if(!validBusinessOnboarding(value,address))throw Error("Unverified application data.");
 return value;
}
export async function createBusinessApplication(
 address:string,displayName:string,options:{fetchImpl?:typeof fetch}={}
):Promise<BusinessOnboardingEnvelope>{
 if(!canonicalStellarAccountAddress(address)||!validBusinessApplicationName(displayName))
  throw new TypeError("Invalid business application.");
 const response=await (options.fetchImpl??fetch)("/api/account/business-onboarding",{
  method:"POST",cache:"no-store",credentials:"same-origin",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({display_name:displayName})
 });
 if(!response.ok)throw Error("Business application was not registered.");
 const value:unknown=await response.json();
 if(!validBusinessOnboarding(value,address)||value.applications.length!==1)
  throw Error("The registered business application could not be verified.");
 return value;
}

/** Amend an unreviewed business application through the authenticated
 * same-origin server. The backend compares the previous name atomically;
 * this client never claims the caller is a verified organization.
 */
export async function amendBusinessApplication(
 address:string,organizationId:string,expectedName:string,newName:string,
 options:{fetchImpl?:typeof fetch}={}
):Promise<BusinessOnboardingEnvelope>{
 if(!canonicalStellarAccountAddress(address)||!UUID.test(organizationId)||
    !validBusinessApplicationName(expectedName)||!validBusinessApplicationName(newName)||
    newName===expectedName)throw new TypeError("Invalid business amendment.");
 const response=await (options.fetchImpl??fetch)("/api/account/business-onboarding",{
  method:"PATCH",cache:"no-store",credentials:"same-origin",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({organization_id:organizationId,
   expected_display_name:expectedName,display_name:newName})
 });
 if(!response.ok)throw Error(response.status===409?
  "Business application changed or is protected; refresh it before retrying.":
  response.status===404?"Application no longer available to this account.":
  "Business application correction is unavailable.");
 const data:unknown=await response.json();
 if(!validBusinessOnboarding(data,address)||data.applications.length!==1||
  data.applications[0].id.toLowerCase()!==organizationId.toLowerCase()||
  data.applications[0].display_name!==newName)
  throw Error("The updated application could not be verified.");
 return data;
}
/** Remove only a pending, unused application after deliberate confirmation.
 * Financial, reviewed and active organizations cannot be removed.
 */
export async function withdrawBusinessApplication(
 address:string,organizationId:string,confirmationName:string,
 options:{fetchImpl?:typeof fetch}={}
):Promise<BusinessOnboardingEnvelope>{
 if(!canonicalStellarAccountAddress(address)||!UUID.test(organizationId)||
  !validBusinessApplicationName(confirmationName))throw new TypeError("Invalid withdrawal.");
 const response=await (options.fetchImpl??fetch)("/api/account/business-onboarding",{
  method:"DELETE",cache:"no-store",credentials:"same-origin",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({organization_id:organizationId,confirm_display_name:confirmationName})
 });
 if(!response.ok)throw Error(response.status===409?
  "This application has changed or contains protected records; it cannot be withdrawn.":
  response.status===404?"Application no longer available to this account.":
  "Business application withdrawal is unavailable.");
 const data:unknown=await response.json();
 if(!validBusinessOnboarding(data,address)||data.applications.length!==0)
  throw Error("The withdrawal receipt could not be verified.");
 return data;
}
