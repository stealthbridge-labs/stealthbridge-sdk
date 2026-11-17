#!/usr/bin/env node
/** Compare only the new reviewed contract; never copy unrelated backend changes. */
import {readFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";

export function smartAccountKitContract(yaml){
 const lines=yaml.replace(/\r\n/g,"\n").split("\n");
 return [
  ["  /v1/wallet/smart-account-kit:",/^  \S/],
  ["    SmartAccountKitEntry:",/^    \S/],
  ["    SmartAccountKitObservation:",/^    \S/],
 ].map(([heading,next])=>{
  const indexes=lines.flatMap((line,index)=>line===heading?[index]:[]);
  if(indexes.length!==1)throw new Error(`Missing or duplicate contract block: ${heading.trim()}`);
  let end=indexes[0]+1;
  while(end<lines.length&&!next.test(lines[end]))end++;
  return lines.slice(indexes[0],end).join("\n").trimEnd();
 }).join("\n");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const backendPath=process.argv[2];
 if(!backendPath)throw new Error("Usage: node scripts/check-smart-account-kit-schema.mjs <backend-api/openapi.yaml>");
 const [pinned,backend]=await Promise.all([
  readFile(new URL("../specs/backend-openapi.v0.3.yaml",import.meta.url),"utf8"),readFile(backendPath,"utf8"),
 ]);
 if(smartAccountKitContract(pinned)!==smartAccountKitContract(backend))
  throw new Error("Smart Account Kit OpenAPI differs: review and copy only the endpoint and its two schemas, then run npm run generate:api-types");
 console.log("PASS: exact Smart Account Kit endpoint and schema parity");
}
