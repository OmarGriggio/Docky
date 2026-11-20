// What each element of a PDF is printed in: its template's palette color
// for that element (template.types.ts's COLOR_ELEMENTS) - null for one with
// none, black (a band: gray). Pure, tested (element-colors.test.ts).

import { PdfColor } from "../core/pdf-writer.types";
import { parseHexColor } from "./accent-color";
import { COLOR_ELEMENTS, ColorElement, TemplateStyle } from "../../modules/templates/template.types";

export type PrintColors = Record<ColorElement, PdfColor | null>;

/** The palette as printable colors, in order - what a text's [c1]...[c5] and [f1]...[f5] stand for. */
export const paletteOf = (style: Pick<TemplateStyle, "palette">): (PdfColor | null)[] =>
    style.palette.map(entry => parseHexColor(entry.color));

/** Each element's color - none for one without a palette position, or one past the palette's end. */
export const printColorsOf = (style: Pick<TemplateStyle, "palette" | "element_colors">): PrintColors => {
    const palette = paletteOf(style);
    return Object.fromEntries(COLOR_ELEMENTS.map(element => {
        const position = style.element_colors[element];
        return [element, position ? palette[position - 1] ?? null : null];
    })) as PrintColors;
};
