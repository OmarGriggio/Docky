import { describe, it, expect } from "vitest";
import { formatAmount, formatIban, formatPercent, formatPlainDate, formatShortDate, servicePeriodOf } from "./format";

describe("invoice formats", () => {

    it("prints amounts with an apostrophe between thousands", () => {
        expect(formatAmount(1578.75)).toBe("1'578.75");
        expect(formatAmount(1234567.5)).toBe("1'234'567.50");
        expect(formatAmount(235)).toBe("235.00");
        expect(formatAmount(-54.41)).toBe("-54.41");
        expect(formatAmount(-1054.4)).toBe("-1'054.40");
    });

    it("prints percentages and short dates", () => {
        expect(formatPercent(8.1)).toBe("8.10%");
        expect(formatPercent(-3)).toBe("-3.00%");
        expect(formatShortDate(new Date(2024, 8, 3))).toBe("03.09.2024");
    });

    it("groups an IBAN by four, whatever spacing it was typed with", () => {
        expect(formatIban("CH8500790016247615012")).toBe("CH85 0079 0016 2476 1501 2");
        expect(formatIban("CH85 0079 0016 2476 15012")).toBe("CH85 0079 0016 2476 1501 2");
    });

});

describe("formatPlainDate", () => {
  it("reads a plain date as written", () => {
    expect(formatPlainDate("2026-03-01")).toBe("01.03.2026");
  });
});

describe("servicePeriodOf", () => {
    it("prints a single date or a period", () => {
        expect(servicePeriodOf("2026-10-01", null)).toEqual({ single: true, value: "01.10.2026" });
        expect(servicePeriodOf("2026-10-01", "2026-10-15")).toEqual({ single: false, value: "01.10.2026 – 15.10.2026" });
        expect(servicePeriodOf(new Date(2026, 9, 1), new Date(2026, 9, 15))).toEqual({ single: false, value: "01.10.2026 – 15.10.2026" });
    });

    it("prints an end on the start day as one date, nothing without a start", () => {
        expect(servicePeriodOf("2026-10-01", "2026-10-01")).toEqual({ single: true, value: "01.10.2026" });
        expect(servicePeriodOf(null, "2026-10-15")).toBeNull();
    });
});
