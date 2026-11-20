import { describe, expect, it } from "vitest";
import { TextRun, TextStyle, layoutRichLines, paragraphsOf, parseRichText, plainTextOf, richTextOf } from "./rich-text";

const plain: TextStyle = { bold: false, color: null, background: null };
const style = (overrides: Partial<TextStyle>): TextStyle => ({ ...plain, ...overrides });

describe("parseRichText", () => {
    it("keeps a text without tags as one plain run", () => {
        expect(parseRichText("Bonjour Madame")).toEqual([{ text: "Bonjour Madame", style: plain }]);
    });

    it("reads bold, both text colors and both bands", () => {
        expect(parseRichText("a[g]b[/g][c1]c[/c1][c2]d[/c2][f1]e[/f1][f2]f[/f2]")).toEqual([
            { text: "a", style: plain },
            { text: "b", style: style({ bold: true }) },
            { text: "c", style: style({ color: 1 }) },
            { text: "d", style: style({ color: 2 }) },
            { text: "e", style: style({ background: 1 }) },
            { text: "f", style: style({ background: 2 }) },
        ]);
    });

    it("nests tags, the innermost color winning", () => {
        expect(parseRichText("[f1][g]a[c2]b[/c2][/g]c[/f1]")).toEqual([
            { text: "a", style: style({ bold: true, background: 1 }) },
            { text: "b", style: style({ bold: true, background: 1, color: 2 }) },
            { text: "c", style: style({ background: 1 }) },
        ]);
        expect(parseRichText("[c1]a[c2]b[/c2]c[/c1]").map(run => run.style.color)).toEqual([1, 2, 1]);
    });

    it("ignores the tags' case", () => {
        expect(parseRichText("[G]a[/g]")).toEqual([{ text: "a", style: style({ bold: true }) }]);
    });

    it("prints a closing tag nothing opened as typed, and applies an unclosed one to the end", () => {
        expect(parseRichText("a[/g]b")).toEqual([{ text: "a[/g]b", style: plain }]);
        expect(parseRichText("a[c1]b")).toEqual([{ text: "a", style: plain }, { text: "b", style: style({ color: 1 }) }]);
    });

    it("leaves unknown or broken tags as typed", () => {
        expect(plainTextOf(parseRichText("[c6]a[/c6] [f0] [g b] [b]"))).toBe("[c6]a[/c6] [f0] [g b] [b]");
    });

    it("reads the palette's five colors", () => {
        expect(parseRichText("[c3]a[/c3][f5]b[/f5]")).toEqual([{ text: "a", style: style({ color: 3 }) }, { text: "b", style: style({ background: 5 }) }]);
    });

    it("drops the empty passages between tags", () => {
        expect(parseRichText("[g][/g]a")).toEqual([{ text: "a", style: plain }]);
    });
});

describe("richTextOf", () => {
    it("fills the placeholders inside a styled passage", () => {
        expect(richTextOf("[g]{{montant}}[/g] CHF", { montant: "1'200.00" })).toEqual([
            { text: "1'200.00", style: style({ bold: true }) },
            { text: " CHF", style: plain },
        ]);
    });

    it("never reads a placeholder's value as a tag", () => {
        expect(richTextOf("Cher {{titre_client}}", { titre_client: "[g]Dupont[/g]" })).toEqual([
            { text: "Cher [g]Dupont[/g]", style: plain },
        ]);
    });
});

describe("paragraphsOf", () => {
    it("splits at line breaks, styles carried across", () => {
        expect(paragraphsOf([{ text: "a\r\nb", style: style({ bold: true }) }, { text: "c\n\nd", style: plain }])).toEqual([
            [{ text: "a", style: style({ bold: true }) }],
            [{ text: "b", style: style({ bold: true }) }, { text: "c", style: plain }],
            [],
            [{ text: "d", style: plain }],
        ]);
    });
});

describe("layoutRichLines", () => {
    // Every character 1 wide, a bold one 2.
    const measure = (text: string, style: TextStyle) => text.length * (style.bold ? 2 : 1);
    const textOf = (lines: TextRun[][]) => lines.map(plainTextOf);

    it("breaks at spaces like plain text, without the space broken at", () => {
        expect(textOf(layoutRichLines([{ text: "aaa bbb ccc", style: plain }], measure, 7))).toEqual(["aaa bbb", "ccc"]);
    });

    it("measures each passage in its own style", () => {
        // "aaa " is 4, bold "bb" 4: 8 doesn't fit in 7.
        expect(textOf(layoutRichLines([{ text: "aaa ", style: plain }, { text: "bb", style: style({ bold: true }) }], measure, 7))).toEqual(["aaa", "bb"]);
    });

    it("keeps a word changing style midway in one piece", () => {
        const lines = layoutRichLines([{ text: "aaaa bon", style: plain }, { text: "jour", style: style({ color: 1 }) }], measure, 8);
        expect(textOf(lines)).toEqual(["aaaa", "bonjour"]);
        expect(lines[1]).toEqual([{ text: "bon", style: plain }, { text: "jour", style: style({ color: 1 }) }]);
    });

    it("keeps the spaces inside a band on the line, in the band's style", () => {
        const lines = layoutRichLines([{ text: "a b", style: style({ background: 1 }) }], measure, 10);
        expect(lines).toEqual([[{ text: "a b", style: style({ background: 1 }) }]]);
    });

    it("keeps the author's indent, and gives a word too wide its own line", () => {
        expect(textOf(layoutRichLines([{ text: "  a verylongword b", style: plain }], measure, 6))).toEqual(["  a", "verylongword", "b"]);
    });

    it("gives an empty paragraph one empty line", () => {
        expect(layoutRichLines([], measure, 10)).toEqual([[]]);
    });
});
