import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Select } from 'primeng/select';
import { LoginHistoryService } from '../login-history.service';
import { LoginHistoryEntry, LoginHistoryUser } from '../../../shared/models/login-history';
import { AppDateTimePipe } from '../../../shared/pipes/app-date-time.pipe';
import { BreakpointService } from '../../../shared/services/breakpoint.service';

@Component({
  selector: 'app-login-history',
  standalone: true,
  imports: [TableModule, TagModule, Select, FormsModule, AppDateTimePipe],
  templateUrl: './login-history.html'
})
export class LoginHistoryComponent implements OnInit {

  private loginHistoryService = inject(LoginHistoryService);
  isMobile = inject(BreakpointService).isMobile;

  entries = signal<LoginHistoryEntry[]>([]);

  // Filtered server-side (not just among the entries already loaded): the
  // list is capped at the latest 100, a given user's older attempts would
  // otherwise never show up. null: every user.
  selectedUserId = signal<number | null>(null);
  private users = signal<LoginHistoryUser[]>([]);

  userOptions = computed(() => [
    { label: 'Tous les utilisateurs', value: null },
    ...this.users().map(user => ({
      label: `${`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email} · ${user.company_name}`,
      value: user.id,
    })),
  ]);

  ngOnInit(): void {
    this.loadEntries();
    this.loginHistoryService.getLoginHistoryUsers().subscribe({
      next: data => this.users.set(data),
      error: err => console.error('login-history : ' + err)
    });
  }

  onUserChange(userId: number | null): void {
    this.selectedUserId.set(userId);
    this.loadEntries();
  }

  // The previous request is dropped when another user is picked before it
  // answers - otherwise a slow earlier answer could land last and show
  // another user's attempts under the one now selected.
  private entriesRequest?: Subscription;

  private loadEntries(): void {
    this.entriesRequest?.unsubscribe();
    this.entriesRequest = this.loginHistoryService.getLoginHistory(this.selectedUserId()).subscribe({
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
