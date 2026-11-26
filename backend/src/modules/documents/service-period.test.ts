import { describe, expect, it } from "vitest";
import { normalizeServicePeriod } from "./service-period";

describe("normalizeServicePeriod", () => {
  it("keeps a period and a single date", () => {
    expect(normalizeServicePeriod("INVOICE", "2026-10-01", "2026-10-15")).toEqual({ service_date_start: "2026-10-01", service_date_end: "2026-10-15" });
    expect(normalizeServicePeriod("INVOICE", "2026-10-01", null)).toEqual({ service_date_start: "2026-10-01", service_date_end: null });
  });

  it("reads nothing as no period", () => {
    expect(normalizeServicePeriod("INVOICE", undefined, "")).toEqual({ service_date_start: null, service_date_end: null });
  });

  it("makes an end alone the single date, and an end on the start day none", () => {
    expect(normalizeServicePeriod("INVOICE", null, "2026-10-15")).toEqual({ service_date_start: "2026-10-15", service_date_end: null });
    expect(normalizeServicePeriod("INVOICE", "2026-10-15", "2026-10-15")).toEqual({ service_date_start: "2026-10-15", service_date_end: null });
  });

  it("gives a quote none", () => {
    expect(normalizeServicePeriod("QUOTE", "2026-10-01", "2026-10-15")).toEqual({ service_date_start: null, service_date_end: null });
  });

  it("refuses an end before the start", () => {
    expect(() => normalizeServicePeriod("INVOICE", "2026-10-15", "2026-10-01")).toThrow(expect.objectContaining({ code: "SERVICE_PERIOD_INVALID" }));
  });

  it("refuses what isn't a real day", () => {
    for (const value of ["2026-02-30", "15.10.2026", "2026-10-15T00:00:00Z", 20261015, {}]) {
      expect(() => normalizeServicePeriod("INVOICE", value, null)).toThrow(expect.objectContaining({ code: "SERVICE_DATE_INVALID" }));
    }
  });
});
