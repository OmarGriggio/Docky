import { AppError } from "../../shared/types/errors";
import { DEFAULT_NUMBER_FORMATS, formatNumber, nextSequence, numberPattern, parseNumberFormat, resetsEveryYear } from "../../shared/numbering/number-format";
import { getHighestSequenceFromDB, isDocumentNumberTakenInDB } from "../documents/document.repository";
import { getHighestClientSequenceFromDB, isClientNumberTakenInDB } from "../clients/client.repository";
import { getHighestResourceSequenceFromDB, isResourceCodeTakenInDB } from "../catalog/resource.repository";
import { getNumberingFromDB, upsertNumberingInDB } from "./numbering.repository";
import { NUMBERED_TYPES, NumberedType, NumberingSettings, NumberingView } from "./numbering.types";

// A company's numbering (Paramètres > Numérotation, the numbering table): its
// own format and the number it starts from for its quotes, invoices, clients,
// materials and services - the default format without one. The number itself
// is still worked out from the numbers already given out (no counter - see
// zz_docs/Decisions.md), under the lock of whatever creates the row: the
// documents' numbering lock, the clients' or the resources' own.

type SeriesType = NumberedType | "PROJECT";

// Where a type's numbers live - the numbers already given out are looked for
// in its whole table, whatever type gave them - and the other types sharing
// that table: one's format can't be another's, two types sharing one
// sequence would read as each other's.
interface Series {
    highest: (company_id: number, pattern: string) => Promise<number | null>;
    taken: (company_id: number, number: string) => Promise<boolean>;
    siblings: SeriesType[];
}

const documents = { highest: getHighestSequenceFromDB, taken: isDocumentNumberTakenInDB };
const resources = { highest: getHighestResourceSequenceFromDB, taken: isResourceCodeTakenInDB };
const SERIES: Record<SeriesType, Series> = {
    QUOTE: { ...documents, siblings: ["INVOICE", "PROJECT"] },
    INVOICE: { ...documents, siblings: ["QUOTE", "PROJECT"] },
    PROJECT: { ...documents, siblings: ["QUOTE", "INVOICE"] },
    CLIENT: { highest: getHighestClientSequenceFromDB, taken: isClientNumberTakenInDB, siblings: [] },
    MATERIAL: { ...resources, siblings: ["SERVICE"] },
    SERVICE: { ...resources, siblings: ["MATERIAL"] },
};

const defaultsOf = (type: SeriesType): NumberingSettings =>
    ({ number_format: DEFAULT_NUMBER_FORMATS[type], start_number: null, start_year: null });

/** A type's settings - the company's own, or the default format. */
export const getNumberingSettingsServ = async (company_id: number, type: SeriesType): Promise<NumberingSettings> =>
    (type === "PROJECT" ? null : await getNumberingFromDB(company_id, type)) ?? defaultsOf(type);

/** The number the next one of this type gets with these settings - one past the highest given out, at least the start, never one already taken (another format can produce the same). Call under the type's own lock to give it out. */
const nextNumberWith = async (company_id: number, type: SeriesType, settings: NumberingSettings, year = new Date().getFullYear()): Promise<string> => {
    const series = SERIES[type];
    const format = settings.number_format;
    const highest = await series.highest(company_id, numberPattern(format, year));
    let sequence = nextSequence(highest, { start: settings.start_number, startYear: settings.start_year, year, yearly: resetsEveryYear(format) });
    let number = formatNumber(format, year, sequence);
    while (await series.taken(company_id, number)) {
        number = formatNumber(format, year, ++sequence);
    }
    return number;
};

/** The next number of this type, in the company's format - under its lock (the documents', clients' or resources' numbering lock), the row created in the same transaction. */
export const nextNumberServ = async (company_id: number, type: SeriesType): Promise<string> =>
    nextNumberWith(company_id, type, await getNumberingSettingsServ(company_id, type));

export const getNumberingServ = async (company_id: number): Promise<NumberingView[]> =>
    Promise.all(NUMBERED_TYPES.map(async type => {
        const settings = await getNumberingSettingsServ(company_id, type);
        return { type, number_format: settings.number_format, start_number: settings.start_number, next_number: await nextNumberWith(company_id, type, settings) };
    }));

const isNumberedType = (value: unknown): value is NumberedType =>
    (NUMBERED_TYPES as unknown[]).includes(value);

// A format as typed, checked: a 400 whose code says what's wrong with it
// (NUMBER_FORMAT_NO_SEQUENCE...), translated by the frontend - and not the
// format of another type sharing its table (NUMBER_FORMAT_TAKEN).
const checkedSettings = async (
    company_id: number,
    type: NumberedType,
    data: { number_format?: unknown; start_number?: unknown },
): Promise<NumberingSettings> => {
    const format = typeof data.number_format === "string" ? data.number_format.trim() : "";
    const parsed = parseNumberFormat(format);
    if ("error" in parsed) {
        throw new AppError(`Invalid number format: ${parsed.error}`, 400, `NUMBER_FORMAT_${parsed.error}`);
    }
    const others = await Promise.all(SERIES[type].siblings.map(async sibling => (await getNumberingSettingsServ(company_id, sibling)).number_format));
    if (others.includes(format)) {
        throw new AppError("This format is already another type's", 400, "NUMBER_FORMAT_TAKEN");
    }

    const start = data.start_number;
    if (start !== null && start !== undefined && start !== "" && !(Number.isInteger(start) && (start as number) >= 1 && (start as number) <= 99999999)) {
        throw new AppError("start_number must be a whole number between 1 and 99999999", 400, "NUMBER_START_INVALID");
    }
    const startNumber = start === null || start === undefined || start === "" ? null : start as number;
    return { number_format: format, start_number: startNumber, start_year: startNumber === null ? null : new Date().getFullYear() };
};

const assertNumberedType: (type: unknown) => asserts type is NumberedType = type => {
    if (!isNumberedType(type)) {
        throw new AppError(`type must be one of ${NUMBERED_TYPES.join(", ")}`, 400);
    }
};

export const updateNumberingServ = async (company_id: number, type: unknown, data: { number_format?: unknown; start_number?: unknown }): Promise<NumberingView> => {
    assertNumberedType(type);
    const settings = await checkedSettings(company_id, type, data);
    const saved = await upsertNumberingInDB({ company_id, type, ...settings });
    return { type, number_format: saved.number_format, start_number: saved.start_number, next_number: await nextNumberWith(company_id, type, saved) };
};

/** The number the next one would get with settings not saved yet - the page's live preview. Same checks as saving. */
export const previewNumberingServ = async (company_id: number, type: unknown, data: { number_format?: unknown; start_number?: unknown }): Promise<{ next_number: string }> => {
    assertNumberedType(type);
    return { next_number: await nextNumberWith(company_id, type, await checkedSettings(company_id, type, data)) };
};
