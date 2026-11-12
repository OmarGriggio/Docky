import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// One version for the whole app (see CLAUDE.md's Workflow and CHANGELOG.md):
// both package.json files, their lockfiles and the frontend's APP_VERSION
// must agree - a release bumps them all at once. Checked from here, the
// backend's tests running in Node with the whole repo next door (`npm test`
// runs from backend/).
const read = (path: string) => readFileSync(join(process.cwd(), "..", path), "utf-8");
const packageVersion = (path: string): string => JSON.parse(read(path)).version;

describe("the app's version", () => {
    const version = packageVersion("backend/package.json");

    it("is MAJOR.MINOR.PATCH", () => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("is the same everywhere it's written", () => {
        expect(packageVersion("frontend/package.json")).toBe(version);
        expect(packageVersion("backend/package-lock.json")).toBe(version);
        expect(packageVersion("frontend/package-lock.json")).toBe(version);
        expect(read("frontend/src/app/shared/version.ts")).toContain(`APP_VERSION = '${version}'`);
    });
});
