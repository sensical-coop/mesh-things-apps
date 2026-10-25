import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marker = "mesh-things-apps pre-commit";

function git(args) {
  return execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
}

function inside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

let hooksDir;
let gitCommon;
try {
  hooksDir = git("rev-parse --git-path hooks");
  const common = git("rev-parse --git-common-dir");
  gitCommon = isAbsolute(common) ? common : resolve(root, common);
} catch {
  process.exit(0);
}

const destinationDir = isAbsolute(hooksDir) ? hooksDir : resolve(root, hooksDir);

if (!inside(root, destinationDir) && !inside(gitCommon, destinationDir)) {
  console.warn("Skipping pre-commit install: Git hooks path is outside this repository.");
  process.exit(0);
}

mkdirSync(destinationDir, { recursive: true });
const destination = resolve(destinationDir, "pre-commit");
const source = resolve(root, "scripts/pre-commit");
const next = readFileSync(source);

if (existsSync(destination)) {
  const current = readFileSync(destination);
  const text = current.toString("utf8");
  const ours = current.equals(next) || text.includes(marker) || text.includes("xargs -0 pnpm exec stylelint");
  if (!ours) {
    console.warn("Skipping pre-commit install: an existing pre-commit hook was left in place.");
    process.exit(0);
  }
  if (current.equals(next)) process.exit(0);
}

copyFileSync(source, destination);
chmodSync(destination, 0o755);
