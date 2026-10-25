/**
 * Copies the API's OpenAPI snapshot into docs/openapi.json, the input of openapi-ts.
 *
 * The snapshot is generated and committed by the API repo, so the contract is never
 * edited here. `OPENAPI_REF` picks the API branch, tag or commit to copy from.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = "sensical-coop/mesh-things";
// Until the mesh-things package lands on main, the snapshot only exists on this branch.
const DEFAULT_REF = "feat/mesh-things-package";
const SNAPSHOT_PATH = "server/mesh_things/src/mesh_things/client/openapi.json";
const OUTPUT = fileURLToPath(new URL("../../../docs/openapi.json", import.meta.url));

async function main() {
  const ref = process.env.OPENAPI_REF || DEFAULT_REF;
  const url = `https://raw.githubusercontent.com/${REPO}/${ref}/${SNAPSHOT_PATH}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  const schema: unknown = await response.json();
  if (typeof schema !== "object" || schema === null || !("openapi" in schema) || !("paths" in schema)) {
    throw new Error(`${url} is not an OpenAPI document`);
  }
  writeFileSync(OUTPUT, `${JSON.stringify(schema, null, 2)}\n`);
  console.info(`Wrote ${OUTPUT} from ${REPO}@${ref}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
