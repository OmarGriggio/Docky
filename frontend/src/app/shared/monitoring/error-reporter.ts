import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TOKEN_KEY } from '../../features/auth/auth.service';

// What one page load may report at most - a bug in a template can throw on
// every change detection, and the same error twice tells nothing new (the
// backend groups them anyway, see error_log.fingerprint.ts).
const MAX_REPORTS_PER_PAGE_LOAD = 10;

// Angular's ErrorHandler (swapped in by app.config.ts): every error nothing
// else caught - in a component, a service, an event handler - is still logged
// to the console like the default one does, and also sent to our own backend
// (POST /error-log/client), where a PLATFORM_ADMIN reads them grouped
// (/settings/errors). Nothing leaves our own server.
@Injectable()
export class ErrorReporter extends ErrorHandler {

  private reported = new Set<string>();

  override handleError(error: unknown): void {
    super.handleError(error);
    this.report(error);
  }

  private report(error: unknown): void {
    // A rejected promise arrives wrapped, its own error inside.
    const cause = (error as { rejection?: unknown })?.rejection ?? error;
    // A failed HTTP call is the backend's to record (a 500 already is, on its
    // side) or an expected answer (a 4xx) - not a bug of this page.
    if (cause instanceof HttpErrorResponse) {
      return;
    }
    const name = cause instanceof Error ? cause.name : 'Error';
    const message = cause instanceof Error ? cause.message : String(cause);
    const key = `${name}|${message}`;
    if (this.reported.has(key) || this.reported.size >= MAX_REPORTS_PER_PAGE_LOAD) {
      return;
    }
    this.reported.add(key);

    // Plain fetch, not HttpClient: its interceptors (token refresh) depend on
    // services that may be the very thing that just broke. No token (logged
    // out): nothing to report to, the route needs one.
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }
    fetch(`${environment.apiUrl}/error-log/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name,
        message,
        stack: cause instanceof Error ? cause.stack : undefined,
        // The page, without its query string and with its ids as :id - where
        // it broke, not whose record it was.
        location: location.pathname.replace(/\/\d+(?=\/|$)/g, '/:id'),
      }),
      // Still sent if the page is being left.
      keepalive: true,
    }).catch(() => {
      // Reporting must never throw an error of its own.
    });
  }
}
