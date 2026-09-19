import { Component, inject, OnInit, signal } from '@angular/core';
import { UIChart } from 'primeng/chart';
import { DashboardService } from './dashboard.service';
import { PaidAmountByClient } from '../../shared/models/dashboard';
import { formatPrice } from '../../shared/utils/display';

interface BarChartData {
  labels: string[];
  datasets: { label: string; data: number[]; backgroundColor: string }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [UIChart],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {

  private dashboardService = inject(DashboardService);

  paidByClient = signal<PaidAmountByClient[]>([]);
  chartData = signal<BarChartData | null>(null);

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
  }

  private clientName(row: PaidAmountByClient): string {
    return row.company_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  }

  // Reads PrimeNG's own current theme color instead of a hardcoded one, so
  // the bars stay on-brand whatever theme preset app.config.ts ends up
  // using - the same pattern PrimeNG's own chart demos use.
  private buildChartData(rows: PaidAmountByClient[]): BarChartData {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim() || '#3B82F6';

    return {
      labels: rows.map(row => this.clientName(row)),
      datasets: [{
        label: 'Montant payé',
        data: rows.map(row => row.total_paid),
        backgroundColor: primaryColor,
      }]
    };
  }
}
