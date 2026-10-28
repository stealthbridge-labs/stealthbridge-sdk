#!/usr/bin/env node
/**
 * Deterministic TypeScript wire model generation from a pinned reviewed
 * backend OpenAPI 3.1 schema. Supports only the deliberately narrow schema
 * vocabulary used by this read-only API and fails on unsupported types.
 * Never downloads upstream specs or authorizes payments.
 */
import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const schemaPath=path.join(root,"specs/backend-openapi.v0.3.yaml");
const outputPath=path.join(root,"src/generated/api-wire.ts");
const PINNED_BACKEND_COMMIT="82ea6953468b7acd2139ba2e0d026bfab5797791";
const NAMES=["Capabilities","ContractDiscovery","Corridor","CorridorPage",
 "ErrorDetail","ErrorEnvelope","LedgerCheckpoint","NetworkStatus","Readiness","TransactionObservation"];

function wireType(lines) {
 const description=lines.join(" ");
 const typeIs=(name)=>new RegExp("\\btype: "+name+"(?:[,}\\s]|$)").test(description);
 const reference=description.match(/\$ref:\s*["']?#\/components\/schemas\/([A-Za-z0-9_]+)/);
 if(typeIs("array")) {
  if(!reference)throw new Error("Array without reviewed item $ref: "+description);
  return "Api"+reference[1]+"[]";
 }
 if(reference)return "Api"+reference[1];
 const array=description.match(/type:\s*\[\s*string\s*,\s*["']?null["']?\s*\]/);
 if(array)return "string | null";
 const enumeration=description.match(/enum:\s*\[([^\]]+)\]/);
 if(enumeration)return enumeration[1].split(",").map(x=>JSON.stringify(x.trim().replace(/^["']|["']$/g,""))).join(" | ");
 const literal=description.match(/const:\s*([^,}\s]+)/);
 if(literal)return /^(?:true|false)$/.test(literal[1])?literal[1]:JSON.stringify(literal[1]);
 if(typeIs("integer")||typeIs("number"))return "number";
 if(typeIs("boolean"))return "boolean";
 if(typeIs("string"))return "string";
 if(typeIs("object"))return "Record<string, unknown>";
 throw new Error("Unsupported OpenAPI field description: "+description.slice(0,160));
}
function generate(yaml) {
 if(!/^openapi: 3\.1\.0$/m.test(yaml)||!/^  version: 0\.3\.0$/m.test(yaml))
  throw new Error("Pinned API version changed; update schema and compatibility review");
 if((yaml.match(/^components:$/gm)||[]).length!==1 || (yaml.match(/^  schemas:$/gm)||[]).length!==1)
  throw new Error("Duplicate/missing OpenAPI schema blocks");
 const body=yaml.split("\n  schemas:\n")[1];
 if(!body)throw new Error("Missing schemas");
 const lines=body.split("\n");
 const chunks=new Map();
 let active=null;
 for(const line of lines){
  const heading=line.match(/^    ([A-Za-z][A-Za-z0-9]*):\s*$/);
  if(heading){active=heading[1];if(chunks.has(active))throw new Error("Duplicate schema "+active);chunks.set(active,[]);}
  else if(active)chunks.get(active).push(line);
 }
 if(NAMES.some(name=>!chunks.has(name)))throw new Error("Backend removed reviewed schemas");
 const result=[
  "/** AUTO-GENERATED from specs/backend-openapi.v0.3.yaml.",
  " * Backend source commit: "+PINNED_BACKEND_COMMIT,
  " * Run: npm run generate:api-types; edit the pinned schema only after review.",
  " * Types alone are not runtime validators or permission to move money.",
  " */"
 ];
 for(const name of NAMES){
  const block=chunks.get(name);
  const requiredLine=block.find(s=>/^      required: \[/.test(s));
  if(!requiredLine)throw new Error("Schema missing required inventory: "+name);
  const required=new Set(requiredLine.match(/\[([^\]]*)\]/)[1].split(",").map(s=>s.trim()));
  const props=new Map();
  let property=null;
  for(const line of block){
   const match=line.match(/^        ([a-z][a-z0-9_]*):(?:\s+(.*))?$/);
   if(match){property=match[1];if(props.has(property))throw new Error("Duplicate property "+name+"."+property);props.set(property,[match[2]||""]);}
   else if(property)props.get(property).push(line);
  }
  if(!props.size||[...required].some(key=>!props.has(key)))
   throw new Error("Schema properties/required keys mismatch: "+name);
  result.push("export interface Api"+name+" {");
  for(const [key,descriptor] of props){
   const ts=wireType(descriptor);
   result.push("  "+key+(required.has(key)?"":"?")+": "+ts+";");
  }
  result.push("}","");
 }
 return result.join("\n")+"\n";
}
const schema=await readFile(schemaPath,"utf8");
const output=generate(schema);
if(process.argv.includes("--stdout"))process.stdout.write(output);
else if(process.argv.includes("--check")){
 const current=await readFile(outputPath,"utf8").catch(()=>null);
 if(current!==output)throw new Error("Generated SDK types drifted from pinned backend OpenAPI. Run npm run generate:api-types.");
 console.log("PASS: generated SDK types match pinned read-only OpenAPI v0.3");
}else {
 await writeFile(outputPath,output);
 console.log("Generated "+NAMES.length+" pinned TypeScript API schemas");
}
