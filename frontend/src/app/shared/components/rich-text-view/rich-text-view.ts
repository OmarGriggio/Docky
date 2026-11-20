import { Component, computed, input } from '@angular/core';
import { DocumentColor, parseRichText } from '../../utils/rich-text';
import { PaletteColor } from '../../models/template';

/** A template's palette - what a text's [c1]...[c5] and [f1]...[f5] stand for. */
export type DocumentColors = PaletteColor[];

// A document text shown the way the PDF prints it: its [g]/[c1]/[f1]...
// passages bold, colored or on a band (shared/utils/rich-text.ts), a color
// the palette doesn't have left in the text's own color. `resolve` fills in
// the {{placeholders}} passage by passage - like the PDF, a value is never
// read as a tag. Plain text bindings only, never innerHTML.
@Component({
  selector: 'app-rich-text-view',
  standalone: true,
  template: `@for (run of runs(); track $index) {<span [class.font-semibold]="run.style.bold" [style.color]="colorOf(run.style.color)" [style.background-color]="bandOf(run.style.background)">{{ run.text }}</span>}`,
})
export class RichTextView {

  text = input('');
  colors = input<DocumentColors>([]);
  resolve = input<(text: string) => string>(text => text);

  runs = computed(() => parseRichText(this.text()).map(run => ({ ...run, text: this.resolve()(run.text) })));

  colorOf(position: DocumentColor | null): string | null {
    return position ? this.colors()[position - 1]?.color ?? null : null;
  }

  // Lightened like the PDF's (its TEXT_BAND_TINT): 30 % of the color, the rest white.
  bandOf(position: DocumentColor | null): string | null {
    const color = this.colorOf(position);
    return color ? `color-mix(in srgb, ${color} 30%, white)` : null;
  }

}
