import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DocumentFont, DocumentLayout } from '../../models/company';

// The company's document template as cards to pick: its two layouts
// sketched in miniature (the modern one's table header in the main color)
// and its three fonts, each with a sample in a family that looks alike (the
// browser has none of the embedded ones - see the backend's pdf-fonts.ts).
// Presentational only - the page owning it saves the choice: the profile's
// form, or the document form's "Modèle" panel (`compact`: smaller cards, no
// descriptions).
@Component({
  selector: 'app-document-style-picker',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './document-style-picker.html',
})
export class DocumentStylePicker {

  layout = input.required<DocumentLayout>();
  font = input.required<DocumentFont>();
  // "#rrggbb" - the modern sketch's table header, dark gray without one.
  accentColor = input<string | null>(null);
  disabled = input(false);
  compact = input(false);

  layoutChange = output<DocumentLayout>();
  fontChange = output<DocumentFont>();

  readonly layoutOptions: { value: DocumentLayout; label: string; hint: string }[] = [
    { value: 'CLASSIC', label: 'profile.documentStyle.classic', hint: 'profile.documentStyle.classicHint' },
    { value: 'MODERN', label: 'profile.documentStyle.modern', hint: 'profile.documentStyle.modernHint' },
  ];
  readonly fontOptions: { value: DocumentFont; label: string; hint: string; family: string }[] = [
    { value: 'HELVETICA', label: 'Helvetica', hint: 'profile.documentStyle.helveticaHint', family: 'Helvetica, Arial, sans-serif' },
    { value: 'LATO', label: 'Lato', hint: 'profile.documentStyle.latoHint', family: '"Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
    { value: 'PT_SERIF', label: 'PT Serif', hint: 'profile.documentStyle.ptSerifHint', family: 'Georgia, "Times New Roman", serif' },
  ];

  pickLayout(layout: DocumentLayout): void {
    if (!this.disabled() && layout !== this.layout()) {
      this.layoutChange.emit(layout);
    }
  }

  pickFont(font: DocumentFont): void {
    if (!this.disabled() && font !== this.font()) {
      this.fontChange.emit(font);
    }
  }
}
