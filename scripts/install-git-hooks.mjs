import { chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let hooksDir;
try {
  hooksDir = execSync("git rev-parse --git-path hooks", { cwd: root, encoding: "utf8" }).trim();
} catch {
  process.exit(0);
}

const destinationDir = resolve(root, hooksDir);
mkdirSync(destinationDir, { recursive: true });
const destination = resolve(destinationDir, "pre-commit");
copyFileSync(resolve(root, "scripts/pre-commit"), destination);
chmodSync(destination, 0o755);
