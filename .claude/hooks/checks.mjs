// The project's Claude Code hooks (.claude/settings.json) - two checks that
// run by themselves, their errors fed back to Claude:
//   node .claude/hooks/checks.mjs edit  (PostToolUse on Edit|Write): a backend
//     .ts file just changed -> the backend's type check (tsc --noEmit).
//   node .claude/hooks/checks.mjs stop  (Stop): what changed since the last
//     check that passed - however it was edited (Edit, or a script) ->
//     the backend's type check and/or the frontend's build (ng build, which
//     also checks the templates).
// Nothing to check, or it passes: silent. It fails: exit 2 (edit) or a
// "block" decision (stop), so Claude reads the errors and fixes them - once
// per stop, never in a loop (stop_hook_active).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const statePath = join(root, ".claude", "hooks", ".state.json");
const MAX_LINES = 40;

const readInput = () => {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
};

const run = (cwd, args) => {
  try {
    execFileSync(process.execPath, args, {
      cwd, encoding: "utf8", stdio: "pipe", maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    return null;
  } catch (err) {
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`
      .replace(/\u001b\[[0-9;]*m/g, "")
      .split(/\r?\n/)
      .filter(line => line.trim());
    // All of it when it's short (an error's file and line included), else
    // the lines naming an error.
    const errors = output.filter(line => /error/i.test(line));
    const shown = (output.length <= MAX_LINES || errors.length === 0 ? output : errors).slice(0, MAX_LINES);
    return shown.join("\n") + (output.length > shown.length ? `\n... (${output.length - shown.length} more lines)` : "");
  }
};

const backendTypeCheck = () => run(join(root, "backend"), ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "."]);
const frontendBuild = () => run(join(root, "frontend"), ["node_modules/@angular/cli/bin/ng.js", "build"]);

// What one side looks like right now, uncommitted changes and new files
// included - null when nothing differs from the last commit.
const fingerprintOf = (paths) => {
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const diff = git("diff", "HEAD", "--", ...paths);
  const untracked = git("ls-files", "--others", "--exclude-standard", "--", ...paths).split("\n").filter(Boolean);
  if (!diff && untracked.length === 0) {
    return null;
  }
  const hash = createHash("sha1").update(diff);
  for (const file of untracked) {
    hash.update(file);
    try { hash.update(readFileSync(join(root, file))); } catch { /* deleted meanwhile */ }
  }
  return hash.digest("hex");
};

const readState = () => {
  try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return {}; }
};

const SIDES = {
  backend: { paths: ["backend/src"], check: backendTypeCheck, label: "Backend type check (tsc --noEmit)" },
  frontend: { paths: ["frontend/src", "frontend/public/i18n"], check: frontendBuild, label: "Frontend build (ng build)" },
};

const mode = process.argv[2];
const input = readInput();

if (mode === "edit") {
  const file = String(input.tool_input?.file_path ?? input.tool_response?.filePath ?? "").replaceAll("\\", "/");
  if (!/\/backend\/src\/.+\.ts$/.test(file) || !existsSync(join(root, "backend", "node_modules"))) {
    process.exit(0);
  }
  const errors = backendTypeCheck();
  if (errors) {
    process.stderr.write(`Backend type check (tsc --noEmit) fails after this edit:\n${errors}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (mode === "stop") {
  const state = readState();
  const failures = [];
  for (const [side, { paths, check, label }] of Object.entries(SIDES)) {
    if (!existsSync(join(root, side, "node_modules"))) {
      continue;
    }
    const fingerprint = fingerprintOf(paths);
    if (fingerprint === null || fingerprint === state[side]) {
      continue;
    }
    const errors = check();
    if (errors) {
      failures.push(`${label} fails:\n${errors}`);
    } else {
      state[side] = fingerprint;
    }
  }
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  if (failures.length === 0) {
    process.exit(0);
  }
  const reason = failures.join("\n\n");
  // Already continued once because of this hook: say so, don't loop.
  process.stdout.write(JSON.stringify(input.stop_hook_active
    ? { systemMessage: `Checks still failing:\n${reason}` }
    : { decision: "block", reason: `${reason}\n\nFix these before finishing.` }));
  process.exit(0);
}
