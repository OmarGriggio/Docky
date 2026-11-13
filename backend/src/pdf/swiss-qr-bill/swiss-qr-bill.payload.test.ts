import { describe, expect, it } from "vitest";
import { buildSwissQrBillPayload } from "./swiss-qr-bill.payload";
import { printedAddressLines, SwissQrBillDto } from "./swiss-qr-bill.types";
import { validateSwissQrBill } from "./swiss-qr-bill.validator";

const bill = (overrides: Partial<SwissQrBillDto> = {}): SwissQrBillDto => ({
  creditor: {
    name: "Dedonno Style Sàrl", street: "Rue du Rhône 12", buildingNumber: "", postalCode: "1950", town: "Sion",
    country: "CH", iban: "CH9300762011623852957",
  },
  debtor: { name: "Hôtel du Cervin SA", street: "Bahnhofstrasse 5", buildingNumber: "", postalCode: "3920", town: "Zermatt", country: "CH" },
  payment: { amount: 1578.75, currency: "CHF", reference: { type: "NON", value: "" }, additionalInfo: "Facture FAC-2026-0012" },
  ...overrides,
});

describe("buildSwissQrBillPayload", () => {
  it("sends both addresses structured (type S), never combined (K)", () => {
    const lines = buildSwissQrBillPayload(bill()).split("\n");
    expect(lines.slice(0, 4)).toEqual(["SPC", "0200", "1", "CH9300762011623852957"]);
    expect(lines.slice(4, 11)).toEqual(["S", "Dedonno Style Sàrl", "Rue du Rhône 12", "", "1950", "Sion", "CH"]);
    // The ultimate creditor stays empty, then amount and currency.
    expect(lines.slice(11, 18)).toEqual(["", "", "", "", "", "", ""]);
    expect(lines.slice(18, 20)).toEqual(["1578.75", "CHF"]);
    expect(lines.slice(20, 27)).toEqual(["S", "Hôtel du Cervin SA", "Bahnhofstrasse 5", "", "3920", "Zermatt", "CH"]);
    expect(lines.slice(27, 31)).toEqual(["NON", "", "Facture FAC-2026-0012", "EPD"]);
    expect(lines).not.toContain("K");
  });

  it("carries the reference's type and value", () => {
    const reference = { type: "SCOR" as const, value: "RF18539007547034" };
    const lines = buildSwissQrBillPayload(bill({ payment: { ...bill().payment, reference } })).split("\n");
    expect(lines.slice(27, 29)).toEqual(["SCOR", "RF18539007547034"]);
  });

  it("leaves the debtor's seven fields empty without a debtor", () => {
    const lines = buildSwissQrBillPayload(bill({ debtor: null })).split("\n");
    expect(lines.slice(20, 27)).toEqual(["", "", "", "", "", "", ""]);
  });

  it("flattens a line break typed into a value", () => {
    const lines = buildSwissQrBillPayload(bill({ debtor: { ...bill().debtor!, name: "Hôtel\ndu Cervin" } })).split("\n");
    expect(lines[21]).toBe("Hôtel du Cervin");
  });
});

describe("validateSwissQrBill", () => {
  it("accepts a complete bill", () => {
    expect(validateSwissQrBill(bill())).toEqual([]);
  });

  it("needs the creditor's postcode and town, not its street", () => {
    const codes = (creditor: Partial<SwissQrBillDto["creditor"]>) =>
      validateSwissQrBill(bill({ creditor: { ...bill().creditor, ...creditor } })).map(error => error.code);
    expect(codes({ street: "" })).toEqual([]);
    expect(codes({ postalCode: "" })).toEqual(["POSTAL_CODE_EMPTY"]);
    expect(codes({ town: "" })).toEqual(["TOWN_EMPTY"]);
  });

  it("holds every field to the guidelines' own length", () => {
    const codes = validateSwissQrBill(bill({
      debtor: { ...bill().debtor!, street: "x".repeat(71), postalCode: "1".repeat(17), town: "y".repeat(36) },
    })).map(error => error.code);
    expect(codes).toEqual(["STREET_LENGTH", "POSTAL_CODE_LENGTH", "TOWN_LENGTH"]);
  });

  it("pairs a QR reference with a QR-IBAN, and only with one", () => {
    const codes = (iban: string, reference: SwissQrBillDto["payment"]["reference"]) =>
      validateSwissQrBill(bill({ creditor: { ...bill().creditor, iban }, payment: { ...bill().payment, reference } })).map(error => error.code);
    const qrr = { type: "QRR" as const, value: "210000000003139471430009017" };
    expect(codes("CH4431999123000889012", qrr)).toEqual([]);
    expect(codes("CH9300762011623852957", qrr)).toEqual(["REFERENCE_IBAN_MISMATCH"]);
    expect(codes("CH4431999123000889012", { type: "NON", value: "" })).toEqual(["REFERENCE_IBAN_MISMATCH"]);
    expect(codes("CH9300762011623852957", { type: "SCOR", value: "RF19539007547034" })).toEqual(["REFERENCE_INVALID"]);
  });

  it("holds the additional information to 140 characters", () => {
    const codes = (additionalInfo: string) =>
      validateSwissQrBill(bill({ payment: { ...bill().payment, additionalInfo } })).map(error => error.code);
    expect(codes("x".repeat(140))).toEqual([]);
    expect(codes("x".repeat(141))).toEqual(["ADDITIONAL_INFO_LENGTH"]);
  });
});

describe("printedAddressLines", () => {
  it("prints the street with its building number, then postcode and town", () => {
    expect(printedAddressLines({ ...bill().debtor!, street: "Bahnhofstrasse", buildingNumber: "5" }))
      .toEqual(["Bahnhofstrasse 5", "3920 Zermatt"]);
  });

  it("leaves out a missing street", () => {
    expect(printedAddressLines({ ...bill().debtor!, street: "" })).toEqual(["3920 Zermatt"]);
  });
});
