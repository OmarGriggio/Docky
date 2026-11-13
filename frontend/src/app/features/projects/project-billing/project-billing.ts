import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { SelectButton } from 'primeng/selectbutton';
import { InputNumber } from 'primeng/inputnumber';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { ProjectService } from '../project.service';
import { Project } from '../../../shared/models/project';
import { ChantierBilling, ChantierInvoice } from '../../../shared/models/billing';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { documentStatusSeverity } from '../../../shared/utils/display';
import { NotificationService } from '../../../shared/services/notification.service';

type DepositMode = 'percent' | 'amount';

// A chantier's billing on its page: the accepted quote, what's been invoiced
// in deposits, paid, and what's left - its deposit invoices one by one - with
// "Facture d'acompte" at any time until the final invoice, then "Facture
// finale" once the chantier is completed (the same prefilled invoice the
// chantiers list's "Facturer" opens), or a link to it once there is one.
@Component({
  selector: 'app-project-billing',
  standalone: true,
  imports: [FormsModule, RouterLink, Card, Button, Dialog, Tag, SelectButton, InputNumber, PricePipe, AppDatePipe, TranslocoPipe],
  templateUrl: './project-billing.html',
})
export class ProjectBilling implements OnInit {

  private projectService = inject(ProjectService);
  private notifications = inject(NotificationService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);

  project = input.required<Project>();

  billing = signal<ChantierBilling | null>(null);

  canAddDeposit = computed(() => !!this.billing() && !this.billing()!.finalInvoice && this.project().is_active);
  canInvoiceFinal = computed(() => !!this.billing() && !this.billing()!.finalInvoice && this.project().status === 'COMPLETED');

  // "Facture d'acompte": a percentage of the quote's total incl. VAT (only
  // with a quote) or an amount incl. VAT.
  dialogVisible = signal(false);
  mode = signal<DepositMode>('percent');
  percent = signal<number | null>(30);
  amount = signal<number | null>(null);
  creating = signal(false);
  errorMessage = signal<string | null>(null);

  private percentLabel = translateSignal('projects.billing.byPercent');
  private amountLabel = translateSignal('projects.billing.byAmount');
  modeOptions = computed(() => [
    { label: this.percentLabel(), value: 'percent' },
    { label: this.amountLabel(), value: 'amount' },
  ]);

  // What the deposit will ask for, incl. VAT - the backend's own rounding.
  depositInclVat = computed(() => {
    const quote = this.billing()?.quoteInclVat ?? null;
    if (this.mode() === 'percent') {
      const percent = this.percent();
      return quote !== null && percent ? Math.round(quote * percent) / 100 : null;
    }
    return this.amount();
  });

  // Deposits sent or paid plus this one past the quote - allowed (extra work
  // happens), but worth a second look.
  exceedsQuote = computed(() => {
    const billing = this.billing();
    const total = this.depositInclVat();
    return !!billing && billing.quoteInclVat !== null && !!total && billing.invoicedInclVat + total > billing.quoteInclVat;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.projectService.getBilling(this.project().id).subscribe({
      next: billing => this.billing.set(billing),
      error: err => this.notifications.error('project-billing', err)
    });
  }

  statusLabel(invoice: ChantierInvoice): string {
    return invoice.status ? this.transloco.translate(`documents.status.${invoice.status}`) : '—';
  }

  statusSeverity(invoice: ChantierInvoice): 'secondary' | 'info' | 'success' | 'danger' {
    return invoice.status ? documentStatusSeverity(invoice.status) : 'secondary';
  }

  openDepositDialog(): void {
    // Without a quote, there's nothing to take a percentage of.
    this.mode.set(this.billing()?.quoteInclVat !== null ? 'percent' : 'amount');
    this.errorMessage.set(null);
    this.dialogVisible.set(true);
  }

  // Created as a draft and opened right away - to look it over, preview its
  // PDF and send it from there, like any invoice.
  createDeposit(): void {
    const body = this.mode() === 'percent' ? { percent: this.percent() } : { amount_incl_vat: this.amount() };
    if (!this.depositInclVat()) {
      this.errorMessage.set(this.transloco.translate('common.requiredFields'));
      return;
    }
    this.creating.set(true);
    this.projectService.createDepositInvoice(this.project().id, body).subscribe({
      next: deposit => {
        this.creating.set(false);
        this.dialogVisible.set(false);
        this.router.navigate(['/documents', deposit.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.creating.set(false);
        this.notifications.error('project-billing', err);
      }
    });
  }

  invoiceFinal(): void {
    this.router.navigate(['/documents/new'], { queryParams: { type: 'INVOICE', fromProject: this.project().id } });
  }
}
