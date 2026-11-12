import { describe, expect, it } from "vitest";
import { nextSequenceCode, sequencePattern } from "./sequence-code";

describe("nextSequenceCode", () => {
    it("starts at 0001", () => {
        expect(nextSequenceCode("C", null)).toBe("C0001");
        expect(nextSequenceCode("MAT", null)).toBe("MAT0001");
    });

    it("follows the highest number used", () => {
        expect(nextSequenceCode("C", 41)).toBe("C0042");
        expect(nextSequenceCode("MAT", 103)).toBe("MAT0104");
    });

    it("grows past four digits", () => {
        expect(nextSequenceCode("C", 9999)).toBe("C10000");
    });
});

describe("sequencePattern", () => {
    it("matches the prefix followed by digits only", () => {
        const pattern = new RegExp(sequencePattern("MAT"));
        expect(pattern.test("MAT0001")).toBe(true);
        expect(pattern.test("MAT101")).toBe(true);
        expect(pattern.test("MAT101b")).toBe(false);
        expect(pattern.test("APPR-1")).toBe(false);
        expect(pattern.test("SER0001")).toBe(false);
        expect(pattern.test("MAT1234567890")).toBe(false);
    });
});
