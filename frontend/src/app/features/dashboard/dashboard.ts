import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UIChart } from 'primeng/chart';
import { Tag } from 'primeng/tag';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DashboardService } from './dashboard.service';
import { OpenInvoice, PaidAmountByClient, ProjectInProgress } from '../../shared/models/dashboard';
import { clientDisplayName, daysFromToday, formatPrice, formatSectionDate, fromDateOnly } from '../../shared/utils/display';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { BreakpointService } from '../../shared/services/breakpoint.service';

// How an open invoice's due date reads in the "to be paid" table: a
// translation key, its {{days}}, and the tag's color.
interface DueStatus {
  key: string;
  days: number;
  severity: 'danger' | 'warn' | 'info' | 'secondary';
}

// An invoice due within this many days is flagged (amber) before it's late.
const DUE_SOON_DAYS = 7;

interface BarChartData {
  labels: string[];
  datasets: { label: string; data: number[]; backgroundColor: string }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [UIChart, Tag, RouterLink, PricePipe, TranslocoPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {

  private dashboardService = inject(DashboardService);
  private transloco = inject(TranslocoService);

  isMobile = inject(BreakpointService).isMobile;

  paidByClient = signal<PaidAmountByClient[]>([]);
  chartData = signal<BarChartData | null>(null);
  // Sent invoices still waiting for their payment, overdue first, and what
  // they add up to (the table's last line) - then the ongoing chantiers.
  openInvoiceRows = signal<OpenInvoice[]>([]);
  openTotal = computed(() =>
    Math.round(this.openInvoiceRows().reduce((sum, invoice) => sum + invoice.amount_incl_vat, 0) * 100) / 100
  );
  projectsInProgress = signal<ProjectInProgress[]>([]);

  readonly formatSectionDate = formatSectionDate;

  // An invoice's date/due date is a calendar day (a DATE column), not an
  // instant - read as such, or it shows the time zone's shift as an hour.
  formatDay(value: string): string {
    return formatSectionDate(fromDateOnly(value));
  }

  // Formats each bar's tooltip the same way the rest of the app shows a
  // money amount (formatPrice - "1234.50 CHF").
  chartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { raw: number }) => `${formatPrice(context.raw)} CHF`
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  ngOnInit(): void {
    this.dashboardService.getPaidAmountByClient().subscribe({
      next: data => {
        this.paidByClient.set(data);
        this.chartData.set(this.buildChartData(data));
      },
      error: err => console.error('dashboard : ' + err)
    });

    this.dashboardService.getOpenInvoices().subscribe({
      next: data => this.openInvoiceRows.set(data),
      error: err => console.error('dashboard : ' + err)
    });

    this.dashboardService.getProjectsInProgress().subscribe({
      next: data => this.projectsInProgress.set(data),
      error: err => console.error('dashboard : ' + err)
    });
  }

  // A document made out to the "Non défini" client shows the recipient
  // typed on it, or the placeholder's translated name when grouped (the
  // paid-by-client chart has no single recipient to show).
  clientName(row: PaidAmountByClient | OpenInvoice | ProjectInProgress): string {
    if (row.is_placeholder) {
      return ('recipient_name' in row && row.recipient_name) || this.transloco.translate('clients.placeholderName');
    }
    return clientDisplayName(row);
  }

  dueStatus(invoice: OpenInvoice): DueStatus {
    if (!invoice.due_date) {
      return { key: 'dashboard.noDueDate', days: 0, severity: 'secondary' };
    }
    const days = daysFromToday(invoice.due_date);
    if (days < 0) {
      return { key: days === -1 ? 'dashboard.lateOneDay' : 'dashboard.lateDays', days: -days, severity: 'danger' };
    }
    if (days === 0) {
      return { key: 'dashboard.dueToday', days, severity: 'warn' };
    }
    return { key: days === 1 ? 'dashboard.dueInOneDay' : 'dashboard.dueInDays', days, severity: days <= DUE_SOON_DAYS ? 'warn' : 'info' };
  }

  // Reads PrimeNG's own current theme color instead of a hardcoded one, so
  // the bars stay on-brand whatever theme preset app.config.ts ends up
  // using - the same pattern PrimeNG's own chart demos use.
  private buildChartData(rows: PaidAmountByClient[]): BarChartData {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim() || '#3B82F6';

    return {
      labels: rows.map(row => this.clientName(row)),
      datasets: [{
        label: this.transloco.translate('dashboard.paidAmount'),
        data: rows.map(row => row.total_paid),
        backgroundColor: primaryColor,
      }]
    };
  }
}
