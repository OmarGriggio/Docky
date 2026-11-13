// "1950 Sion" → NPA + town; a number alone is an NPA; anything else is all
// the town - the same rule as the frontend's splitPostalCodeCity.
export const splitPostalCodeCity = (value: string): { postalCode: string; city: string } => {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return { postalCode: trimmed, city: "" };
  }
  const match = trimmed.match(/^(\d+)\s+(.+)$/);
  return match ? { postalCode: match[1], city: match[2].trim() } : { postalCode: "", city: trimmed };
};
