/**
 * Copies the API's OpenAPI schema into docs/openapi.json, the input of Orval.
 *
 * The schema is served live by the registry role (`GET /schema`), so the contract is never
 * edited here. `OPENAPI_URL` points at another API, e.g. a local stack at `http://localhost`.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "https://api.sensical.es";
const OUTPUT = fileURLToPath(new URL("../../../docs/openapi.json", import.meta.url));

async function main() {
  const url = new URL("/schema?format=json", process.env.OPENAPI_URL || DEFAULT_URL);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  const schema: unknown = await response.json();
  if (typeof schema !== "object" || schema === null || !("openapi" in schema) || !("paths" in schema)) {
    throw new Error(`${url} is not an OpenAPI document`);
  }
  writeFileSync(OUTPUT, `${JSON.stringify(schema, null, 2)}\n`);
  console.info(`Wrote ${OUTPUT} from ${url}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
