// Styled text in a document's introduction, conclusion or reminder text -
// typed around a passage like a placeholder, with the profile's two colors:
//   [g]...[/g]    bold
//   [c1]...[/c1]  in the template's first palette color ([c2]...[c5] the others)
//   [f1]...[/f1]  on a band of that color ([f2]...[f5])
// Tags nest ([f1][g]...[/g][/f1]), are case-insensitive and never fail a
// PDF: a closing tag nothing opened is printed as typed, a tag left open
// applies to the end of the text. A color the company hasn't set leaves its
// passage in black, without a band (decided when drawing, not here).
//
// Pure: parsing, filling the placeholders and splitting into lines (with a
// width measure passed in) are tested on their own; PdfWriter.richText()
// draws the result.

import { fillPlaceholders } from "./placeholders";

// A palette position, from 1 (template.types.ts's MAX_PALETTE: 5).
export type DocumentColor = number;

export interface TextStyle {
    bold: boolean;
    color: DocumentColor | null;
    background: DocumentColor | null;
}

export interface TextRun {
    text: string;
    style: TextStyle;
}

export const PLAIN: TextStyle = { bold: false, color: null, background: null };

const TAG = /\[(\/?)(g|c[1-5]|f[1-5])\]/gi;

const sameStyle = (a: TextStyle, b: TextStyle) =>
    a.bold === b.bold && a.color === b.color && a.background === b.background;

/** The style the tags open at this point give - the innermost color and band win. */
const styleOf = (open: string[]): TextStyle => {
    let style: TextStyle = { ...PLAIN };
    for (const tag of open) {
        if (tag === "g") style = { ...style, bold: true };
        if (tag[0] === "c") style = { ...style, color: Number(tag[1]) };
        if (tag[0] === "f") style = { ...style, background: Number(tag[1]) };
    }
    return style;
};

/** Adds `text` in `style` after `runs`, merged into the last run when it has the same style. */
const append = (runs: TextRun[], text: string, style: TextStyle) => {
    if (!text) return;
    const last = runs.at(-1);
    if (last && sameStyle(last.style, style)) {
        last.text += text;
    } else {
        runs.push({ text, style });
    }
};

/** `text` as runs of one style each, the tags taken out. */
export const parseRichText = (text: string): TextRun[] => {
    const runs: TextRun[] = [];
    const open: string[] = [];
    let index = 0;
    for (const match of text.matchAll(TAG)) {
        append(runs, text.slice(index, match.index), styleOf(open));
        const tag = match[2].toLowerCase();
        if (!match[1]) {
            open.push(tag);
        } else if (open.includes(tag)) {
            open.splice(open.lastIndexOf(tag), 1);
        } else {
            // Closes nothing: printed as typed.
            append(runs, match[0], styleOf(open));
        }
        index = match.index + match[0].length;
    }
    append(runs, text.slice(index), styleOf(open));
    return runs;
};

/**
 * `text` parsed, then its {{placeholders}} filled run by run - in that order,
 * so a value is never read as a tag (a client called "[g]Dupont" prints as
 * typed). A placeholder split by a tag isn't one, and stays as typed.
 */
export const richTextOf = (text: string, values: Record<string, string>): TextRun[] =>
    parseRichText(text)
        .map(run => ({ ...run, text: fillPlaceholders(run.text, values) }))
        .filter(run => run.text !== "");

/** The text without its styles - what a plain preview or a search reads. */
export const plainTextOf = (runs: TextRun[]): string => runs.map(run => run.text).join("");

/** `runs` split at each line break: one list of runs per paragraph (an empty list for an empty line). */
export const paragraphsOf = (runs: TextRun[]): TextRun[][] => {
    const paragraphs: TextRun[][] = [[]];
    for (const run of runs) {
        run.text.replace(/\t/g, " ").replace(/\r\n?/g, "\n").split("\n").forEach((part, i) => {
            if (i > 0) paragraphs.push([]);
            append(paragraphs.at(-1)!, part, run.style);
        });
    }
    return paragraphs;
};

/**
 * One paragraph's runs split into the lines they fit on within `maxWidth`,
 * `measure` giving a piece of text's width in its style - the same rule as
 * plain text (PdfWriter's wrapText): words break at spaces, a word wider
 * than the line gets a line of its own, the spaces the author typed before
 * the first word are kept (an indent), a line never starts or ends with the
 * space it was broken at. A word can change style midway ("bon[g]jour[/g]")
 * and stays in one piece.
 */
export const layoutRichLines = (
    paragraph: TextRun[],
    measure: (text: string, style: TextStyle) => number,
    maxWidth: number,
): TextRun[][] => {
    // Words (pieces without a space, possibly in several styles), each
    // followed by the spaces after it.
    interface Word { pieces: TextRun[]; spaces: TextRun[] }
    const leading: TextRun[] = [];
    const words: Word[] = [];
    for (const run of paragraph) {
        for (const part of run.text.split(/( +)/)) {
            if (!part) continue;
            if (part.startsWith(" ")) {
                if (words.length === 0) append(leading, part, run.style);
                else append(words.at(-1)!.spaces, part, run.style);
            } else if (words.length === 0 || words.at(-1)!.spaces.length > 0) {
                words.push({ pieces: [{ text: part, style: run.style }], spaces: [] });
            } else {
                append(words.at(-1)!.pieces, part, run.style);
            }
        }
    }

    const widthOf = (runs: TextRun[]) => runs.reduce((sum, run) => sum + measure(run.text, run.style), 0);
    const lines: TextRun[][] = [];
    let line: TextRun[] = [...leading];
    let lineWidth = widthOf(line);
    // The spaces after the line's last word - only drawn if another word follows on that line.
    let pendingSpaces: TextRun[] = [];
    let hasWord = false;

    for (const word of words) {
        const wordWidth = widthOf(word.pieces);
        const spacesWidth = widthOf(pendingSpaces);
        if (hasWord && lineWidth + spacesWidth + wordWidth > maxWidth) {
            lines.push(line);
            line = [];
            lineWidth = 0;
        } else {
            pendingSpaces.forEach(run => append(line, run.text, run.style));
            lineWidth += spacesWidth;
        }
        word.pieces.forEach(run => append(line, run.text, run.style));
        lineWidth += wordWidth;
        pendingSpaces = word.spaces;
        hasWord = true;
    }
    lines.push(line);
    return lines;
};
