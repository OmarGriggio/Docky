import { ClientLanguage, ClientType, NewClientAddress } from "./client.types";
import { SEQUENCE_DIGITS } from "../../shared/numbering/sequence-code";

// Importing clients from a spreadsheet (POST /client/import): the frontend
// reads the file and maps its columns onto these fields; every rule deciding
// what a row becomes - and what's wrong with it - lives here, pure, so the
// preview (a dry run) and the real import judge a row exactly alike.

export const MAX_IMPORT_ROWS = 1000;

// One spreadsheet row, as mapped by the user. Any field may be missing, and a
// value may arrive as a number (a spreadsheet cell) - see text().
export interface ClientImportRow {
  client_number?: unknown;
  // Typed by hand in the preview, not read from the file: a number there
  // that isn't one is an error, not moved to the note (see resolveNumber).
  client_number_edited?: boolean;
  type?: unknown;
  company_name?: unknown;
  last_name?: unknown;
  first_name?: unknown;
  // "Jean Dupont" in one column - put in the last name as is.
  full_name?: unknown;
  title?: unknown;
  email?: unknown;
  phone?: unknown;
  note?: unknown;
  language?: unknown;
  attention?: unknown;
  street?: unknown;
  postal_code?: unknown;
  city?: unknown;
  // "1950 Sion" in one column.
  postal_code_city?: unknown;
  country?: unknown;
}

export type ImportField = Exclude<keyof ClientImportRow, "client_number_edited">;

// A problem found on a row - `code` is translated by the frontend
// (clients.import.issues.*), `params` fills it in.
export interface ImportIssue {
  field: ImportField;
  code: string;
  params?: Record<string, string | number>;
}

export interface ImportedClient {
  // Null: generated when the row is created (C0001...).
  client_number: string | null;
  type: ClientType;
  company_name: string | null;
  last_name: string | null;
  first_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  note: string | null;
  language: ClientLanguage;
}

export interface ImportRowResult {
  client: ImportedClient;
  address: NewClientAddress | null;
  // Blocking: the row can't be imported as is.
  errors: ImportIssue[];
  // Imported as shown, but worth a look.
  warnings: ImportIssue[];
}

export interface ImportContext {
  // The company's own client numbers and emails (archived clients included -
  // a number is never handed out twice), emails lowercased.
  existingNumbers: Set<string>;
  existingEmails: Set<string>;
  // nameKey()s of the company's clients - same name and NPA as one of them is
  // probably the same client.
  existingNameKeys: Set<string>;
  // An address's country when the file has none - Switzerland, in the user's
  // language (like the client form's).
  defaultCountry: string;
  // The user's language - for the "former number" line added to a note.
  language: "FR" | "EN";
}

// The clients table's own column widths (000_base.sql) and the addresses'.
const MAX_LENGTHS: Partial<Record<ImportField, number>> = {
  company_name: 100,
  last_name: 100,
  first_name: 100,
  title: 100,
  email: 255,
  phone: 50,
  note: 3000,
  attention: 100,
  street: 100,
  postal_code: 20,
  city: 100,
  country: 100,
};

const FORMER_NUMBER_LABEL = { FR: "Ancien n° :", EN: "Former no.:" };

// A cell as text, trimmed - a number cell included ("1950" from 1950).
const text = (value: unknown): string => (value === null || value === undefined ? "" : String(value).trim());

// Lowercase, accents removed, inner spaces collapsed - for comparing what a
// person typed in different ways.
const fold = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// The client number, by the rule the user chose: digits (an Excel number cell
// drops leading zeros, "1" = "0001") or C + digits become C and at least four
// digits ("867" → "C0867"); anything else from the file goes to the note and a
// number is generated, but typed by hand in the preview it's an error.
export const resolveNumber = (raw: unknown, edited: boolean): { number: string | null; formerNumber: string | null; invalid: boolean } => {
  const value = text(raw);
  if (!value) {
    return { number: null, formerNumber: null, invalid: false };
  }
  const digits = value.match(/^[Cc]?(\d{1,9})$/)?.[1];
  if (digits) {
    return { number: `C${String(Number(digits)).padStart(SEQUENCE_DIGITS, "0")}`, formerNumber: null, invalid: false };
  }
  return edited ? { number: null, formerNumber: null, invalid: true } : { number: null, formerNumber: value, invalid: false };
};

const TYPES: Record<string, ClientType> = {
  pro: "PROFESSIONAL", professionnel: "PROFESSIONAL", professional: "PROFESSIONAL", entreprise: "PROFESSIONAL",
  societe: "PROFESSIONAL", company: "PROFESSIONAL", business: "PROFESSIONAL", firma: "PROFESSIONAL",
  particulier: "INDIVIDUAL", prive: "INDIVIDUAL", individual: "INDIVIDUAL", private: "INDIVIDUAL", privat: "INDIVIDUAL",
};

const LANGUAGES: Record<string, ClientLanguage> = {
  fr: "FR", francais: "FR", french: "FR", franzosisch: "FR",
  en: "EN", anglais: "EN", english: "EN", englisch: "EN",
  de: "DE", allemand: "DE", german: "DE", deutsch: "DE",
  it: "IT", italien: "IT", italian: "IT", italiano: "IT", italienisch: "IT",
};

const MALE_TITLES = new Set(["monsieur", "m", "m.", "mr", "mr.", "herr", "signor", "sig", "sig."]);
const FEMALE_TITLES = new Set(["madame", "mme", "mme.", "mrs", "mrs.", "ms", "ms.", "miss", "frau", "signora", "sig.ra"]);

// Stored the way the client form stores it: "Monsieur"/"Madame", or
// "Mr"/"Ms" for an English-speaking client.
const resolveTitle = (raw: string, language: ClientLanguage): { title: string | null; recognized: boolean } => {
  if (!raw) {
    return { title: null, recognized: true };
  }
  const folded = fold(raw);
  if (MALE_TITLES.has(folded)) {
    return { title: language === "EN" ? "Mr" : "Monsieur", recognized: true };
  }
  if (FEMALE_TITLES.has(folded)) {
    return { title: language === "EN" ? "Ms" : "Madame", recognized: true };
  }
  return { title: raw, recognized: false };
};

// "1950 Sion" → NPA + town; a number alone is an NPA; anything else is all
// the town - the same rule as the frontend's splitPostalCodeCity.
const splitPostalCodeCity = (value: string): { postalCode: string; city: string } => {
  if (/^\d+$/.test(value)) {
    return { postalCode: value, city: "" };
  }
  const match = value.match(/^(\d+)\s+(.+)$/);
  return match ? { postalCode: match[1], city: match[2].trim() } : { postalCode: "", city: value };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same name and NPA - how a probable duplicate is spotted.
export const nameKey = (name: string, postalCode: string | null | undefined): string => `${fold(name)}|${text(postalCode)}`;

const checkRow = (row: ClientImportRow, context: ImportContext): ImportRowResult => {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const value = (field: ImportField) => text(row[field]);

  // Names - a full name alone goes into the last name.
  let lastName = value("last_name");
  const firstName = value("first_name");
  const fullName = value("full_name");
  if (!lastName && !firstName && fullName) {
    lastName = fullName;
    warnings.push({ field: "full_name", code: "FULL_NAME_AS_LAST_NAME" });
  }
  const companyName = value("company_name");

  // Type - given, or a company name makes it a professional.
  const typeText = value("type");
  const inferredType: ClientType = companyName ? "PROFESSIONAL" : "INDIVIDUAL";
  let type = inferredType;
  if (typeText) {
    const known = TYPES[fold(typeText)];
    if (known) {
      type = known;
    } else {
      warnings.push({ field: "type", code: "TYPE_UNKNOWN", params: { value: typeText } });
    }
  }
  if (type === "PROFESSIONAL" && !companyName) {
    errors.push({ field: "company_name", code: "REQUIRED" });
  }
  if (type === "INDIVIDUAL" && !lastName) {
    errors.push({ field: "last_name", code: "REQUIRED" });
  }

  // Language, then the title written in it.
  const languageText = value("language");
  const language = languageText ? LANGUAGES[fold(languageText)] : undefined;
  if (languageText && !language) {
    warnings.push({ field: "language", code: "LANGUAGE_UNKNOWN", params: { value: languageText } });
  }
  const titleText = value("title");
  const { title, recognized } = resolveTitle(titleText, language ?? "FR");
  if (!recognized) {
    warnings.push({ field: "title", code: "TITLE_UNKNOWN", params: { value: titleText } });
  } else if (title && title !== titleText) {
    warnings.push({ field: "title", code: "TITLE_INTERPRETED", params: { value: titleText, title } });
  }

  // Number.
  const { number, formerNumber, invalid } = resolveNumber(row.client_number, row.client_number_edited === true);
  if (invalid) {
    errors.push({ field: "client_number", code: "NUMBER_INVALID", params: { value: value("client_number") } });
  } else if (number && context.existingNumbers.has(number)) {
    errors.push({ field: "client_number", code: "NUMBER_EXISTS", params: { number } });
  } else if (formerNumber) {
    warnings.push({ field: "client_number", code: "NUMBER_MOVED_TO_NOTE", params: { value: formerNumber } });
  }

  // Note - the former number on a line of its own, first.
  const noteText = value("note");
  const note = [formerNumber ? `${FORMER_NUMBER_LABEL[context.language]} ${formerNumber}` : "", noteText].filter(Boolean).join("\n");

  // Email.
  const email = value("email");
  if (email && !EMAIL.test(email)) {
    errors.push({ field: "email", code: "EMAIL_INVALID" });
  } else if (email && context.existingEmails.has(email.toLowerCase())) {
    errors.push({ field: "email", code: "EMAIL_EXISTS" });
  }

  // Address - nothing at all, or a street, an NPA and a town.
  let postalCode = value("postal_code");
  let city = value("city");
  const combined = value("postal_code_city");
  if (combined && !postalCode && !city) {
    ({ postalCode, city } = splitPostalCodeCity(combined));
  }
  const attention = value("attention");
  const street = value("street");
  let address: NewClientAddress | null = null;
  if (attention || street || postalCode || city) {
    const missing: [ImportField, string][] = [["street", street], ["postal_code", postalCode], ["city", city]];
    for (const [field, fieldValue] of missing) {
      if (!fieldValue) {
        errors.push({ field: field === "street" || !combined ? field : "postal_code_city", code: "ADDRESS_INCOMPLETE" });
      }
    }
    address = {
      attention: attention || null,
      street,
      postal_code: postalCode,
      city,
      country: value("country") || context.defaultCountry,
    };
  }

  // Lengths, on what will actually be stored.
  const stored: Partial<Record<ImportField, string>> = {
    company_name: companyName, last_name: lastName, first_name: firstName, title: title ?? "",
    email, phone: value("phone"), note, attention, street, postal_code: postalCode, city,
    country: address?.country ?? "",
  };
  for (const [field, max] of Object.entries(MAX_LENGTHS) as [ImportField, number][]) {
    const storedValue = stored[field] ?? "";
    if (storedValue.length > max) {
      errors.push({ field, code: "TOO_LONG", params: { max, length: storedValue.length } });
    }
  }

  // Probably a client already there.
  const displayName = companyName || `${firstName} ${lastName}`.trim();
  if (displayName && context.existingNameKeys.has(nameKey(displayName, postalCode))) {
    warnings.push({ field: companyName ? "company_name" : "last_name", code: "PROBABLE_DUPLICATE" });
  }

  return {
    client: {
      client_number: number,
      type,
      company_name: companyName || null,
      last_name: lastName || null,
      first_name: firstName || null,
      title,
      email: email || null,
      phone: value("phone") || null,
      note: note || null,
      language: language ?? "FR",
    },
    address,
    errors,
    warnings,
  };
};

// Every row judged on its own, then against the others: the same number or
// email twice in the file is an error on the later rows, the same name and NPA
// a warning.
export const checkImportRows = (rows: ClientImportRow[], context: ImportContext): ImportRowResult[] => {
  const seenNumbers = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNameKeys = new Set<string>();

  return rows.map(row => {
    const result = checkRow(row, context);
    const { client, address } = result;

    if (client.client_number) {
      if (seenNumbers.has(client.client_number)) {
        result.errors.push({ field: "client_number", code: "NUMBER_DUPLICATE", params: { number: client.client_number } });
      }
      seenNumbers.add(client.client_number);
    }
    if (client.email) {
      const email = client.email.toLowerCase();
      if (seenEmails.has(email)) {
        result.errors.push({ field: "email", code: "EMAIL_DUPLICATE" });
      }
      seenEmails.add(email);
    }
    const displayName = client.company_name || `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
    if (displayName) {
      const key = nameKey(displayName, address?.postal_code);
      if (seenNameKeys.has(key) && !result.warnings.some(w => w.code === "PROBABLE_DUPLICATE")) {
        result.warnings.push({ field: client.company_name ? "company_name" : "last_name", code: "PROBABLE_DUPLICATE" });
      }
      seenNameKeys.add(key);
    }
    return result;
  });
};
