import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';
import { httpErrorKey, isSessionExpired } from '../utils/api-error';

// Every message the app pops up (the <p-toast> in app.html): an operation
// that failed, an edit that was undone, something done in the background.
// Nothing should fail silently any more - a request whose error isn't shown
// right there in a form goes through error().
@Injectable({ providedIn: 'root' })
export class NotificationService {

  private messages = inject(MessageService);
  private transloco = inject(TranslocoService);

  // `source` names who failed, for the console only. A 401 says nothing: the
  // auth interceptor is already sending the user back to the login page.
  error(source: string, err: unknown): void {
    console.error(`${source} :`, err);
    if (isSessionExpired(err)) {
      return;
    }
    this.show('error', 'notifications.errorTitle', httpErrorKey(err), 8000);
  }

  warn(key: string): void {
    this.show('warn', 'notifications.warnTitle', key, 6000);
  }

  success(key: string, params?: Record<string, unknown>): void {
    this.show('success', 'notifications.successTitle', key, 3000, params);
  }

  private show(severity: 'error' | 'warn' | 'success', summaryKey: string, detailKey: string, life: number, params?: Record<string, unknown>): void {
    this.messages.add({
      severity,
      summary: this.transloco.translate(summaryKey),
      detail: this.transloco.translate(detailKey, params),
      life,
    });
  }
}
