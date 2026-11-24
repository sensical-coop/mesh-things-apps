/**
 * Copies the API's OpenAPI schema into docs/openapi.json, the input of Orval.
 *
 * The schema is served live by the registry role (`GET /schema`), so the contract is never
 * edited here. `OPENAPI_URL` points at another API, e.g. a local stack at `http://localhost`.
 * `OPENAPI_FILE` reads a schema file instead, such as the backend's committed snapshot
 * (`server/mesh_things/src/mesh_things/client/openapi.json`, which its CI keeps equal to `/schema`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_URL = "https://api.sensical.es";
const OUTPUT = fileURLToPath(new URL("../../../docs/openapi.json", import.meta.url));

async function load(): Promise<{ schema: unknown; from: string }> {
  const file = process.env.OPENAPI_FILE;
  if (file) {
    // pnpm runs this from packages/contracts; resolve against where the command was typed.
    const from = resolve(process.env.INIT_CWD ?? process.cwd(), file);
    return { schema: JSON.parse(readFileSync(from, "utf8")), from };
  }
  const url = new URL("/schema?format=json", process.env.OPENAPI_URL || DEFAULT_URL);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return { schema: await response.json(), from: String(url) };
}

async function main() {
  const { schema, from } = await load();
  if (typeof schema !== "object" || schema === null || !("openapi" in schema) || !("paths" in schema)) {
    throw new Error(`${from} is not an OpenAPI document`);
  }
  // `servers` is the serving API's own base URL; the backend's snapshot drops it too, so every source writes the same file.
  Reflect.deleteProperty(schema, "servers");
  writeFileSync(OUTPUT, `${JSON.stringify(schema, null, 2)}\n`);
  console.info(`Wrote ${OUTPUT} from ${from}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
