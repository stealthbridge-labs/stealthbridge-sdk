import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {prepareNextConsumer} from "../scripts/prepare-next-consumer.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const load=async p=>JSON.parse(await readFile(path.join(root,p),"utf8"));
test("SDK root npm ci never resolves fixture-only archive",async()=>{
 const [sdk,rootLock,consumer,fixtureLock,vercel]=await Promise.all([
  load("package.json"),load("package-lock.json"),
  load("tests/fixtures/next-app/package.json"),load("tests/fixtures/next-app/package-lock.json"),
  load("vercel.json")
 ]);
 assert.equal(rootLock.packages[""].name,sdk.name);
 assert.equal(rootLock.packages[""].version,sdk.version);
 assert.equal(rootLock.packages[""].dependencies?.["@stealthbridge/sdk"],undefined);
 assert.equal(rootLock.packages[""].devDependencies?.["@stealthbridge/sdk"],undefined);
 assert.equal(rootLock.packages["node_modules/@stealthbridge/sdk"],undefined);
 assert.equal(vercel.installCommand,"npm ci");
 assert.equal(vercel.buildCommand,"npm run build");
 assert.equal(consumer.dependencies["@stealthbridge/sdk"],"file:vendor/stealthbridge-sdk.tgz");
 assert.equal(fixtureLock.packages[""].dependencies["@stealthbridge/sdk"],consumer.dependencies["@stealthbridge/sdk"]);
});
test("consumer tarball is created only inside prepared isolated workspace",async()=>{
 const temporary=await mkdtemp(path.join(tmpdir(),"sdk-fixture-prep-"));
 try{
  const tarball=path.join(temporary,"built-sdk.tgz");
  const destination=path.join(temporary,"next-consumer");
  await writeFile(tarball,"synthetic archive only for fixture-path test");
  await prepareNextConsumer({
   source:path.join(root,"tests/fixtures/next-app"),destination,tarball,
   integrity:"sha512-fixture-test"
  });
  const lock=JSON.parse(await readFile(path.join(destination,"package-lock.json"),"utf8"));
  assert.equal(lock.packages["node_modules/@stealthbridge/sdk"].integrity,"sha512-fixture-test");
  assert.equal(await readFile(path.join(destination,"vendor/stealthbridge-sdk.tgz"),"utf8"),
   "synthetic archive only for fixture-path test");
  await assert.rejects(readFile(path.join(root,"vendor/stealthbridge-sdk.tgz")));
 }finally{await rm(temporary,{recursive:true,force:true});}
});
test("invalid integrity is rejected before fixture is copied",async()=>{
 await assert.rejects(prepareNextConsumer({
  source:path.join(root,"tests/fixtures/next-app"),destination:path.join(tmpdir(),"not-created-sdk-fixture"),
  tarball:"missing.tgz",integrity:"unsafe"
 }),/integrity/);
});
