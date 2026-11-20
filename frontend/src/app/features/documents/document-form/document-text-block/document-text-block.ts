import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { DocumentType } from '../../../../shared/models/document';
import { TabIndentDirective } from '../../../../shared/directives/tab-indent.directive';
import { DOCUMENT_PLACEHOLDERS, placeholderToken } from '../../../../shared/utils/display';
import { HelpButton } from '../../../../shared/components/help-button/help-button';
import { TemplateService } from '../../../settings/templates/template.service';
import { Template } from '../../../../shared/models/template';
import { TextStyleToolbar } from '../../../../shared/components/text-style-toolbar/text-style-toolbar';
import { DocumentColors, RichTextView } from '../../../../shared/components/rich-text-view/rich-text-view';

// The document's introduction or conclusion (one component, used for both):
// a read-only preview + "Modifier le texte" by default - clicking it swaps
// to an editable textarea, pre-filled with the *current* text (`draft`),
// independent of `text` until applied or saved. "Appliquer" only changes
// this document. "Sauvegarder" (an admin's) also writes it into the
// document's template, this type's text there - every future document
// started from that template - behind a confirm dialog, nothing is applied
// to this document either until it's confirmed. Cancelling (or never
// clicking either) discards the draft.
@Component({
  selector: 'app-document-text-block',
  standalone: true,
  imports: [FormsModule, Button, Textarea, ConfirmDialogComponent, TabIndentDirective, TranslocoPipe, TextStyleToolbar, RichTextView, HelpButton],
  templateUrl: './document-text-block.html',
  host: { class: 'block' },
})
export class DocumentTextBlock {

  private templateService = inject(TemplateService);
  private transloco = inject(TranslocoService);

  // The document's own text - two-way, the form saves it with the document.
  text = model('');
  field = input.required<'introduction' | 'conclusion'>();
  type = input.required<DocumentType>();
  placeholder = input('');
  // A document that can no longer be edited: just the text, no editor and
  // no "Modifier le texte" link.
  locked = input(false);
  // How the PDF will print a text ({{placeholders}} filled in) - shown in the
  // read-only preview. Passed in since it depends on the form's own values.
  resolve = input.required<(text: string) => string>();
  // The company's two document colors - the toolbar's swatches and the
  // preview's styled passages ([c1], [f2]... see shared/utils/rich-text.ts).
  colors = input<DocumentColors>([]);
  // The document's template - "Sauvegarder" writes into it (null: no button).
  template = input<Template | null>(null);
  // The template as saved - the form's own copy follows.
  templateSaved = output<Template>();

  // Shown under the textarea - built here since a literal double brace in a
  // template is read as an interpolation. The {{tokens}} themselves are
  // fixed printed content, not translated (same convention as
  // document-templates.html's own placeholder list) - and critically can't
  // be put through the transloco pipe/translate() as part of one string
  // either: Transloco's own interpolation syntax is {{param}} too, so an
  // unrecognized {{titre_client}} inside a *translated* value would be
  // silently swallowed by its transpiler, not left as literal text.
  // Each named in the UI's language ({{montant}} / {{amount}} - both work).
  private placeholdersHintPrefix = translateSignal('documents.textBlock.placeholdersHint');
  placeholdersHint = computed(() =>
    `${this.placeholdersHintPrefix()} ${['titre_client', 'date', 'montant', 'signature_entreprise'].map(name => placeholderToken(name, this.transloco.activeLang())).join(', ')}`
  );

  // Every variable, behind the hint's "?" - the hint itself names the usual four.
  allPlaceholders = computed(() => DOCUMENT_PLACEHOLDERS.map(([name, label]) => ({
    token: placeholderToken(name, this.transloco.activeLang()), label: `documentTemplates.placeholders.${label}`,
  })));

  editing = signal(false);
  draft = signal('');

  saving = signal(false);
  saveError = signal<string | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  startEdit(): void {
    this.draft.set(this.text());
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  // "Appliquer" - unlike confirmSave below, only affects this document (no
  // API call, no confirmation): the draft becomes this document's own text
  // and the field goes back to read-only, nothing is promoted to the
  // company's own default template.
  apply(): void {
    this.text.set(this.draft());
    this.editing.set(false);
  }

  confirmSave(): void {
    const template = this.template();
    if (!template) {
      return;
    }
    // nav.invoices/nav.quotes are capitalized (nav-bar labels) - lowercased
    // here, this is mid-sentence.
    const noun = this.transloco.translate(this.type() === 'INVOICE' ? 'nav.invoices' : 'nav.quotes').toLowerCase();
    this.confirmMessage.set(this.transloco.translate('documents.textBlock.saveDefaultMessage', { noun, template: template.name }));
    this.confirmVisible.set(true);
  }

  // Writes the draft into the document's template - this type's text there,
  // the backend keeping the rest of it. This document's own text and the
  // template are only updated once this resolves - confirming the dialog is
  // what commits both together, never before.
  onConfirmed(): void {
    const template = this.template();
    if (!template) {
      return;
    }
    const draft = this.draft();
    const field = `${this.type() === 'QUOTE' ? 'quote' : 'invoice'}_${this.field()}` as const;

    this.saving.set(true);
    this.saveError.set(null);

    this.templateService.updateTemplate(template.id, { [field]: draft }).subscribe({
      next: saved => {
        this.text.set(draft);
        this.saving.set(false);
        this.editing.set(false);
        this.templateSaved.emit(saved);
      },
      error: err => {
        console.error('document-text-block : ' + err);
        this.saving.set(false);
        this.saveError.set(this.transloco.translate('documents.textBlock.saveError'));
      }
    });
  }

}
