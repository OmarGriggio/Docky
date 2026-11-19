import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { NumberedType, NumberingService } from './numbering.service';

// Each type's section title.
const TYPE_LABELS: Record<NumberedType, string> = {
  QUOTE: 'settings.numbering.quotes',
  INVOICE: 'settings.numbering.invoices',
  CLIENT: 'settings.numbering.clients',
  MATERIAL: 'settings.numbering.materials',
  SERVICE: 'settings.numbering.services',
};

interface NumberingDraft {
  type: NumberedType;
  format: string;
  start: number | null;
  // The live preview - the next number, or the reason the format isn't one.
  preview: string | null;
  errorKey: string | null;
  // As stored - only a type changed since is saved again (a start number
  // saved again would apply to the current year again, see the backend).
  savedFormat: string;
  savedStart: number | null;
}

const PREVIEW_DELAY = 300;

// Paramètres > Numérotation: how the company's quotes, invoices, clients and
// resources are numbered (the backend's numbering.service.ts) - a format with
// the year and the sequence as tokens, and the number it starts from, for a
// company moving to Docky that continues its own series. The next number is
// previewed as it's typed. An admin's to change, like the profile.
@Component({
  selector: 'app-numbering',
  standalone: true,
  imports: [FormsModule, Card, Button, InputText, InputNumber, TranslocoPipe],
  templateUrl: './numbering.html',
})
export class Numbering implements OnInit {

  private numberingService = inject(NumberingService);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);
  private transloco = inject(TranslocoService);

  canEdit = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());

  loading = signal(true);
  saving = signal(false);
  drafts = signal<NumberingDraft[]>([]);
  hasError = computed(() => this.drafts().some(draft => draft.errorKey !== null));

  readonly tokens = [
    { token: '{YYYY}', label: 'settings.numbering.tokenYear' },
    { token: '{YY}', label: 'settings.numbering.tokenShortYear' },
    { token: '{NNNN}', label: 'settings.numbering.tokenSequence' },
  ];

  private previewTimers = new Map<NumberedType, ReturnType<typeof setTimeout>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.previewTimers.forEach(timer => clearTimeout(timer)));
  }

  ngOnInit(): void {
    this.numberingService.getNumbering().subscribe({
      next: numbering => {
        this.drafts.set(numbering.map(item => ({
          type: item.type,
          format: item.number_format,
          start: item.start_number,
          preview: item.next_number,
          errorKey: null,
          savedFormat: item.number_format,
          savedStart: item.start_number,
        })));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notifications.error('numbering', err);
      }
    });
  }

  yearly(draft: NumberingDraft): boolean {
    return /\{YY(YY)?\}/.test(draft.format);
  }

  update(type: NumberedType, patch: Partial<Pick<NumberingDraft, 'format' | 'start'>>): void {
    this.drafts.update(drafts => drafts.map(draft => draft.type === type ? { ...draft, ...patch } : draft));
    this.schedulePreview(type);
  }

  // A token at the cursor of that type's format field, or at its end.
  insertToken(type: NumberedType, token: string, input: HTMLInputElement): void {
    const at = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? at;
    const format = input.value.slice(0, at) + token + input.value.slice(end);
    this.update(type, { format });
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(at + token.length, at + token.length);
    });
  }

  private schedulePreview(type: NumberedType): void {
    clearTimeout(this.previewTimers.get(type));
    this.previewTimers.set(type, setTimeout(() => this.refreshPreview(type), PREVIEW_DELAY));
  }

  private refreshPreview(type: NumberedType): void {
    const draft = this.drafts().find(item => item.type === type);
    if (!draft) {
      return;
    }
    this.numberingService.preview(type, { number_format: draft.format, start_number: draft.start }).subscribe({
      next: ({ next_number }) => this.setPreview(type, draft, next_number, null),
      error: err => this.setPreview(type, draft, null, this.errorKeyOf(err)),
    });
  }

  // Only if the draft hasn't changed since - an older answer arriving late
  // doesn't overwrite a newer one.
  private setPreview(type: NumberedType, sent: NumberingDraft, preview: string | null, errorKey: string | null): void {
    this.drafts.update(drafts => drafts.map(draft =>
      draft.type === type && draft.format === sent.format && draft.start === sent.start ? { ...draft, preview, errorKey } : draft
    ));
  }

  private errorKeyOf(err: unknown): string {
    const code = err instanceof HttpErrorResponse ? (err.error as { code?: unknown } | null)?.code : null;
    return typeof code === 'string' && code.startsWith('NUMBER_') ? `settings.numbering.errors.${code}` : 'settings.numbering.errors.generic';
  }

  async save(): Promise<void> {
    if (!this.canEdit() || this.hasError()) {
      return;
    }
    this.saving.set(true);
    try {
      const changed = this.drafts().filter(draft => draft.format !== draft.savedFormat || draft.start !== draft.savedStart);
      for (const draft of changed) {
        const saved = await firstValueFrom(this.numberingService.updateNumbering(draft.type, { number_format: draft.format, start_number: draft.start }));
        this.drafts.update(drafts => drafts.map(item => item.type === saved.type
          ? {
            type: saved.type, format: saved.number_format, start: saved.start_number, preview: saved.next_number, errorKey: null,
            savedFormat: saved.number_format, savedStart: saved.start_number,
          }
          : item));
      }
      this.notifications.success('settings.numbering.saved');
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? (err.error as { code?: unknown } | null)?.code : null;
      if (typeof code === 'string' && code.startsWith('NUMBER_')) {
        this.notifications.warn(`settings.numbering.errors.${code}`);
      } else {
        this.notifications.error('numbering', err);
      }
    } finally {
      this.saving.set(false);
    }
  }

  typeLabel(type: NumberedType): string {
    return this.transloco.translate(TYPE_LABELS[type]);
  }

}
