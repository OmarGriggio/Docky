import { describe, it, expect } from 'vitest';
import { matchClientByName } from './document-scan-match';
import { Client } from '../../../shared/models/client';

const client = (overrides: Partial<Client> = {}): Client => ({
    id: 1, client_number: 'C0001', type: 'INDIVIDUAL', company_name: null, vat_number: null,
    last_name: null, first_name: null, title: null, email: 'a@b.ch', phone: null, note: null,
    language: 'FR', is_active: true, is_placeholder: false,
    ...overrides,
});

describe('matchClientByName', () => {

    it('returns null when there is no guess', () => {
        expect(matchClientByName([client()], null)).toBeNull();
    });

    it('matches a company name exactly', () => {
        const hotel = client({ id: 2, company_name: 'Hôtel du Cervin SA' });
        expect(matchClientByName([client(), hotel], 'Hôtel du Cervin SA')).toBe(hotel);
    });

    it('ignores accents (an OCR-sourced guess often drops them)', () => {
        const hotel = client({ id: 2, company_name: 'Hôtel du Cervin SA' });
        expect(matchClientByName([hotel], 'Hotel du Cervin SA')).toBe(hotel);
    });

    it('matches an individual by first/last name', () => {
        const jean = client({ id: 2, first_name: 'Jean', last_name: 'Dupont' });
        expect(matchClientByName([client(), jean], 'Jean Dupont')).toBe(jean);
    });

    it('returns null when several clients tie', () => {
        const a = client({ id: 1, company_name: 'ABC Construction SA' });
        const b = client({ id: 2, company_name: 'ABC Construction Sàrl' });
        expect(matchClientByName([a, b], 'ABC Construction')).toBeNull();
    });

    it('returns null when nothing matches', () => {
        expect(matchClientByName([client({ company_name: 'ABC Construction SA' })], 'Totally Unrelated Ltd')).toBeNull();
    });

});
