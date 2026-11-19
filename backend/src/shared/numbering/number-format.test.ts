import { describe, expect, it } from "vitest";
import { DEFAULT_NUMBER_FORMATS, formatNumber, formatsOverlap, nextSequence, numberPattern, parseNumberFormat, resetsEveryYear } from "./number-format";

describe("parseNumberFormat", () => {
    it("accepts the default formats", () => {
        for (const format of Object.values(DEFAULT_NUMBER_FORMATS)) {
            expect(parseNumberFormat(format)).not.toHaveProperty("error");
        }
    });

    it("accepts a sequence alone, or with a short year and separators", () => {
        expect(parseNumberFormat("{NNNNN}")).not.toHaveProperty("error");
        expect(parseNumberFormat("F{YY}/{NNN}")).not.toHaveProperty("error");
        expect(parseNumberFormat("R.{YYYY}_{N}")).not.toHaveProperty("error");
    });

    it("refuses a format without exactly one sequence", () => {
        expect(parseNumberFormat("")).toEqual({ error: "EMPTY" });
        expect(parseNumberFormat("FAC-{YYYY}")).toEqual({ error: "NO_SEQUENCE" });
        expect(parseNumberFormat("{NN}-{NN}")).toEqual({ error: "SEVERAL_SEQUENCES" });
        expect(parseNumberFormat("{NNNNNNNNN}")).toEqual({ error: "SEQUENCE_TOO_LONG" });
    });

    it("refuses spaces, accents and unknown tokens", () => {
        expect(parseNumberFormat("FAC {NNNN}")).toEqual({ error: "INVALID_CHARACTERS" });
        expect(parseNumberFormat("Fé-{NNNN}")).toEqual({ error: "INVALID_CHARACTERS" });
        expect(parseNumberFormat("{AAAA}-{NNNN}")).toEqual({ error: "INVALID_CHARACTERS" });
        expect(parseNumberFormat("x".repeat(31) + "{N}")).toEqual({ error: "TOO_LONG" });
    });
});

describe("formatNumber", () => {
    it("builds today's numbers from the default formats", () => {
        expect(formatNumber(DEFAULT_NUMBER_FORMATS.INVOICE, 2026, 12)).toBe("FAC-2026-0012");
        expect(formatNumber(DEFAULT_NUMBER_FORMATS.QUOTE, 2026, 1)).toBe("OFF-2026-0001");
    });

    it("pads the sequence, never cuts a longer one", () => {
        expect(formatNumber("F{YY}/{NNN}", 2027, 7)).toBe("F27/007");
        expect(formatNumber("{NNN}", 2026, 12345)).toBe("12345");
    });
});

describe("numberPattern", () => {
    it("matches this year's numbers of the format and captures their sequence", () => {
        const pattern = new RegExp(numberPattern("FAC-{YYYY}-{NNNN}", 2026));
        expect("FAC-2026-0012".match(pattern)?.[1]).toBe("0012");
        expect("FAC-2026-12345".match(pattern)?.[1]).toBe("12345");
        expect(pattern.test("FAC-2025-0012")).toBe(false);
        expect(pattern.test("OFF-2026-0012")).toBe(false);
        expect(pattern.test("XFAC-2026-0012")).toBe(false);
    });

    it("escapes the format's separators", () => {
        const pattern = new RegExp(numberPattern("R.{YY}/{N}", 2026));
        expect(pattern.test("R.26/4")).toBe(true);
        expect(pattern.test("Rx26/4")).toBe(false);
    });
});

describe("resetsEveryYear", () => {
    it("is true with the year in the format", () => {
        expect(resetsEveryYear("FAC-{YYYY}-{NNNN}")).toBe(true);
        expect(resetsEveryYear("F{YY}{NNN}")).toBe(true);
        expect(resetsEveryYear("F-{NNNNN}")).toBe(false);
    });
});

describe("nextSequence", () => {
    const options = { start: null, startYear: null, year: 2026, yearly: true };

    it("is one past the highest, 1 without any", () => {
        expect(nextSequence(null, options)).toBe(1);
        expect(nextSequence(11, options)).toBe(12);
    });

    it("continues from the start a company moved in with", () => {
        expect(nextSequence(null, { ...options, start: 1234, startYear: 2026 })).toBe(1234);
        expect(nextSequence(1300, { ...options, start: 1234, startYear: 2026 })).toBe(1301);
    });

    it("starts again at 1 the next year, unless the format has no year", () => {
        expect(nextSequence(null, { ...options, start: 1234, startYear: 2025 })).toBe(1);
        expect(nextSequence(null, { ...options, start: 1234, startYear: 2025, yearly: false })).toBe(1234);
    });
});

describe("formatsOverlap", () => {
    it("catches formats reading each other's numbers", () => {
        expect(formatsOverlap("F{NNNN}", "F{NNNNN}", 2026)).toBe(true);
        expect(formatsOverlap("D{NNNN}", "D{YY}{NNNN}", 2026)).toBe(true);
        expect(formatsOverlap("{NNNN}", "{YYYY}{NNNN}", 2026)).toBe(true);
        expect(formatsOverlap("OFF-{YYYY}-{NNNN}", "OFF-{YYYY}-{NNNN}", 2026)).toBe(true);
    });

    it("lets distinct formats be", () => {
        expect(formatsOverlap("OFF-{YYYY}-{NNNN}", "FAC-{YYYY}-{NNNN}", 2026)).toBe(false);
        expect(formatsOverlap("MAT{NNNN}", "SER{NNNN}", 2026)).toBe(false);
        expect(formatsOverlap("CH-{NNNN}", "CH-{YYYY}-{NNNN}", 2026)).toBe(false);
    });
});
