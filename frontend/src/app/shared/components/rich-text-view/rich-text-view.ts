import { Component, computed, input } from '@angular/core';
import { DocumentColor, parseRichText } from '../../utils/rich-text';

/** The company's main (1) and secondary (2) document colors, `#rrggbb` - null when not set. */
export type DocumentColors = Record<DocumentColor, string | null>;

// A document text shown the way the PDF prints it: its [g]/[c1]/[f1]...
// passages bold, colored or on a band (shared/utils/rich-text.ts), a color
// the profile hasn't set left in black. `resolve` fills in the
// {{placeholders}} passage by passage - like the PDF, a value is never read
// as a tag. Plain text bindings only, never innerHTML.
@Component({
  selector: 'app-rich-text-view',
  standalone: true,
  template: `@for (run of runs(); track $index) {<span [class.font-semibold]="run.style.bold" [style.color]="colorOf(run.style.color)" [style.background-color]="colorOf(run.style.background)">{{ run.text }}</span>}`,
})
export class RichTextView {

  text = input('');
  colors = input<DocumentColors>({ 1: null, 2: null });
  resolve = input<(text: string) => string>(text => text);

  runs = computed(() => parseRichText(this.text()).map(run => ({ ...run, text: this.resolve()(run.text) })));

  colorOf(color: DocumentColor | null): string | null {
    return color ? this.colors()[color] : null;
  }

}
