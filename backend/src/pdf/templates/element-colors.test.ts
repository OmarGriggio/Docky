import { describe, expect, it } from "vitest";
import { paletteOf, printColorsOf } from "./element-colors";

describe("printColorsOf", () => {
    const style = {
        palette: [{ name: "Vert", color: "#037a3f" }, { name: "Bleu", color: "#1d4ed8" }],
        element_colors: { title: 2, total: 1, footer: 3 },
    };

    it("gives each element its palette color", () => {
        const colors = printColorsOf(style);
        expect(colors.title).toEqual(paletteOf(style)[1]);
        expect(colors.total).toEqual(paletteOf(style)[0]);
    });

    it("leaves an element without a position, or past the palette, without a color", () => {
        const colors = printColorsOf(style);
        expect(colors.text).toBeNull();
        expect(colors.footer).toBeNull();
    });

    it("has no colors at all without a palette", () => {
        expect(Object.values(printColorsOf({ palette: [], element_colors: {} })).every(color => color === null)).toBe(true);
    });
});
