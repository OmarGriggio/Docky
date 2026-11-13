import { HttpErrorResponse } from '@angular/common/http';

// The `code` the backend sends along with some errors (AppError's own code,
// see backend/src/shared/types/errors.ts) - null when there's none. A PDF is
// requested with responseType 'blob', so its error body arrives as a Blob
// holding the JSON, not as the parsed object a normal request gets.
export const apiErrorCode = async (err: unknown): Promise<string | null> => {
  if (!(err instanceof HttpErrorResponse)) {
    return null;
  }
  let body: unknown = err.error;
  if (body instanceof Blob) {
    try {
      body = JSON.parse(await body.text());
    } catch {
      return null;
    }
  } else if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
};

// The QR-bill codes the backend can send (see swiss-qr-bill.generator.ts's
// errorCodeFor) - each has its own translated message under `qrBillErrors.*`.
const QR_BILL_ERROR_CODES = ['COMPANY_IBAN_MISSING', 'COMPANY_IBAN_INVALID', 'COMPANY_ADDRESS_INCOMPLETE', 'QR_BILL_AMOUNT_INVALID', 'QR_BILL_INVALID'];

// The translation key to show for a failed PDF/QR-bill request: a precise one
// when the backend said what's wrong, `fallbackKey` otherwise.
export const qrBillErrorKey = async (err: unknown, fallbackKey: string): Promise<string> => {
  const code = await apiErrorCode(err);
  return code && QR_BILL_ERROR_CODES.includes(code) ? `qrBillErrors.${code}` : fallbackKey;
};

// The message a failed request shows the user (NotificationService), by its
// HTTP status - what they can do about it, never the backend's own message
// (English, written for developers).
// Codes the backend sends with an error the user can act on precisely - each
// has its own message under notifications.codes.*.
const ERROR_CODES = ['DEPOSIT_DRAFT_PENDING', 'DEPOSIT_DEDUCTED', 'DEPOSIT_NEEDS_QUOTE'];

export const httpErrorKey = (err: unknown): string => {
  if (!(err instanceof HttpErrorResponse)) {
    return 'notifications.errors.generic';
  }
  const code = (err.error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && ERROR_CODES.includes(code)) {
    return `notifications.codes.${code}`;
  }
  switch (err.status) {
    case 0: return 'notifications.errors.network';
    case 403: return 'notifications.errors.forbidden';
    case 404: return 'notifications.errors.notFound';
    case 409: return 'notifications.errors.conflict';
    case 413: return 'notifications.errors.tooLarge';
    case 429: return 'notifications.errors.tooManyRequests';
    default: return 'notifications.errors.generic';
  }
};

// A 401 - the auth interceptor handles it (refresh, or back to the login page).
export const isSessionExpired = (err: unknown): boolean =>
  err instanceof HttpErrorResponse && err.status === 401;
