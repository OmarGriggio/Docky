import { describe, it, expect } from 'vitest';
import { clientDisplayName, archiveActionLabel, formatFileSize, formatSectionDate, addressLabel, formatPrice, toDateOnly, fromDateOnly, addDays, daysOverdue, fillPlaceholders } from './display';

describe('clientDisplayName', () => {

  it('uses the company_name when the client is a professional', () => {
    const client = { company_name: 'ABC Construction SA', first_name: null, last_name: null };
    expect(clientDisplayName(client)).toBe('ABC Construction SA');
  });

  it('falls back to first_name + last_name when there is no company_name', () => {
    const client = { company_name: null, first_name: 'Jean', last_name: 'Dupont' };
    expect(clientDisplayName(client)).toBe('Jean Dupont');
  });

  it('does not leave a stray space when only last_name is set', () => {
    const client = { company_name: null, first_name: null, last_name: 'Dupont' };
    expect(clientDisplayName(client)).toBe('Dupont');
  });

});

describe('archiveActionLabel', () => {

  it('returns Archiver for an active client', () => {
    expect(archiveActionLabel(true)).toBe('Archiver');
  });

  it('returns Restaurer for an archived supplier', () => {
    expect(archiveActionLabel(false)).toBe('Restaurer');
  });

});

describe('formatFileSize', () => {

  it('shows bytes under 1 Ko', () => {
    expect(formatFileSize(512)).toBe('512 o');
  });

  it('shows Ko between 1 Ko and 1 Mo', () => {
    expect(formatFileSize(2048)).toBe('2.0 Ko');
  });

  it('shows Mo from 1 Mo up', () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 Mo');
  });

});

describe('addressLabel', () => {

  it('prefixes with "Attention : " when set', () => {
    const address = { attention: 'Réception', street: 'Rue du Lac 5', postal_code: '1000', city: 'Lausanne' };
    expect(addressLabel(address)).toBe('Réception : Rue du Lac 5, 1000 Lausanne');
  });

  it('omits the prefix when there is no attention', () => {
    const address = { attention: null, street: 'Rue du Lac 5', postal_code: '1000', city: 'Lausanne' };
    expect(addressLabel(address)).toBe('Rue du Lac 5, 1000 Lausanne');
  });

});

describe('formatSectionDate', () => {

  it('shows only the date when there is no time component', () => {
    const date = new Date(2026, 8, 20, 0, 0);
    expect(formatSectionDate(date)).toBe('20.09.2026');
  });

  it('shows the time too once one is set', () => {
    const date = new Date(2026, 8, 20, 14, 5);
    expect(formatSectionDate(date)).toBe('20.09.2026 14:05');
  });

  it('accepts an ISO string the same way', () => {
    const date = new Date(2026, 8, 20, 9, 30);
    expect(formatSectionDate(date.toISOString())).toBe('20.09.2026 09:30');
  });

});

describe('formatPrice', () => {
  it('always shows two decimals with a plain dot', () => {
    expect(formatPrice(15)).toBe('15.00');
    expect(formatPrice(4.5)).toBe('4.50');
    expect(formatPrice(19.499)).toBe('19.50');
  });

  it('has no thousands separator', () => {
    expect(formatPrice(1234567.8)).toBe('1234567.80');
  });

  it('is empty for a missing value', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
  });
});

describe('date-only helpers', () => {

  it('toDateOnly uses the local calendar day, not the UTC one', () => {
    expect(toDateOnly(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05');
  });

  it('fromDateOnly reads a plain date and the backend ISO form alike', () => {
    expect(toDateOnly(fromDateOnly('2026-10-24'))).toBe('2026-10-24');
    expect(toDateOnly(fromDateOnly('2026-10-24T00:00:00.000Z'))).toBe('2026-10-24');
  });

  it('addDays rolls over month ends and drops the time of day', () => {
    expect(toDateOnly(addDays(new Date(2026, 8, 24, 15, 40), 30))).toBe('2026-10-24');
    expect(toDateOnly(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });

});

describe('daysOverdue', () => {

  const today = new Date(2026, 8, 24, 15, 0);
  const invoice = { type: 'INVOICE', status: 'SENT' as const, due_date: '2026-09-04T00:00:00.000Z' };

  it('counts the days since the due date for a sent invoice', () => {
    expect(daysOverdue(invoice, today)).toBe(20);
  });

  it('is not overdue on the due date itself, nor before it', () => {
    expect(daysOverdue({ ...invoice, due_date: '2026-09-24' }, today)).toBeNull();
    expect(daysOverdue({ ...invoice, due_date: '2026-09-30' }, today)).toBeNull();
  });

  it('never applies to a paid, cancelled or draft invoice, a quote, or one without a due date', () => {
    expect(daysOverdue({ ...invoice, status: 'PAID' }, today)).toBeNull();
    expect(daysOverdue({ ...invoice, status: 'CANCELLED' }, today)).toBeNull();
    expect(daysOverdue({ ...invoice, status: 'DRAFT' }, today)).toBeNull();
    expect(daysOverdue({ ...invoice, type: 'QUOTE' }, today)).toBeNull();
    expect(daysOverdue({ ...invoice, due_date: null }, today)).toBeNull();
  });

});

describe('fillPlaceholders', () => {

  const values = { titre_client: 'Monsieur', montant: '865.00 CHF' };

  it('replaces known placeholders, spaces inside the braces allowed', () => {
    expect(fillPlaceholders('{{titre_client}},\n\n{{ montant }}', values)).toBe('Monsieur,\n\n865.00 CHF');
  });

  it('leaves unknown and inherited names as typed, and never rescans a value', () => {
    expect(fillPlaceholders('{{typo}} {{constructor}}', values)).toBe('{{typo}} {{constructor}}');
    expect(fillPlaceholders('{{titre_client}}', { titre_client: '{{montant}}', montant: 'x' })).toBe('{{montant}}');
  });

});
