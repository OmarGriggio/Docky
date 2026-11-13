import { describe, expect, it } from "vitest";
import { checkImportRows, ClientImportRow, ImportContext, nameKey, resolveNumber } from "./client-import";

const context = (fields: Partial<ImportContext> = {}): ImportContext => ({
  existingNumbers: new Set(),
  existingEmails: new Set(),
  existingNameKeys: new Set(),
  defaultCountry: "Suisse",
  language: "FR",
  ...fields,
});

const check = (row: ClientImportRow, fields: Partial<ImportContext> = {}) => checkImportRows([row], context(fields))[0];
const codes = (issues: { code: string }[]) => issues.map(issue => issue.code);

describe("resolveNumber", () => {
  it("turns digits into C and four digits - an Excel number cell's lost zeros included", () => {
    expect(resolveNumber("867", false).number).toBe("C0867");
    expect(resolveNumber("0001", false).number).toBe("C0001");
    expect(resolveNumber(1, false).number).toBe("C0001");
    expect(resolveNumber("12345", false).number).toBe("C12345");
  });

  it("keeps one already C + digits", () => {
    expect(resolveNumber("C0042", false).number).toBe("C0042");
    expect(resolveNumber("c42", false).number).toBe("C0042");
  });

  it("moves anything else from the file to the note, a number being generated", () => {
    expect(resolveNumber("CLI-CHA-0001", false)).toEqual({ number: null, formerNumber: "CLI-CHA-0001", invalid: false });
  });

  it("refuses anything else typed by hand in the preview", () => {
    expect(resolveNumber("CLI-01", true)).toEqual({ number: null, formerNumber: null, invalid: true });
  });

  it("generates one when there's none", () => {
    expect(resolveNumber("  ", false)).toEqual({ number: null, formerNumber: null, invalid: false });
  });
});

describe("checkImportRows", () => {
  it("imports a professional with its address, the country by default", () => {
    const result = check({ company_name: " Dupont SA ", street: "Rue du Rhône 1", postal_code: 1950, city: "Sion" });
    expect(result.errors).toEqual([]);
    expect(result.client).toMatchObject({ type: "PROFESSIONAL", company_name: "Dupont SA", client_number: null, language: "FR" });
    expect(result.address).toEqual({ attention: null, street: "Rue du Rhône 1", postal_code: "1950", city: "Sion", country: "Suisse" });
  });

  it("makes it an individual without a company, and needs a last name then", () => {
    expect(check({ last_name: "Dupont" }).client.type).toBe("INDIVIDUAL");
    expect(codes(check({ first_name: "Jean" }).errors)).toEqual(["REQUIRED"]);
  });

  it("follows an explicit type, needing a company for a professional", () => {
    const result = check({ type: "Professionnel", last_name: "Dupont" });
    expect(result.client.type).toBe("PROFESSIONAL");
    expect(result.errors).toEqual([{ field: "company_name", code: "REQUIRED" }]);
    expect(codes(check({ type: "VIP", last_name: "Dupont" }).warnings)).toEqual(["TYPE_UNKNOWN"]);
  });

  it("puts a full name in the last name, with a warning", () => {
    const result = check({ full_name: "Jean-Marc De La Fontaine" });
    expect(result.client.last_name).toBe("Jean-Marc De La Fontaine");
    expect(codes(result.warnings)).toEqual(["FULL_NAME_AS_LAST_NAME"]);
  });

  it("splits an NPA and town given in one column", () => {
    expect(check({ last_name: "Dupont", street: "Rue 1", postal_code_city: "1950 Sion" }).address)
      .toMatchObject({ postal_code: "1950", city: "Sion" });
  });

  it("refuses an incomplete address", () => {
    const result = check({ last_name: "Dupont", street: "Rue du Rhône 1", city: "Sion" });
    expect(result.errors).toEqual([{ field: "postal_code", code: "ADDRESS_INCOMPLETE" }]);
  });

  it("refuses what's too long for its column - never cut silently", () => {
    const result = check({ company_name: "x".repeat(101) });
    expect(result.errors).toEqual([{ field: "company_name", code: "TOO_LONG", params: { max: 100, length: 101 } }]);
  });

  it("writes a title the way the client form stores it, in the client's language", () => {
    const french = check({ last_name: "Dupont", title: "M." });
    expect(french.client.title).toBe("Monsieur");
    expect(codes(french.warnings)).toEqual(["TITLE_INTERPRETED"]);
    expect(check({ last_name: "Smith", title: "Mrs", language: "English" }).client).toMatchObject({ title: "Ms", language: "EN" });
    expect(codes(check({ last_name: "Dupont", title: "Docteur" }).warnings)).toEqual(["TITLE_UNKNOWN"]);
  });

  it("falls back to the user's language for one it doesn't know, or none", () => {
    const result = check({ last_name: "Dupont", language: "klingon" }, { language: "EN" });
    expect(result.client.language).toBe("EN");
    expect(codes(result.warnings)).toEqual(["LANGUAGE_UNKNOWN"]);
    expect(check({ last_name: "Smith", title: "Mr" }, { language: "EN" }).client).toMatchObject({ language: "EN", title: "Mr" });
    expect(check({ last_name: "Keller", language: "D" }).client.language).toBe("DE");
  });

  it("keeps a former number that isn't one in the note", () => {
    const result = check({ last_name: "Dupont", client_number: "CLI-CHA-0001", note: "Client fidèle" });
    expect(result.client.note).toBe("Ancien n° : CLI-CHA-0001\nClient fidèle");
    expect(result.client.client_number).toBeNull();
    expect(codes(result.warnings)).toEqual(["NUMBER_MOVED_TO_NOTE"]);
  });

  it("refuses a number or an email the company already has", () => {
    const result = check(
      { last_name: "Dupont", client_number: "12", email: "Jean@Dupont.ch" },
      { existingNumbers: new Set(["C0012"]), existingEmails: new Set(["jean@dupont.ch"]) }
    );
    expect(codes(result.errors)).toEqual(["NUMBER_EXISTS", "EMAIL_EXISTS"]);
  });

  it("refuses an invalid email", () => {
    expect(codes(check({ last_name: "Dupont", email: "jean.dupont" }).errors)).toEqual(["EMAIL_INVALID"]);
  });

  it("refuses the same number or email twice in the file, on the later row", () => {
    const [first, second] = checkImportRows([
      { last_name: "Dupont", client_number: "1", email: "a@b.ch" },
      { last_name: "Martin", client_number: "0001", email: "A@B.ch" },
    ], context());
    expect(first.errors).toEqual([]);
    expect(codes(second.errors)).toEqual(["NUMBER_DUPLICATE", "EMAIL_DUPLICATE"]);
  });

  it("warns about a probable duplicate - same name and NPA, in the company or the file", () => {
    const existing = check({ company_name: "Dupont SA", street: "Rue 1", postal_code: "1950", city: "Sion" },
      { existingNameKeys: new Set([nameKey("dupont sa", "1950")]) });
    expect(codes(existing.warnings)).toEqual(["PROBABLE_DUPLICATE"]);

    const [, second] = checkImportRows([{ last_name: "Dupont" }, { last_name: "DUPONT" }], context());
    expect(codes(second.warnings)).toEqual(["PROBABLE_DUPLICATE"]);
  });

  it("takes a building number in its own column after the street", () => {
    expect(check({ last_name: "Dupont", street: "Rue du Lac", house_number: 12, postal_code: "1950", city: "Sion" }).address?.street)
      .toBe("Rue du Lac 12");
  });

  it("reads a placeholder for nothing as empty", () => {
    const result = check({ company_name: "-", last_name: "Dupont" });
    expect(result.client).toMatchObject({ type: "INDIVIDUAL", company_name: null });
  });

  it("warns about a last name that looks like a company", () => {
    expect(codes(check({ last_name: "Bâtiments Rhône SA" }).warnings)).toEqual(["PROBABLY_COMPANY"]);
    expect(codes(check({ last_name: "Garage Favre Sàrl" }).warnings)).toEqual(["PROBABLY_COMPANY"]);
  });

  it("warns about a company given for an individual", () => {
    expect(codes(check({ type: "Particulier", company_name: "Dupont SA", last_name: "Dupont" }).warnings)).toEqual(["COMPANY_OF_INDIVIDUAL"]);
  });

  it("warns about an unusual NPA and a country the QR-bill doesn't know", () => {
    const result = check({ last_name: "Dupont", street: "Rue 1", postal_code: "Sion", city: "1950", country: "Belgique" });
    expect(codes(result.warnings)).toEqual(["POSTAL_CODE_UNUSUAL", "COUNTRY_UNKNOWN"]);
  });

  it("gives a phone number back the 0 a number cell dropped", () => {
    const result = check({ last_name: "Dupont", phone: 791234567 });
    expect(result.client.phone).toBe("0791234567");
    expect(codes(result.warnings)).toEqual(["PHONE_ZERO_ADDED"]);
    expect(check({ last_name: "Dupont", phone: "+41 79 123 45 67" }).warnings).toEqual([]);
  });

  it("moves a number of more than six digits to the note - it would push the numbering too far", () => {
    expect(resolveNumber("20240001", false)).toEqual({ number: null, formerNumber: "20240001", invalid: false });
    expect(resolveNumber("999999999", true).invalid).toBe(true);
    expect(resolveNumber("999999", false).number).toBe("C999999");
  });

  it("refuses a value that isn't a cell, or carries control characters", () => {
    expect(check({ last_name: { toString: 1 } as unknown }).errors).toEqual([
      { field: "last_name", code: "INVALID_VALUE" },
      { field: "last_name", code: "REQUIRED" },
    ]);
    expect(codes(check({ last_name: "Du pont" }).errors)).toEqual(["CONTROL_CHARACTERS"]);
    expect(check({ last_name: "Dupont", note: "Ligne 1\nLigne 2" }).errors).toEqual([]);
  });

  it("finds nothing on Object's prototype in a type or a language", () => {
    const result = check({ last_name: "Dupont", type: "constructor", language: "__proto__" });
    expect(result.client).toMatchObject({ type: "INDIVIDUAL", language: "FR" });
    expect(codes(result.warnings)).toEqual(["TYPE_UNKNOWN", "LANGUAGE_UNKNOWN"]);
  });

  it("checks a huge email quickly - too long, never run through the pattern", () => {
    const started = Date.now();
    const result = check({ last_name: "Dupont", email: `a@${".".repeat(100_000)}@` });
    expect(Date.now() - started).toBeLessThan(500);
    expect(codes(result.errors)).toEqual(["TOO_LONG"]);
    expect(codes(check({ last_name: "Dupont", email: `a@${"b.".repeat(100)}` }).errors)).toEqual(["EMAIL_INVALID"]);
  });
});
