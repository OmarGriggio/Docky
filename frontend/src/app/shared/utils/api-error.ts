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
const QR_BILL_ERROR_CODES = ['COMPANY_IBAN_MISSING', 'COMPANY_IBAN_INVALID', 'COMPANY_ADDRESS_INCOMPLETE', 'QR_BILL_INVALID'];

// The translation key to show for a failed PDF/QR-bill request: a precise one
// when the backend said what's wrong, `fallbackKey` otherwise.
export const qrBillErrorKey = async (err: unknown, fallbackKey: string): Promise<string> => {
  const code = await apiErrorCode(err);
  return code && QR_BILL_ERROR_CODES.includes(code) ? `qrBillErrors.${code}` : fallbackKey;
};
