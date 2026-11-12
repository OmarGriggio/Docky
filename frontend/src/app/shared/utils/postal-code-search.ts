// A Swiss NPA and one of its towns - one NPA can have several towns, and
// one town several NPAs (see scripts/generate-swiss-postal-codes.mjs).
export interface PostalCode {
  npa: string;
  town: string;
}

// Lowercase, accents removed - "zurich" finds "Zürich", "geneve" "Genève".
const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// What the address forms suggest as the NPA field is typed into: leading
// digits match the start of the NPA, the rest anywhere in the town's name
// ("19" → 1950 Sion..., "sion" → 1950 Sion, "1950 sa" → 1950 Savièse...).
// Towns starting with the typed text come first, the list's own NPA order
// is kept otherwise.
export const searchPostalCodes = (codes: PostalCode[], query: string, limit = 20): PostalCode[] => {
  const [, npaPart, townPart] = query.trim().match(/^(\d*)\s*(.*)$/) ?? ['', '', ''];
  const town = normalize(townPart);
  if (!npaPart && !town) {
    return [];
  }

  const matches = codes.filter(code => code.npa.startsWith(npaPart) && normalize(code.town).includes(town));
  if (town) {
    const startsWith = (code: PostalCode) => normalize(code.town).startsWith(town) ? 0 : 1;
    matches.sort((a, b) => startsWith(a) - startsWith(b));
  }
  return matches.slice(0, limit);
};

// "1950 Sion" back into its NPA and town, as an address stores them: the
// leading number is the NPA, the rest the town. Without a leading number
// there's no NPA - it's all the town.
export const splitPostalCodeCity = (text: string): { postalCode: string; city: string } => {
  const match = text.trim().match(/^(\d+)\s+(.+)$/);
  return match ? { postalCode: match[1], city: match[2].trim() } : { postalCode: '', city: text.trim() };
};

// Both an NPA and a town - what an address needs.
export const POSTAL_CODE_CITY_PATTERN = /^\s*\d+\s+\S/;
