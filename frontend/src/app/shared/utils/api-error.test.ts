import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorCode, httpErrorKey, isSessionExpired, qrBillErrorKey } from './api-error';

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

describe('httpErrorKey', () => {

  const status = (code: number) => new HttpErrorResponse({ status: code });

  it('says what the user can do about it, by status', () => {
    expect(httpErrorKey(status(0))).toBe('notifications.errors.network');
    expect(httpErrorKey(status(403))).toBe('notifications.errors.forbidden');
    expect(httpErrorKey(status(404))).toBe('notifications.errors.notFound');
    expect(httpErrorKey(status(409))).toBe('notifications.errors.conflict');
    expect(httpErrorKey(status(413))).toBe('notifications.errors.tooLarge');
    expect(httpErrorKey(status(429))).toBe('notifications.errors.tooManyRequests');
  });

  it('falls back to a generic message - a 500, or not an HTTP error at all', () => {
    expect(httpErrorKey(status(500))).toBe('notifications.errors.generic');
    expect(httpErrorKey(new Error('boom'))).toBe('notifications.errors.generic');
  });

  it('tells a known error code apart from its status', () => {
    expect(httpErrorKey(new HttpErrorResponse({ status: 409, error: { code: 'DEPOSIT_DEDUCTED' } }))).toBe('notifications.codes.DEPOSIT_DEDUCTED');
    expect(httpErrorKey(new HttpErrorResponse({ status: 409, error: { code: 'SOMETHING_ELSE' } }))).toBe('notifications.errors.conflict');
  });

  it('recognizes an expired session', () => {
    expect(isSessionExpired(status(401))).toBe(true);
    expect(isSessionExpired(status(500))).toBe(false);
  });
});
