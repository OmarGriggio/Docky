import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { InvoiceReminder, InvoiceReminders, InvoiceToRemind, ReminderLevel, ReminderLevelSettings } from '../../shared/models/reminder';

const API_BASE = environment.apiUrl;

// Payment reminders: the company's levels (Paramètres > Rappels), each
// invoice's reminders, the dashboard's invoices to remind.
@Injectable({ providedIn: 'root' })
export class ReminderService {

  private http = inject(HttpClient);

  getSettings() {
    return this.http.get<ReminderLevelSettings[]>(`${API_BASE}/reminder/settings`);
  }

  updateSettings(levels: ReminderLevelSettings[]) {
    return this.http.put<ReminderLevelSettings[]>(`${API_BASE}/reminder/settings`, { levels });
  }

  getInvoiceReminders(documentId: number) {
    return this.http.get<InvoiceReminders>(`${API_BASE}/reminder/document/${documentId}`);
  }

  // The next level - the server decides which.
  sendReminder(documentId: number) {
    return this.http.post<InvoiceReminder>(`${API_BASE}/reminder/document/${documentId}`, {});
  }

  // Only the latest of its invoice.
  deleteReminder(id: number) {
    return this.http.delete<void>(`${API_BASE}/reminder/${id}`);
  }

  getInvoicesToRemind() {
    return this.http.get<InvoiceToRemind[]>(`${API_BASE}/reminder/to-send`);
  }

  // A reminder sent (its level), or the next one previewed (no level).
  getPdf(documentId: number, level?: ReminderLevel) {
    return this.http.get(`${API_BASE}/pdf/reminder/${documentId}`, { responseType: 'blob', params: level ? { level } : {} });
  }
}
