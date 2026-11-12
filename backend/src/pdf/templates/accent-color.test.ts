import { describe, expect, it } from "vitest";
import { parseHexColor, tint } from "./accent-color";

describe("parseHexColor", () => {
    it("turns #rrggbb into 0-1 channels, either case", () => {
        expect(parseHexColor("#ff0080")).toEqual({ r: 1, g: 0, b: 128 / 255 });
        expect(parseHexColor("#FF0080")).toEqual({ r: 1, g: 0, b: 128 / 255 });
    });

    it("is null without a valid color", () => {
        expect(parseHexColor(null)).toBeNull();
        expect(parseHexColor("")).toBeNull();
        expect(parseHexColor("#fff")).toBeNull();
        expect(parseHexColor("ff0080")).toBeNull();
        expect(parseHexColor("#gg0080")).toBeNull();
    });
});

describe("tint", () => {
    it("mixes the color with white", () => {
        const color = { r: 0, g: 0.5, b: 1 };
        expect(tint(color, 1)).toEqual(color);
        expect(tint(color, 0)).toEqual({ r: 1, g: 1, b: 1 });
        expect(tint(color, 0.2)).toEqual({ r: 0.8, g: 0.9, b: 1 });
    });
});
