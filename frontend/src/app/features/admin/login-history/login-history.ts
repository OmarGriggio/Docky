import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { LoginHistoryService } from '../login-history.service';
import { LoginHistoryEntry } from '../../../shared/models/login-history';
import { AppDateTimePipe } from '../../../shared/pipes/app-date-time.pipe';

@Component({
  selector: 'app-login-history',
  standalone: true,
  imports: [TableModule, TagModule, AppDateTimePipe],
  templateUrl: './login-history.html'
})
export class LoginHistoryComponent implements OnInit {

  private loginHistoryService = inject(LoginHistoryService);

  entries = signal<LoginHistoryEntry[]>([]);

  ngOnInit(): void {
    this.loginHistoryService.getLoginHistory().subscribe({
      next: data => this.entries.set(data),
      error: err => console.error('login-history : ' + err)
    });
  }

  // A failed attempt against an unknown email never resolves to a user
  // (user_id is null) - the email that was actually typed is shown instead.
  userName(entry: LoginHistoryEntry): string {
    if (!entry.user_id) {
      return '—';
    }
    return `${entry.first_name ?? ''} ${entry.last_name ?? ''}`.trim() || entry.email;
  }

}
