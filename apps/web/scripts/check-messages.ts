/**
 * Checks every message id/defaultMessage against src/locales/en.json
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Extracted = Record<string, { defaultMessage: string }>;

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const input = await readStdin();
  const extracted: Extracted = JSON.parse(input);

  const enPath = fileURLToPath(new URL("../src/locales/en.json", import.meta.url));
  const en: Record<string, string> = JSON.parse(readFileSync(enPath, "utf8"));

  const missing: string[] = [];
  const mismatched: string[] = [];

  for (const [id, { defaultMessage }] of Object.entries(extracted)) {
    if (!(id in en)) {
      missing.push(id);
      continue;
    }
    if (en[id] !== defaultMessage) {
      mismatched.push(id);
    }
  }

  if (missing.length === 0 && mismatched.length === 0) {
    console.log(`check-messages: ${Object.keys(extracted).length} message ids in sync with en.json.`);
    return;
  }

  if (missing.length) {
    console.error(`Missing from src/locales/en.json (${missing.length}):`);
    for (const id of missing) console.error(`  ${id}`);
  }
  if (mismatched.length) {
    console.error(`\ndefaultMessage differs from src/locales/en.json (${mismatched.length}):`);
    for (const id of mismatched) console.error(`  ${id}`);
  }
  process.exitCode = 1;
}

void main();
