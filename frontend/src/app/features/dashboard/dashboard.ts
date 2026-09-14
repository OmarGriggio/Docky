import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DashboardService } from './dashboard.service';
import { PaidAmountByClient } from '../../shared/models/dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TableModule, DecimalPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {

  private dashboardService = inject(DashboardService);

  paidByClient = signal<PaidAmountByClient[]>([]);

  ngOnInit(): void {
    this.dashboardService.getPaidAmountByClient().subscribe({
      next: data => this.paidByClient.set(data),
      error: err => console.error('dashboard : ' + err)
    });
  }

  clientName(row: PaidAmountByClient): string {
    return row.company_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  }
}
