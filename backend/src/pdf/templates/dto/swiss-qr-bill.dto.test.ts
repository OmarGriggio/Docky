import { describe, expect, it } from "vitest";
import { completeDebtorOrNull } from "./swiss-qr-bill.dto";
import { QrBillDebtor } from "../../swiss-qr-bill/swiss-qr-bill.types";

const debtor: QrBillDebtor = {
  name: "Hôtel du Cervin SA", street: "Bahnhofstrasse 5", buildingNumber: "", postalCode: "3920", town: "Zermatt", country: "CH",
};

describe("completeDebtorOrNull", () => {
  it("keeps a payer the structured address can hold, trimmed", () => {
    expect(completeDebtorOrNull({ ...debtor, name: " Hôtel du Cervin SA " })).toEqual(debtor);
  });

  it("takes an address without a country as a Swiss one", () => {
    expect(completeDebtorOrNull({ ...debtor, country: "" })?.country).toBe("CH");
  });

  it("leaves the payer blank without a postcode or town - a client with no address yet", () => {
    expect(completeDebtorOrNull({ ...debtor, postalCode: "", town: "" })).toBeNull();
    expect(completeDebtorOrNull({ ...debtor, town: " " })).toBeNull();
  });

  it("leaves the payer blank rather than failing the invoice when a field is too long for it", () => {
    expect(completeDebtorOrNull({ ...debtor, town: "Crans-Montana (Chermignon-d'en-Haut) VS" })).toBeNull();
    expect(completeDebtorOrNull({ ...debtor, postalCode: "1".repeat(17) })).toBeNull();
    expect(completeDebtorOrNull({ ...debtor, country: "Royaume-Uni" })).toBeNull();
  });
});
