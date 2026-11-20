// Styled passages in a document's introduction, conclusion or reminder text
// - the same tags the backend prints (backend/src/pdf/templates/rich-text.ts,
// keep both in sync): [g] bold, [c1]...[c5] the text in one of the
// template's palette colors, [f1]...[f5] a band of that color behind it. Here: reading
// them for the on-screen preview, and the toolbar's edits (wrapping a
// selection in a tag, taking the tags off it).

// A palette position, from 1.
export type DocumentColor = number;
export type StyleTag = 'g' | `c${number}` | `f${number}`;

export interface TextStyle {
  bold: boolean;
  color: DocumentColor | null;
  background: DocumentColor | null;
}

export interface TextRun {
  text: string;
  style: TextStyle;
}

const PLAIN: TextStyle = { bold: false, color: null, background: null };
const TAG = /\[(\/?)(g|c[1-5]|f[1-5])\]/gi;

const sameStyle = (a: TextStyle, b: TextStyle) =>
  a.bold === b.bold && a.color === b.color && a.background === b.background;

const styleOf = (open: string[]): TextStyle => {
  let style: TextStyle = { ...PLAIN };
  for (const tag of open) {
    if (tag === 'g') style = { ...style, bold: true };
    if (tag[0] === 'c') style = { ...style, color: Number(tag[1]) };
    if (tag[0] === 'f') style = { ...style, background: Number(tag[1]) };
  }
  return style;
};

const append = (runs: TextRun[], text: string, style: TextStyle) => {
  if (!text) return;
  const last = runs.at(-1);
  if (last && sameStyle(last.style, style)) {
    last.text += text;
  } else {
    runs.push({ text, style });
  }
};

/** `text` as runs of one style each, the tags taken out - a closing tag nothing opened stays as typed, an unclosed one runs to the end (like the PDF). */
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
      append(runs, match[0], styleOf(open));
    }
    index = match.index + match[0].length;
  }
  append(runs, text.slice(index), styleOf(open));
  return runs;
};

export interface TextEdit {
  text: string;
  // The selection once edited.
  start: number;
  end: number;
}

/** The selection wrapped in `tag`, still selected (inside the tags) - or, with nothing selected, an empty pair with the cursor between them, to type into. */
export const wrapSelection = (text: string, start: number, end: number, tag: StyleTag): TextEdit => {
  const open = `[${tag}]`;
  const wrapped = `${text.slice(0, start)}${open}${text.slice(start, end)}[/${tag}]${text.slice(end)}`;
  return { text: wrapped, start: start + open.length, end: end + open.length };
};

const TAG_BEFORE = /\[\/?(?:g|c[1-5]|f[1-5])\]$/i;
const TAG_AFTER = /^\[\/?(?:g|c[1-5]|f[1-5])\]/i;

/**
 * Every tag in the selection taken out - and the ones right around it, so
 * selecting just the words of "[g]Merci[/g]" clears it too. Nothing
 * selected: nothing changes.
 */
export const clearStyles = (text: string, start: number, end: number): TextEdit => {
  if (start === end) {
    return { text, start, end };
  }
  let from = start;
  let to = end;
  for (let match = TAG_BEFORE.exec(text.slice(0, from)); match; match = TAG_BEFORE.exec(text.slice(0, from))) {
    from -= match[0].length;
  }
  for (let match = TAG_AFTER.exec(text.slice(to)); match; match = TAG_AFTER.exec(text.slice(to))) {
    to += match[0].length;
  }
  const cleared = text.slice(from, to).replace(TAG, '');
  return { text: text.slice(0, from) + cleared + text.slice(to), start: from, end: from + cleared.length };
};
