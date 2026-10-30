import { describe, expect, it } from "vitest";
import { buildErrorNotification } from "./error_log.notification";

const base = { source: "BACKEND" as const, name: "TypeError", location: "GET /document/:id" };

describe("buildErrorNotification", () => {
  it("announces a new error with its type, where, and a link to the details", () => {
    expect(buildErrorNotification({ ...base, kind: "new" }, "https://docky.example/")).toBe(
      "🔴 **Nouvelle erreur serveur**\n`TypeError` sur `GET /document/:id`\nDétails : https://docky.example/settings/errors"
    );
  });

  it("flags an error that came back after being resolved", () => {
    expect(buildErrorNotification({ ...base, kind: "reopened" }, undefined)).toBe(
      "🟠 **Erreur revenue** (elle était marquée résolue)\n`TypeError` sur `GET /document/:id`"
    );
  });

  it("stays silent for an open error happening again", () => {
    expect(buildErrorNotification({ ...base, kind: "repeat" }, "https://docky.example")).toBeNull();
  });

  it("names a browser error as such", () => {
    expect(buildErrorNotification({ ...base, source: "FRONTEND", kind: "new" }, undefined)).toContain("Nouvelle erreur navigateur");
  });

  it("keeps a reported value from breaking out of its code span", () => {
    const message = buildErrorNotification({ ...base, name: "x` @everyone `y", kind: "new" }, undefined)!;
    expect(message).toContain("`x' @everyone 'y`");
  });
});
