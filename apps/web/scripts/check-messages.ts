import { readFileSync } from "node:fs";

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
  const catalogPath = process.argv[2];
  if (!catalogPath) {
    console.error("usage: check-messages.ts <en.json>");
    process.exitCode = 1;
    return;
  }

  const input = await readStdin();
  const extracted: Extracted = JSON.parse(input);
  const en: Record<string, string> = JSON.parse(readFileSync(catalogPath, "utf8"));

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
    console.log(`check-messages: ${Object.keys(extracted).length} message ids in sync with ${catalogPath}.`);
    return;
  }

  if (missing.length) {
    console.error(`Missing from ${catalogPath} (${missing.length}):`);
    for (const id of missing) console.error(`  ${id}`);
  }
  if (mismatched.length) {
    console.error(`\ndefaultMessage differs from ${catalogPath} (${mismatched.length}):`);
    for (const id of mismatched) console.error(`  ${id}`);
  }
  process.exitCode = 1;
}

void main();
