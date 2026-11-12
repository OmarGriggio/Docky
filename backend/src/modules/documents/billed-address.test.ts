import { describe, expect, it } from "vitest";
import { ClientWithAddresses } from "../clients/client.types";
import { Address } from "../clients/address.types";
import { billedAddressOf, buildBilledAddress, formatLocation } from "./billed-address";

const address = (fields: Partial<Address>): Address => ({
    id: 1, company_id: 1, client_id: 1, is_primary: false, attention: null,
    street: "Rue du Rhône 1", postal_code: "1950", city: "Sion", country: "Suisse",
    ...fields,
});

const client = (fields: Partial<ClientWithAddresses> = {}): ClientWithAddresses => ({
    id: 1, company_id: 1, client_number: "C0001", type: "PROFESSIONAL", company_name: "Dupont SA",
    last_name: null, first_name: null, title: null, email: null, phone: null, note: null,
    language: "FR", is_active: true, is_placeholder: false,
    addresses: [
        address({ id: 1, street: "Chemin des Vignes 3" }),
        address({ id: 2, is_primary: true, street: "Rue du Rhône 1", attention: "Chantier" }),
    ],
    ...fields,
});

describe("buildBilledAddress", () => {
    it("takes the client's name and its primary address", () => {
        expect(buildBilledAddress(client(), { address_id: null })).toEqual({
            name: "Dupont SA", street: "Rue du Rhône 1", postal_code: "1950", city: "Sion", country: "Suisse", location: null,
        });
    });

    it("falls back to the first address without a primary one", () => {
        const noPrimary = client({ addresses: [address({ id: 7, street: "Route 9" })] });
        expect(buildBilledAddress(noPrimary, { address_id: null })?.street).toBe("Route 9");
    });

    it("prints the picked Lieu/Bâtiment", () => {
        expect(buildBilledAddress(client(), { address_id: 2 })?.location).toBe("Chantier : Rue du Rhône 1, 1950 Sion");
    });

    it("is null for the Non défini placeholder, whose recipient is on the document", () => {
        expect(buildBilledAddress(client({ is_placeholder: true }), { address_id: null })).toBeNull();
    });
});

describe("formatLocation", () => {
    it("is null without a picked address, or one that's gone", () => {
        expect(formatLocation({ address_id: null }, client())).toBeNull();
        expect(formatLocation({ address_id: 99 }, client())).toBeNull();
    });
});

describe("billedAddressOf", () => {
    const frozen = { name: "Old SA", street: "Ancienne rue 5", postal_code: "1000", city: "Lausanne", country: "Suisse", location: null };

    it("keeps the frozen address once there is one, whatever the client became", () => {
        expect(billedAddressOf({ address_id: 2, billed_address: frozen }, client())).toEqual(frozen);
    });

    it("follows the client while nothing is frozen", () => {
        expect(billedAddressOf({ address_id: null, billed_address: null }, client())?.name).toBe("Dupont SA");
    });
});
