import { PdfColor } from "../core/pdf-writer.types";

// One of the company's colors as stored ("#b8860b") - null for none, or
// anything that isn't one (the service only ever stores a valid one).
export const parseHexColor = (hex: string | null): PdfColor | null => {
    const match = hex?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) {
        return null;
    }
    const [r, g, b] = match.slice(1).map(part => parseInt(part, 16) / 255);
    return { r, g, b };
};

// The color mixed with white - a light background behind black text.
// `strength` 1 is the color itself, 0 is white.
export const tint = (color: PdfColor, strength: number): PdfColor => ({
    r: 1 - (1 - color.r) * strength,
    g: 1 - (1 - color.g) * strength,
    b: 1 - (1 - color.b) * strength,
});
