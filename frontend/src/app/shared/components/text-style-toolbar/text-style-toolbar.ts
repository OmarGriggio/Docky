import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DocumentColors } from '../rich-text-view/rich-text-view';
import { StyleTag, TextEdit, clearStyles, wrapSelection } from '../../utils/rich-text';

// Above a document text's textarea (an introduction, a conclusion, the
// reminder's text): select a passage, click - bold, the text in the
// company's main or secondary color, or a band of that color behind it
// (the [g]/[c1]/[f1]... tags the PDF prints, see shared/utils/rich-text.ts),
// or the eraser to take the styles off. Works on any textarea, ngModel or
// reactive form alike: the edit goes through the textarea itself, then an
// input event (like TabIndentDirective). A color the profile hasn't set is
// greyed out - it would print in black.
@Component({
  selector: 'app-text-style-toolbar',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './text-style-toolbar.html',
})
export class TextStyleToolbar {

  target = input.required<HTMLTextAreaElement>();
  colors = input<DocumentColors>({ 1: null, 2: null });

  // One text color and one band per document color.
  readonly swatches = [
    { color: 1, text: 'c1', band: 'f1' },
    { color: 2, text: 'c2', band: 'f2' },
  ] as const;

  colorOf(color: 1 | 2): string | null {
    return this.colors()[color];
  }

  style(tag: StyleTag): void {
    this.edit((text, start, end) => wrapSelection(text, start, end, tag));
  }

  clear(): void {
    this.edit(clearStyles);
  }

  private edit(change: (text: string, start: number, end: number) => TextEdit): void {
    const textarea = this.target();
    const edited = change(textarea.value, textarea.selectionStart, textarea.selectionEnd);
    if (edited.text !== textarea.value) {
      textarea.setRangeText(edited.text, 0, textarea.value.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    textarea.focus();
    textarea.setSelectionRange(edited.start, edited.end);
  }

}
