import { describe, expect, it } from "vitest";
import { buildFingerprint, firstAppFrame, normalizeMessage, truncate } from "./error_log.fingerprint";

const stackAt = (line: number) => [
  "TypeError: Cannot read properties of null (reading 'id')",
  "    at getRow (/app/node_modules/pg/lib/result.js:12:5)",
  `    at addClientServ (/app/src/modules/clients/client.service.ts:${line}:17)`,
  "    at processTicksAndRejections (node:internal/process/task_queues:105:5)",
].join("\n");

describe("normalizeMessage", () => {
  it("replaces numbers so ids and amounts don't split a group", () => {
    expect(normalizeMessage("Client 12 not found")).toBe(normalizeMessage("Client 4711 not found"));
  });

  it("collapses whitespace", () => {
    expect(normalizeMessage("  a\n  b  ")).toBe("a b");
  });
});

describe("firstAppFrame", () => {
  it("skips library and node frames, keeps the path from src/ and drops the column", () => {
    expect(firstAppFrame(stackAt(21))).toBe("at addClientServ (src/modules/clients/client.service.ts:21)");
  });

  it("reads a Windows path the same way", () => {
    expect(firstAppFrame("Error: x\n    at f (C:\\Docky\\backend\\src\\a.ts:3:9)")).toBe("at f (src/a.ts:3)");
  });

  it("returns null when there is no stack or no frame of our own", () => {
    expect(firstAppFrame(null)).toBeNull();
    expect(firstAppFrame("Error: x\n    at node:internal/foo:1:1")).toBeNull();
  });
});

describe("buildFingerprint", () => {
  it("groups the same backend error from different ids", () => {
    expect(buildFingerprint("BACKEND", "TypeError", "Client 1 broke", stackAt(21)))
      .toBe(buildFingerprint("BACKEND", "TypeError", "Client 2 broke", stackAt(21)));
  });

  it("splits a backend error thrown from another line", () => {
    expect(buildFingerprint("BACKEND", "TypeError", "x", stackAt(21)))
      .not.toBe(buildFingerprint("BACKEND", "TypeError", "x", stackAt(40)));
  });

  it("ignores a frontend stack, which changes with every build", () => {
    expect(buildFingerprint("FRONTEND", "TypeError", "x", "at a (main-ABC.js:1:200)"))
      .toBe(buildFingerprint("FRONTEND", "TypeError", "x", "at b (main-XYZ.js:1:999)"));
  });

  it("never mixes a backend and a frontend error", () => {
    expect(buildFingerprint("BACKEND", "Error", "x", null)).not.toBe(buildFingerprint("FRONTEND", "Error", "x", null));
  });
});

describe("truncate", () => {
  it("cuts only what's over the limit", () => {
    expect(truncate("abcdef", 3)).toBe("abc");
    expect(truncate("ab", 3)).toBe("ab");
  });
});
