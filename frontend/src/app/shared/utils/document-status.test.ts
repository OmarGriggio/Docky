import { describe, it, expect } from 'vitest';
import { nextStatuses } from './document-status';

describe('nextStatuses', () => {

  it('lets a draft invoice be sent, paid or cancelled', () => {
    expect(nextStatuses('INVOICE', 'DRAFT')).toEqual(['SENT', 'PAID', 'CANCELLED']);
  });

  it('never takes a sent invoice back to draft', () => {
    expect(nextStatuses('INVOICE', 'SENT')).toEqual(['PAID', 'CANCELLED']);
  });

  it('lets a quote go back and forth between draft and sent, and be accepted or rejected', () => {
    expect(nextStatuses('QUOTE', 'DRAFT')).toEqual(['SENT', 'ACCEPTED', 'REJECTED']);
    expect(nextStatuses('QUOTE', 'SENT')).toEqual(['DRAFT', 'ACCEPTED', 'REJECTED']);
  });

  it('gives a closed document nowhere to go', () => {
    expect(nextStatuses('INVOICE', 'PAID')).toEqual([]);
    expect(nextStatuses('INVOICE', 'CANCELLED')).toEqual([]);
    expect(nextStatuses('QUOTE', 'ACCEPTED')).toEqual([]);
    expect(nextStatuses('QUOTE', 'REJECTED')).toEqual([]);
  });

  it('gives an archived document nowhere to go', () => {
    expect(nextStatuses('INVOICE', 'DRAFT', false)).toEqual([]);
    expect(nextStatuses('QUOTE', 'SENT', false)).toEqual([]);
  });

  it("gives a chantier's own document none", () => {
    expect(nextStatuses('PROJECT', 'DRAFT')).toEqual([]);
  });

});
