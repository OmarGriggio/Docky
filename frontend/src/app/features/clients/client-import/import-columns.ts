// Importing clients from a spreadsheet: which Docky field each column feeds,
// guessed from its header, then turned into the rows POST /client/import
// takes (backend client-import.ts judges them - nothing here decides what's
// valid).

// Every field a column can feed - the order the mapping screen lists them in.
export const IMPORT_FIELDS = [
  'client_number', 'type', 'company_name', 'title', 'last_name', 'first_name', 'full_name',
  'email', 'phone', 'language', 'attention', 'street', 'house_number', 'postal_code', 'city', 'postal_code_city', 'country', 'note',
] as const;

export type ImportField = typeof IMPORT_FIELDS[number];

// One row as the backend takes it: a value per mapped field, as text.
export type ClientImportRow = Partial<Record<ImportField, string>> & { client_number_edited?: boolean };

// The most rows one import takes (the backend's own MAX_IMPORT_ROWS).
export const MAX_IMPORT_ROWS = 1000;

// A header as compared: lowercase, accents and everything but letters and
// digits removed - "N° client", "No client" and "n client" all read "nclient".
const fold = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// The headers each field is recognized by, folded - French, English, German,
// the words a small Swiss company's own spreadsheet is likely to use.
const SYNONYMS: Record<ImportField, string[]> = {
  // Never a bare "N°"/"No": in an address list that's the building number.
  client_number: ['nclient', 'noclient', 'numeroclient', 'numclient', 'nrclient', 'clientnumber', 'clientno', 'clientnr', 'kundennummer', 'kundennr', 'codeclient', 'clientcode'],
  type: ['type', 'typeclient', 'typedeclient', 'categorie', 'category', 'kategorie', 'clienttype'],
  company_name: ['societe', 'entreprise', 'raisonsociale', 'nomentreprise', 'nomsociete', 'company', 'companyname', 'firma', 'firmenname', 'organisation', 'organization'],
  title: ['civilite', 'titre', 'title', 'salutation', 'anrede', 'politesse', 'appellation'],
  last_name: ['nom', 'nomdefamille', 'lastname', 'surname', 'familyname', 'name', 'nachname', 'cognome'],
  first_name: ['prenom', 'firstname', 'givenname', 'vorname', 'nome'],
  full_name: ['nomcomplet', 'nometprenom', 'prenometnom', 'fullname', 'contact', 'personnedecontact', 'contactperson', 'vollername'],
  email: ['email', 'mail', 'courriel', 'emailaddress', 'adresseemail', 'adressemail', 'emailadresse'],
  phone: ['telephone', 'tel', 'phone', 'phonenumber', 'mobile', 'natel', 'portable', 'telefon', 'gsm', 'numerodetelephone', 'telefonnummer'],
  language: ['langue', 'language', 'sprache', 'lingua', 'langage'],
  attention: ['attention', 'alattentionde', 'co', 'complement', 'complementdadresse', 'adressecomplement', 'zusatz', 'adresszusatz'],
  street: ['rue', 'rueetnumero', 'rueetno', 'rueetn', 'ruen', 'rueetndubatiment', 'adresse', 'address', 'street', 'strasse', 'adresse1', 'address1', 'ligneadresse'],
  house_number: ['n', 'no', 'nr', 'num', 'numero', 'nrue', 'numerorue', 'numerodelarue', 'nbatiment', 'numerobatiment', 'hausnummer', 'hausnr', 'housenumber', 'nummer'],
  postal_code: ['npa', 'codepostal', 'cp', 'plz', 'zip', 'zipcode', 'postalcode', 'postcode'],
  city: ['ville', 'localite', 'lieu', 'city', 'town', 'ort', 'commune', 'localita', 'gemeinde'],
  postal_code_city: ['npaville', 'npalocalite', 'npaetville', 'npaetlocalite', 'codepostalville', 'cpville', 'plzort', 'zipcity', 'postcodetown'],
  country: ['pays', 'country', 'land', 'paese'],
  note: ['note', 'notes', 'remarque', 'remarques', 'commentaire', 'commentaires', 'comment', 'comments', 'bemerkung', 'bemerkungen', 'observations'],
};

const FIELD_BY_HEADER = new Map<string, ImportField>(
  IMPORT_FIELDS.flatMap(field => SYNONYMS[field].map(synonym => [synonym, field] as const))
);

// The field a header names, if any.
export const guessField = (header: string): ImportField | null => FIELD_BY_HEADER.get(fold(header)) ?? null;

// A field per column, guessed from the headers - each field fed by one column
// at most, the first one naming it.
export const guessMapping = (headers: string[]): (ImportField | null)[] => {
  const used = new Set<ImportField>();
  return headers.map(header => {
    const field = guessField(header);
    if (!field || used.has(field)) {
      return null;
    }
    used.add(field);
    return field;
  });
};

// A spreadsheet cell as text: a number as written ("1950", not "1950.0"), a
// date as 31.12.2026, nothing as ''.
export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}`;
  }
  return String(value).trim();
};

// The header row: the first one with at least two cells filled in - a title
// above the table ("Liste des clients 2025", one cell) or a blank line is
// skipped. A sheet of a single column falls back to its first non-empty row.
export const headerRowIndex = (table: string[][]): number => {
  const filled = (row: string[]) => row.filter(cell => cell !== '').length;
  const header = table.findIndex(row => filled(row) >= 2);
  return header >= 0 ? header : table.findIndex(row => filled(row) > 0);
};

// The rows under the header, as the backend takes them, each with its line
// number in the sheet (1-based, as the spreadsheet shows it) - a row with
// nothing in any mapped column is left out (a blank line, a total at the
// bottom...).
export const buildImportLines = (table: string[][], mapping: (ImportField | null)[]): { line: number; row: ClientImportRow }[] => {
  const header = headerRowIndex(table);
  if (header < 0) {
    return [];
  }
  return table.slice(header + 1)
    .map((cells, index) => {
      const row: ClientImportRow = {};
      mapping.forEach((field, column) => {
        const value = cells[column] ?? '';
        if (field && value) {
          row[field] = value;
        }
      });
      return { line: header + index + 2, row };
    })
    .filter(({ row }) => Object.keys(row).length > 0);
};


// What the mapping still lacks to make a client of a row: a name.
export const mapsAName = (mapping: (ImportField | null)[]): boolean =>
  mapping.some(field => field === 'company_name' || field === 'last_name' || field === 'full_name');
