import { Component, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { DocumentType } from '../../../../shared/models/document';
import { TabIndentDirective } from '../../../../shared/directives/tab-indent.directive';
import { DocumentTemplateService } from '../../document-template.service';

// The document's introduction or conclusion (one component, used for both):
// a read-only preview + "Modifier le texte" by default - clicking it swaps
// to an editable textarea, pre-filled with the *current* text (`draft`),
// independent of `text` until applied or saved. "Appliquer" only changes
// this document. "Sauvegarder" also overwrites the company's own default
// template of this field for every future document of this type - behind a
// confirm dialog, nothing is applied to this document either until it's
// confirmed. Cancelling (or never clicking either) discards the draft.
@Component({
  selector: 'app-document-text-block',
  standalone: true,
  imports: [FormsModule, Button, Textarea, ConfirmDialogComponent, TabIndentDirective],
  templateUrl: './document-text-block.html',
  host: { class: 'block' },
})
export class DocumentTextBlock {

  private documentTemplateService = inject(DocumentTemplateService);

  // The document's own text - two-way, the form saves it with the document.
  text = model('');
  field = input.required<'introduction' | 'conclusion'>();
  type = input.required<DocumentType>();
  placeholder = input('');
  // How the PDF will print a text ({{placeholders}} filled in) - shown in the
  // read-only preview. Passed in since it depends on the form's own values.
  resolve = input.required<(text: string) => string>();

  // Shown under the textarea - built here since a literal double brace in a
  // template is read as an interpolation.
  placeholdersHint = 'Variables : {{titre_client}}, {{date}}, {{montant}}, {{signature_entreprise}}';

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
    const noun = this.type() === 'INVOICE' ? 'factures' : 'offres';
    this.confirmMessage.set(
      `Ce texte deviendra le nouveau texte par défaut pour toutes les prochaines ${noun}. Continuer ?`
    );
    this.confirmVisible.set(true);
  }

  // Promotes the draft to be the new saved default of this field for this
  // document's type (QUOTE/INVOICE) - same PUT the settings page's "Modèles
  // de documents" uses, but only this field: the backend keeps whatever is
  // left out. Both this document's own text and the company-wide default
  // are only actually updated once this resolves - confirming the dialog is
  // what commits both together, never before.
  onConfirmed(): void {
    const draft = this.draft();
    const patch = this.field() === 'introduction' ? { introduction: draft } : { conclusion: draft };

    this.saving.set(true);
    this.saveError.set(null);

    this.documentTemplateService.upsertTemplate(this.type(), patch).subscribe({
      next: () => {
        this.text.set(draft);
        this.saving.set(false);
        this.editing.set(false);
      },
      error: err => {
        console.error('document-text-block : ' + err);
        this.saving.set(false);
        this.saveError.set('Impossible d\'enregistrer le modèle par défaut.');
      }
    });
  }

}
