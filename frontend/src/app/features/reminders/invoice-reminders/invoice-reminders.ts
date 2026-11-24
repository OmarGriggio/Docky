import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ReminderService } from '../reminder.service';
import { InvoiceReminder, InvoiceReminders, reminderLevelKey } from '../../../shared/models/reminder';
import { NotificationService } from '../../../shared/services/notification.service';
import { PermissionService } from '../../../shared/services/permission.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { qrBillErrorKey } from '../../../shared/utils/api-error';

// Today as YYYY-MM-DD, in local time - what a reminder's due date compares to.
const today = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// An invoice's payment reminders, in a dialog (the documents list's ⋮, the
// invoice form, the dashboard's "Factures à relancer"): the ones sent - each
// PDF as it went out, the latest can be taken back - and the next one, with
// the day it's due and its fees, previewed or sent ("Envoyer le 2e rappel":
// recorded, then its PDF opened to print or attach). Which level is next is
// the server's to say (reminder.service.ts).
@Component({
  selector: 'app-invoice-reminders',
  standalone: true,
  imports: [Dialog, Button, TranslocoPipe, ConfirmDialogComponent, AppDatePipe, PricePipe],
  templateUrl: './invoice-reminders.html',
})
export class InvoiceRemindersDialog {

  private reminderService = inject(ReminderService);
  private notifications = inject(NotificationService);
  private transloco = inject(TranslocoService);
  private permissions = inject(PermissionService);

  visible = model(false);
  documentId = input<number | null>(null);
  documentNumber = input('');
  // A reminder sent or taken back - the page around it reloads what it shows.
  changed = output<void>();

  canWrite = computed(() => this.permissions.can('invoices', 'WRITE'));
  state = signal<InvoiceReminders | null>(null);
  loading = signal(false);
  sending = signal(false);
  pdfError = signal<string | null>(null);

  readonly levelKey = reminderLevelKey;
  isDue = computed(() => {
    const next = this.state()?.next;
    return !!next && next.due_on <= today();
  });

  confirmSendVisible = signal(false);
  confirmDeleteVisible = signal(false);
  private toDelete: InvoiceReminder | null = null;

  constructor() {
    // Loaded each time it opens - it may have changed since.
    effect(() => {
      if (this.visible() && this.documentId() !== null) {
        untracked(() => this.load());
      }
    });
  }

  private load(): void {
    const id = this.documentId();
    if (id === null) {
      return;
    }
    this.loading.set(true);
    this.pdfError.set(null);
    this.reminderService.getInvoiceReminders(id).subscribe({
      next: state => {
        this.state.set(state);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notifications.error('invoice-reminders', err);
      },
    });
  }

  sendLabel = computed(() => {
    const next = this.state()?.next;
    // One wording per level ("le 1er rappel", "la mise en demeure").
    return next ? this.transloco.translate(`reminders.dialog.sendLevel.${next.level}`) : '';
  });

  send(): void {
    const id = this.documentId();
    if (id === null) {
      return;
    }
    this.sending.set(true);
    this.reminderService.sendReminder(id).subscribe({
      next: reminder => {
        this.sending.set(false);
        this.notifications.success('reminders.dialog.sent', { level: this.transloco.translate(reminderLevelKey(reminder.level)) });
        this.changed.emit();
        this.load();
        this.openPdf(this.reminderService.getPdf(id, reminder.level));
      },
      error: err => {
        this.sending.set(false);
        this.notifications.error('invoice-reminders', err);
        this.load();
      },
    });
  }

  askDelete(reminder: InvoiceReminder): void {
    this.toDelete = reminder;
    this.confirmDeleteVisible.set(true);
  }

  deleteConfirmed(): void {
    const reminder = this.toDelete;
    if (!reminder) {
      return;
    }
    this.reminderService.deleteReminder(reminder.id).subscribe({
      next: () => {
        this.changed.emit();
        this.load();
      },
      error: err => this.notifications.error('invoice-reminders', err),
    });
  }

  showSent(reminder: InvoiceReminder): void {
    this.openPdf(this.reminderService.getPdf(reminder.document_id, reminder.level));
  }

  preview(): void {
    const id = this.documentId();
    if (id !== null) {
      this.openPdf(this.reminderService.getPdf(id));
    }
  }

  // A PDF the profile can't make yet (no IBAN...) says what's missing.
  private openPdf(pdf$: Observable<Blob>): void {
    this.pdfError.set(null);
    pdf$.subscribe({
      next: blob => window.open(window.URL.createObjectURL(blob), '_blank'),
      error: async err => this.pdfError.set(this.transloco.translate(await qrBillErrorKey(err, 'documents.pdfError'))),
    });
  }
}
