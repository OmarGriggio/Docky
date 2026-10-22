import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorCode, qrBillErrorKey } from './api-error';

const blobError = (body: unknown) =>
  new HttpErrorResponse({ status: 422, error: new Blob([JSON.stringify(body)], { type: 'application/json' }) });

describe('apiErrorCode', () => {

  it('reads the code out of a blob body (a PDF request)', async () => {
    expect(await apiErrorCode(blobError({ message: 'x', code: 'COMPANY_IBAN_MISSING' }))).toBe('COMPANY_IBAN_MISSING');
  });

  it('reads it out of an already parsed or a text body', async () => {
    expect(await apiErrorCode(new HttpErrorResponse({ status: 422, error: { code: 'QR_BILL_INVALID' } }))).toBe('QR_BILL_INVALID');
    expect(await apiErrorCode(new HttpErrorResponse({ status: 422, error: '{"code":"QR_BILL_INVALID"}' }))).toBe('QR_BILL_INVALID');
  });

  it('is null without a code, or for something that is not an HTTP error', async () => {
    expect(await apiErrorCode(blobError({ message: 'x' }))).toBeNull();
    expect(await apiErrorCode(new Error('boom'))).toBeNull();
  });

});

describe('qrBillErrorKey', () => {

  it('maps a known QR-bill code to its own message, anything else to the fallback', async () => {
    expect(await qrBillErrorKey(blobError({ code: 'COMPANY_IBAN_MISSING' }), 'fallback')).toBe('qrBillErrors.COMPANY_IBAN_MISSING');
    expect(await qrBillErrorKey(blobError({ code: 'SOMETHING_ELSE' }), 'fallback')).toBe('fallback');
  });

});
