#!/usr/bin/env node
/** Explicit, non-publishing package-consumer fixture preparation.
 * Run only AFTER the SDK has been packed into an archive.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export async function prepareNextConsumer({ source, destination, tarball, integrity }) {
  if (!integrity?.startsWith("sha512-")) throw new Error("Verified npm integrity is required");
  const manifest = JSON.parse(await readFile(path.join(source, "package.json"), "utf8"));
  if (manifest.dependencies?.["@stealthbridge/sdk"] !== "file:vendor/stealthbridge-sdk.tgz")
    throw new Error("Fixture must explicitly consume the prepared local archive");
  await cp(source, destination, { recursive: true });
  const vendor = path.join(destination, "vendor");
  await mkdir(vendor, { recursive: true });
  await cp(tarball, path.join(vendor, "stealthbridge-sdk.tgz"));
  const lockPath = path.join(destination, "package-lock.json");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  if (lock.packages?.[""]?.name !== "stealthbridge-next-app-consumer"
      || lock.packages?.[""]?.dependencies?.["@stealthbridge/sdk"] !== manifest.dependencies["@stealthbridge/sdk"]
      || !lock.packages?.["node_modules/@stealthbridge/sdk"])
    throw new Error("Fixture lockfile must resolve the SDK archive, not another package root");
  lock.packages["node_modules/@stealthbridge/sdk"].integrity = integrity;
  if (lock.dependencies?.["@stealthbridge/sdk"]) lock.dependencies["@stealthbridge/sdk"].integrity = integrity;
  await writeFile(lockPath, JSON.stringify(lock, null, 2) + "\n");
}
const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  const [source, destination, tarball, integrity] = process.argv.slice(2);
  if (![source, destination, tarball, integrity].every(Boolean))
    throw new Error("Usage: node scripts/prepare-next-consumer.mjs <fixture-root> <output-dir> <built-tarball> <sha512-integrity>");
  await prepareNextConsumer({source,destination,tarball,integrity});
  console.log("Prepared isolated Next.js consumer; run npm ci inside the output directory.");
}
