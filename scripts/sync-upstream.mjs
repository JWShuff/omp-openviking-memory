#!/usr/bin/env node
/**
 * Re-vendor this plugin from the official OpenViking repository.
 *
 * The plugin lives at the repo root so `omp plugin install github:<repo>` can
 * treat the repo as a normal package (bun installs `dependencies`; OMP
 * validates the extension at install time and rolls back on failure).
 *
 * Steps:
 *   1. sparse-clone volcengine/OpenViking at the pinned tag into .upstream-tmp/
 *   2. regenerate the shared runtime (examples/memory-plugin-shared/sync.mjs)
 *   3. copy examples/pi-coding-agent-extension/ over the repo root
 *      (README.md lands as UPSTREAM-README.md; package-lock.json is skipped)
 *   4. mirror examples/memory-plugin-shared/{lib,testing} for the test suite
 *   5. patch package.json (name, version, description, omp/pi extension entries)
 *      and write plugin.json
 *   6. rewrite the one test import that assumed the upstream monorepo layout
 *
 * Usage:
 *   node scripts/sync-upstream.mjs [tag]
 *
 * Commit the result; .github/workflows/upstream-sync.yml runs this on a
 * schedule and opens a PR.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_REPO = "https://github.com/volcengine/OpenViking";
const UPSTREAM_TAG = "v0.5.2.1";
const EXTENSION_DIR = "examples/pi-coding-agent-extension";
const PLUGIN_NAME = "openviking-memory";
const PLUGIN_DESCRIPTION =
  "Long-term semantic memory and context for OMP via OpenViking — auto-recall, turn capture, context takeover, and MCP tools.";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TMP = join(ROOT, ".upstream-tmp");
const tag = process.argv[2] || UPSTREAM_TAG;

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: ["ignore", "inherit", "inherit"] });

console.log(`vendoring ${UPSTREAM_REPO} @ ${tag}`);

rmSync(TMP, { recursive: true, force: true });
run("git", [
  "clone", "--depth", "1", "--filter=blob:none", "--sparse",
  "--branch", tag, UPSTREAM_REPO, TMP,
]);
run("git", ["sparse-checkout", "set", EXTENSION_DIR, "examples/memory-plugin-shared", "examples/skills"], TMP);

// Populates the extension's shared/ and skills/ directories.
run(process.execPath, ["examples/memory-plugin-shared/sync.mjs"], TMP);

const src = join(TMP, EXTENSION_DIR);
const skip = new Set(["README.md", "package-lock.json"]);
for (const entry of readdirSync(src, { withFileTypes: true })) {
  if (skip.has(entry.name)) continue;
  cpSync(join(src, entry.name), join(ROOT, entry.name), { recursive: true, force: true });
}
cpSync(join(src, "README.md"), join(ROOT, "UPSTREAM-README.md"));

// The vendored test suite imports the shared lib by its monorepo-relative path.
const sharedSrc = join(TMP, "examples/memory-plugin-shared");
rmSync(join(ROOT, "memory-plugin-shared"), { recursive: true, force: true });
mkdirSync(join(ROOT, "memory-plugin-shared"), { recursive: true });
for (const dir of ["lib", "testing"]) {
  cpSync(join(sharedSrc, dir), join(ROOT, "memory-plugin-shared", dir), { recursive: true });
}
cpSync(join(sharedSrc, "lib", "MANIFEST"), join(ROOT, "memory-plugin-shared", "MANIFEST"));

const pkgPath = join(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const version = pkg.version;
pkg.name = PLUGIN_NAME;
pkg.description = "OpenViking memory and context for OMP — auto-recall, capture, takeover, MCP tools";
pkg.omp = { extensions: ["./index.ts"] };
pkg.pi = { extensions: ["./index.ts"] };
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

writeFileSync(
  join(ROOT, "plugin.json"),
  `${JSON.stringify(
    {
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: PLUGIN_NAME,
      version,
      description: PLUGIN_DESCRIPTION,
      author: { name: "Volcano Engine", url: "https://github.com/volcengine" },
      homepage: "https://github.com/volcengine/OpenViking",
      repository: "https://github.com/volcengine/OpenViking",
      license: "AGPL-3.0",
      keywords: ["memory", "long-term-memory", "context", "openviking", "omp", "mcp"],
    },
    null,
    2,
  )}\n`,
);

const testPath = join(ROOT, "tests", "recall-deferred.test.mjs");
const testSource = readFileSync(testPath, "utf8").replaceAll(
  "../../memory-plugin-shared/",
  "../memory-plugin-shared/",
);
writeFileSync(testPath, testSource);

rmSync(TMP, { recursive: true, force: true });
console.log(`done: ${PLUGIN_NAME}@${version} — review and commit the diff`);
