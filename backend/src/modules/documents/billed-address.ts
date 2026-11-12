import { ClientWithAddresses } from "../clients/client.types";
import { Address } from "../clients/address.types";
import { clientDisplayName } from "../clients/client.display";
import { BilledAddress, Document } from "./document.types";

// Who a quote or invoice is addressed to, and where its work is - frozen on
// the document once it leaves DRAFT (see document.service.ts), like its VAT
// rate and early payment discount: a client who moves, or is renamed, later
// must not change an invoice already sent when it's printed again.

// The client's billing address: its primary one, or else its first.
export const resolveBillingAddress = (client: ClientWithAddresses): Address | undefined =>
    client.addresses.find(address => address.is_primary) ?? client.addresses[0];

// The document's Lieu/Bâtiment (address_id), as printed - "Attention : Street,
// NPA City" - null unless one was picked.
export const formatLocation = (document: Pick<Document, "address_id">, client: ClientWithAddresses): string | null => {
    if (document.address_id === null) {
        return null;
    }
    const address = client.addresses.find(a => a.id === document.address_id);
    if (!address) {
        return null;
    }
    const prefix = address.attention ? `${address.attention} : ` : "";
    return `${prefix}${address.street}, ${address.postal_code} ${address.city}`;
};

// What gets frozen - null for the "Non défini" placeholder, whose recipient
// is typed on the document itself (recipient_* columns) and never changes.
export const buildBilledAddress = (client: ClientWithAddresses, document: Pick<Document, "address_id">): BilledAddress | null => {
    if (client.is_placeholder) {
        return null;
    }
    const address = resolveBillingAddress(client);
    return {
        name: clientDisplayName(client),
        street: address?.street ?? "",
        postal_code: address?.postal_code ?? "",
        city: address?.city ?? "",
        country: address?.country ?? null,
        location: formatLocation(document, client),
    };
};

// What a PDF prints: the frozen address once there is one, the client's
// current one while the document is still a draft.
export const billedAddressOf = (
    document: Pick<Document, "address_id" | "billed_address">,
    client: ClientWithAddresses
): BilledAddress | null => document.billed_address ?? buildBilledAddress(client, document);
