// node .claude/skills/release/ci-status.mjs <commit sha> [max minutes, default 30]
// Follows the GitHub Actions run(s) of a commit pushed to main (the Deploy
// workflow: tests, images, deploy) through GitHub's public API - no token,
// the repository is public; one request a minute keeps under its 60 an hour.
// Prints each change of state; exit 0 once every run succeeded, 1 if one
// failed, 2 if they're still running when the time is up.
import { execFileSync } from "node:child_process";

const sha = process.argv[2];
const maxMinutes = Number(process.argv[3] ?? 30);
if (!sha) {
  console.error("Usage: node .claude/skills/release/ci-status.mjs <sha> [max minutes]");
  process.exit(1);
}
const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
const repo = remote.replace(/^.*github\.com[:/]/, "").replace(/\.git$/, "");
const fullSha = execFileSync("git", ["rev-parse", sha], { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let last = "";
const deadline = Date.now() + maxMinutes * 60_000;
while (Date.now() < deadline) {
  let runs = [];
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?head_sha=${fullSha}&per_page=20`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "docky-release-check" },
    });
    runs = (await res.json()).workflow_runs ?? [];
  } catch (err) {
    console.log(`GitHub unreachable (${err.message}), retrying`);
  }
  const state = runs.map((run) => `${run.name}: ${run.status}${run.conclusion ? ` (${run.conclusion})` : ""}`).join(", ") || "no run yet";
  if (state !== last) {
    console.log(`${new Date().toLocaleTimeString()} ${state}`);
    last = state;
  }
  if (runs.length > 0 && runs.every((run) => run.status === "completed")) {
    const failed = runs.filter((run) => run.conclusion !== "success");
    for (const run of failed) {
      console.log(`FAILED: ${run.name} - ${run.html_url}`);
    }
    if (failed.length === 0) {
      console.log(`All green: ${runs.map((run) => run.html_url).join(" ")}`);
    }
    process.exit(failed.length ? 1 : 0);
  }
  await sleep(60_000);
}
console.log(`Still running after ${maxMinutes} min: ${last}`);
process.exit(2);
