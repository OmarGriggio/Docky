import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DocumentColors } from '../rich-text-view/rich-text-view';
import { StyleTag, TextEdit, clearStyles, wrapSelection } from '../../utils/rich-text';

// Above a document text's textarea (an introduction, a conclusion, the
// reminder's text): select a passage, click - bold, the text in one of the
// template's palette colors, or a band of that color behind it (the
// [g]/[c1]/[f1]... tags the PDF prints, see shared/utils/rich-text.ts), or the
// eraser to take the styles off. Works on any textarea, ngModel or reactive
// form alike: the edit goes through the textarea itself, then an input event
// (like TabIndentDirective). Without a palette, only bold.
@Component({
  selector: 'app-text-style-toolbar',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './text-style-toolbar.html',
})
export class TextStyleToolbar {

  target = input.required<HTMLTextAreaElement>();
  // The template's palette - one text color and one band per color.
  colors = input<DocumentColors>([]);

  style(tag: StyleTag | string): void {
    this.edit((text, start, end) => wrapSelection(text, start, end, tag as StyleTag));
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
