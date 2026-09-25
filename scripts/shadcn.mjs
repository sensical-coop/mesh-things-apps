#!/usr/bin/env node
/**
 * `pnpm shadcn <args>`: runs the shadcn CLI from apps/web (whose components.json
 * sends `ui` to @mtt/ui), then undoes one thing the registry now does.
 *
 * shadcn's registry ships `import { cn } from "cn"` plus a dependency on the
 * `cn` npm package, and the CLI no longer rewrites that to `aliases.utils`.
 * Our `cn` in @mtt/ui/utils carries a tailwind-merge config for the BoardUI
 * text utilities, so the npm one would silently merge classes wrong. Point
 * those imports back at @mtt/ui/utils and drop the dependency.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiSrc = join(root, "packages/ui/src");
const uiPackageJson = join(root, "packages/ui/package.json");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  return result.status ?? 1;
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const status = run("pnpm", ["dlx", "shadcn@latest", ...process.argv.slice(2)], join(root, "apps/web"));

const rewritten = [];
for (const file of sourceFiles(uiSrc)) {
  const text = readFileSync(file, "utf8");
  const fixed = text.replace(/from (["'])cn\1/g, 'from "@mtt/ui/utils"');
  if (fixed !== text) {
    writeFileSync(file, fixed);
    rewritten.push(file.slice(root.length + 1));
  }
}

const pkg = JSON.parse(readFileSync(uiPackageJson, "utf8"));
const addedCn = pkg.dependencies?.cn !== undefined;
if (addedCn) {
  delete pkg.dependencies.cn;
  writeFileSync(uiPackageJson, `${JSON.stringify(pkg, null, 2)}\n`);
}

if (rewritten.length) console.log(`shadcn: pointed cn back to @mtt/ui/utils in ${rewritten.join(", ")}`);
if (addedCn) {
  console.log("shadcn: removed the `cn` npm dependency from @mtt/ui; reinstalling");
  run("pnpm", ["install"], root);
}

process.exit(status);
