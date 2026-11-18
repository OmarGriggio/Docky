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

const WHITE: PdfColor = { r: 1, g: 1, b: 1 };
const BLACK: PdfColor = { r: 0, g: 0, b: 0 };

// The text color that reads on a filled background of `color` - white on a
// dark one, black on a light one (a pale company color), by its relative
// luminance (WCAG's weights, sRGB decoded).
export const textColorOn = (color: PdfColor): PdfColor => {
    const linear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
    return luminance > 0.4 ? BLACK : WHITE;
};
