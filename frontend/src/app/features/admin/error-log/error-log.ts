import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { ErrorLogService } from '../error-log.service';
import { ErrorGroup, ErrorGroupStatus } from '../../../shared/models/error-group';
import { AppDateTimePipe } from '../../../shared/pipes/app-date-time.pipe';
import { BreakpointService } from '../../../shared/services/breakpoint.service';

// The errors the app ran into, every company's, grouped - one row per
// distinct error with how often and when (see the backend's
// modules/error-log). Open ones by default; resolving one hides it until it
// happens again.
@Component({
  selector: 'app-error-log',
  standalone: true,
  imports: [TableModule, TagModule, Button, SelectButton, FormsModule, AppDateTimePipe],
  templateUrl: './error-log.html'
})
export class ErrorLogComponent implements OnInit {

  private errorLogService = inject(ErrorLogService);
  isMobile = inject(BreakpointService).isMobile;

  status = signal<ErrorGroupStatus>('open');
  statusOptions = [
    { label: 'Ouvertes', value: 'open' },
    { label: 'Résolues', value: 'resolved' },
    { label: 'Toutes', value: 'all' },
  ];

  errors = signal<ErrorGroup[]>([]);
  expandedRowKeys: Record<number, boolean> = {};

  ngOnInit(): void {
    this.load();
  }

  onStatusChange(status: ErrorGroupStatus): void {
    this.status.set(status);
    this.load();
  }

  toggleResolved(error: ErrorGroup): void {
    const request = error.resolved_at ? this.errorLogService.reopen(error.id) : this.errorLogService.resolve(error.id);
    request.subscribe({
      next: () => this.load(),
      error: err => console.error('error-log : ' + err)
    });
  }

  sourceLabel(error: ErrorGroup): string {
    return error.source === 'BACKEND' ? 'Serveur' : 'Navigateur';
  }

  private load(): void {
    this.errorLogService.getErrorGroups(this.status()).subscribe({
      next: data => this.errors.set(data),
      error: err => console.error('error-log : ' + err)
    });
  }

}
