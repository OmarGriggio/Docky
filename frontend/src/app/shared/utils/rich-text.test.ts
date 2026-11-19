import { describe, expect, it } from 'vitest';
import { clearStyles, parseRichText, wrapSelection } from './rich-text';

const plain = { bold: false, color: null, background: null };

describe('parseRichText', () => {
  it('reads bold, colors and bands, nested', () => {
    expect(parseRichText('a[f1][g]b[/g][c2]c[/c2][/f1]')).toEqual([
      { text: 'a', style: plain },
      { text: 'b', style: { bold: true, color: null, background: 1 } },
      { text: 'c', style: { bold: false, color: 2, background: 1 } },
    ]);
  });

  it('keeps a closing tag nothing opened as typed, runs an unclosed one to the end', () => {
    expect(parseRichText('a[/c1]b')).toEqual([{ text: 'a[/c1]b', style: plain }]);
    expect(parseRichText('a[G]b')).toEqual([{ text: 'a', style: plain }, { text: 'b', style: { ...plain, bold: true } }]);
  });
});

describe('wrapSelection', () => {
  it('wraps the selection, still selected inside the tags', () => {
    expect(wrapSelection('Merci beaucoup', 0, 5, 'g')).toEqual({ text: '[g]Merci[/g] beaucoup', start: 3, end: 8 });
  });

  it('puts the cursor between an empty pair when nothing is selected', () => {
    expect(wrapSelection('ab', 1, 1, 'f2')).toEqual({ text: 'a[f2][/f2]b', start: 5, end: 5 });
  });
});

describe('clearStyles', () => {
  it('takes out the tags in the selection and right around it', () => {
    expect(clearStyles('[g]Merci[/g] beaucoup', 3, 8)).toEqual({ text: 'Merci beaucoup', start: 0, end: 5 });
    expect(clearStyles('a [f1][c1]b[/c1][/f1] c', 10, 11)).toEqual({ text: 'a b c', start: 2, end: 3 });
  });

  it('clears every tag inside a wider selection, the rest untouched', () => {
    expect(clearStyles('[g]a[/g] [c2]b[/c2] [g]c[/g]', 0, 19)).toEqual({ text: 'a b [g]c[/g]', start: 0, end: 3 });
  });

  it('changes nothing without a selection', () => {
    expect(clearStyles('[g]a[/g]', 4, 4)).toEqual({ text: '[g]a[/g]', start: 4, end: 4 });
  });
});
