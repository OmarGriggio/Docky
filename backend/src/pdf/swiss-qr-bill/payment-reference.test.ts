import { describe, expect, it } from "vitest";
import {
  buildCreditorReference, buildQrReference, formatReference, isQrIban, isValidCreditorReference, isValidIban,
  isValidQrReference, qrReferenceCheckDigit, referenceForDocumentNumber, referenceOf,
} from "./payment-reference";

describe("isQrIban", () => {
  it("recognizes a QR-IBAN by its institution id (30000-31999)", () => {
    // The guidelines' own sample QR-IBAN, spaces and all.
    expect(isQrIban("CH44 3199 9123 0008 8901 2")).toBe(true);
    expect(isQrIban("CH9300762011623852957")).toBe(false);
    expect(isQrIban("FR7630006000011234567890189")).toBe(false);
    expect(isQrIban("")).toBe(false);
  });
});

describe("isValidIban", () => {
  it("checks the IBAN's own modulo 97", () => {
    expect(isValidIban("CH9300762011623852957")).toBe(true);
    expect(isValidIban("CH44 3199 9123 0008 8901 2")).toBe(true);
    expect(isValidIban("CH9300762011623852958")).toBe(false);
    expect(isValidIban("nonsense")).toBe(false);
  });
});

describe("QR reference", () => {
  it("computes the recursive modulo 10 check digit of the guidelines' sample", () => {
    expect(qrReferenceCheckDigit("21000000000313947143000901")).toBe(7);
    expect(isValidQrReference("210000000003139471430009017")).toBe(true);
    expect(isValidQrReference("210000000003139471430009018")).toBe(false);
  });

  it("pads its digits to 26 and adds the check digit", () => {
    const reference = buildQrReference("20260012");
    expect(reference).toHaveLength(27);
    expect(reference.startsWith("000000000000000000")).toBe(true);
    expect(isValidQrReference(reference)).toBe(true);
    expect(() => buildQrReference("12A")).toThrow();
  });
});

describe("creditor reference", () => {
  it("computes ISO 11649's check digits", () => {
    // ISO 11649's own example.
    expect(buildCreditorReference("539007547034")).toBe("RF18539007547034");
    expect(isValidCreditorReference("RF18539007547034")).toBe(true);
    expect(isValidCreditorReference("RF19539007547034")).toBe(false);
  });

  it("takes letters too", () => {
    const reference = buildCreditorReference("FAC20260012");
    expect(reference).toMatch(/^RF\d{2}FAC20260012$/);
    expect(isValidCreditorReference(reference)).toBe(true);
  });
});

describe("referenceForDocumentNumber", () => {
  it("builds an invoice's reference from its number", () => {
    expect(referenceForDocumentNumber("FAC-2026-0012", "QRR").value).toBe(buildQrReference("20260012"));
    expect(referenceForDocumentNumber("FAC-2026-0012", "SCOR").value).toBe(buildCreditorReference("FAC20260012"));
    expect(referenceForDocumentNumber("FAC-2026-0012", "NON")).toEqual({ type: "NON", value: "" });
  });

  it("gives two invoices two references", () => {
    expect(referenceForDocumentNumber("FAC-2026-0012", "SCOR").value)
      .not.toBe(referenceForDocumentNumber("FAC-2026-0013", "SCOR").value);
  });
});

describe("referenceOf", () => {
  it("reads a stored reference's kind", () => {
    expect(referenceOf(null)).toEqual({ type: "NON", value: "" });
    expect(referenceOf("RF18539007547034").type).toBe("SCOR");
    expect(referenceOf("210000000003139471430009017").type).toBe("QRR");
  });
});

describe("formatReference", () => {
  it("prints a QR reference in blocks of 5 after 2 digits, a creditor reference in blocks of 4", () => {
    expect(formatReference({ type: "QRR", value: "210000000003139471430009017" })).toBe("21 00000 00003 13947 14300 09017");
    expect(formatReference({ type: "SCOR", value: "RF18539007547034" })).toBe("RF18 5390 0754 7034");
  });
});
