// node .claude/skills/release/bump-version.mjs X.Y.Z
// Writes the app's one version everywhere it lives (see CLAUDE.md's
// Versioning): both package.json, both lockfiles (their own "version" and
// packages[""]'s) and the frontend's APP_VERSION - then the backend's
// version.test.ts checks they all agree. Refuses anything but a version
// above the current one.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// Vitest fails to load its config from a lowercase drive ("c:\...") on Windows.
const root = (process.env.CLAUDE_PROJECT_DIR || process.cwd()).replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next ?? "")) {
  console.error("Usage: node .claude/skills/release/bump-version.mjs X.Y.Z");
  process.exit(1);
}

const read = (path) => readFileSync(join(root, path), "utf8");
const current = JSON.parse(read("backend/package.json")).version;
const parts = (v) => v.split(".").map(Number);
const above = (a, b) => { const [x, y] = [parts(a), parts(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
if (!above(next, current)) {
  console.error(`${next} isn't above the current version ${current}`);
  process.exit(1);
}

// Replaces the first `count` occurrences of `"version": "<current>"` - a
// lockfile's own two come first, before any dependency's.
const bumpJson = (path, count) => {
  let text = read(path);
  let done = 0;
  text = text.replace(new RegExp(`"version": "${current.replaceAll(".", "\.")}"`, "g"), (match) => done++ < count ? `"version": "${next}"` : match);
  if (done < count) {
    throw new Error(`${path}: expected ${count} "version": "${current}", found ${done}`);
  }
  writeFileSync(join(root, path), text);
};

for (const side of ["backend", "frontend"]) {
  bumpJson(`${side}/package.json`, 1);
  bumpJson(`${side}/package-lock.json`, 2);
}
const versionTs = "frontend/src/app/shared/version.ts";
const ts = read(versionTs);
if (!ts.includes(`APP_VERSION = '${current}'`)) {
  throw new Error(`${versionTs}: APP_VERSION isn't '${current}'`);
}
writeFileSync(join(root, versionTs), ts.replace(`APP_VERSION = '${current}'`, `APP_VERSION = '${next}'`));

console.log(`${current} -> ${next}: backend/frontend package.json, their lockfiles, ${versionTs}`);
execSync("npx vitest run src/shared/version/version.test.ts", { cwd: join(root, "backend"), stdio: "inherit" });
