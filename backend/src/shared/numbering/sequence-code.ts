// A company's next generated code - a client's number ("C0001") or a
// resource's code ("MAT0001", "SER0001"): the prefix and the highest number
// already used with it, plus one, on at least four digits. Past 9999 it
// simply grows ("C10000"). The highest number is the repository's to find -
// archived rows included, so a code is never handed out twice.
export const SEQUENCE_DIGITS = 4;

export const nextSequenceCode = (prefix: string, lastNumber: number | null): string =>
    `${prefix}${String((lastNumber ?? 0) + 1).padStart(SEQUENCE_DIGITS, "0")}`;

// The SQL regex a code must match to count - the prefix then digits only,
// so a code typed by hand before generation ("APPR-1", "MAT101b") is left
// out. Nine digits at most: it's cast to an integer.
export const sequencePattern = (prefix: string): string => `^${prefix}([0-9]{1,9})$`;
