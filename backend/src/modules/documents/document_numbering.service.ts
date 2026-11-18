import { AppError } from "../../shared/types/errors";
import { getHighestSequenceFromDB, isDocumentNumberTakenInDB } from "./document.repository";
import { DocumentType } from "./document.types";
import { DEFAULT_NUMBER_FORMATS, formatDocumentNumber, nextSequence, numberPattern, parseNumberFormat, resetsEveryYear } from "./document-number-format";
import { getNumberingFromDB, upsertNumberingInDB } from "./document_numbering.repository";
import { DocumentNumbering, DocumentNumberingView, NUMBERED_DOCUMENT_TYPES, NumberedDocumentType } from "./document_numbering.types";

// A company's numbering of its quotes and invoices (Paramètres > Numérotation,
// 022_add_document_numbering.sql): its own format and the number it starts
// from, the default format without one. The number itself is still worked
// out from the numbers already given out (no counter), under the numbering
// lock - see document.service.ts's generateDocumentNumber.

type NumberingSettings = Pick<DocumentNumbering, "number_format" | "start_number" | "start_year">;

const defaultsOf = (type: DocumentType): NumberingSettings =>
    ({ number_format: DEFAULT_NUMBER_FORMATS[type], start_number: null, start_year: null });

const settingsOf = async (company_id: number, type: DocumentType): Promise<NumberingSettings> =>
    (type === "PROJECT" ? null : await getNumberingFromDB(company_id, type)) ?? defaultsOf(type);

/** The number the next document of this type gets with these settings - one past the highest given out, at least the start, never one already taken (another format can produce the same). Call under the numbering lock to give it out. */
export const nextNumberWith = async (company_id: number, settings: NumberingSettings, year = new Date().getFullYear()): Promise<string> => {
    const format = settings.number_format;
    const highest = await getHighestSequenceFromDB(company_id, numberPattern(format, year));
    let sequence = nextSequence(highest, { start: settings.start_number, startYear: settings.start_year, year, yearly: resetsEveryYear(format) });
    let number = formatDocumentNumber(format, year, sequence);
    while (await isDocumentNumberTakenInDB(company_id, number)) {
        number = formatDocumentNumber(format, year, ++sequence);
    }
    return number;
};

export const nextDocumentNumber = async (company_id: number, type: DocumentType): Promise<string> =>
    nextNumberWith(company_id, await settingsOf(company_id, type));

export const getNumberingServ = async (company_id: number): Promise<DocumentNumberingView[]> =>
    Promise.all(NUMBERED_DOCUMENT_TYPES.map(async type => {
        const settings = await settingsOf(company_id, type);
        return { type, number_format: settings.number_format, start_number: settings.start_number, next_number: await nextNumberWith(company_id, settings) };
    }));

const isNumberedType = (value: unknown): value is NumberedDocumentType =>
    (NUMBERED_DOCUMENT_TYPES as unknown[]).includes(value);

// A format as typed, checked: a 400 whose code says what's wrong with it
// (NUMBER_FORMAT_NO_SEQUENCE...), translated by the frontend. Not the other
// type's own format, nor a chantier's: two types sharing one sequence would
// read as each other's.
const checkedSettings = async (
    company_id: number,
    type: NumberedDocumentType,
    data: { number_format?: unknown; start_number?: unknown },
): Promise<NumberingSettings> => {
    const format = typeof data.number_format === "string" ? data.number_format.trim() : "";
    const parsed = parseNumberFormat(format);
    if ("error" in parsed) {
        throw new AppError(`Invalid number format: ${parsed.error}`, 400, `NUMBER_FORMAT_${parsed.error}`);
    }
    const otherType = type === "QUOTE" ? "INVOICE" : "QUOTE";
    const others = [(await settingsOf(company_id, otherType)).number_format, DEFAULT_NUMBER_FORMATS.PROJECT];
    if (others.includes(format)) {
        throw new AppError("This format is already another document type's", 400, "NUMBER_FORMAT_TAKEN");
    }

    const start = data.start_number;
    if (start !== null && start !== undefined && start !== "" && !(Number.isInteger(start) && (start as number) >= 1 && (start as number) <= 99999999)) {
        throw new AppError("start_number must be a whole number between 1 and 99999999", 400, "NUMBER_START_INVALID");
    }
    const startNumber = start === null || start === undefined || start === "" ? null : start as number;
    return { number_format: format, start_number: startNumber, start_year: startNumber === null ? null : new Date().getFullYear() };
};

export const updateNumberingServ = async (company_id: number, type: unknown, data: { number_format?: unknown; start_number?: unknown }): Promise<DocumentNumberingView> => {
    if (!isNumberedType(type)) {
        throw new AppError("Only quotes and invoices are numbered this way", 400);
    }
    const settings = await checkedSettings(company_id, type, data);
    const saved = await upsertNumberingInDB({ company_id, type, ...settings });
    return { type, number_format: saved.number_format, start_number: saved.start_number, next_number: await nextNumberWith(company_id, saved) };
};

/** The number the next document would get with settings not saved yet - the page's live preview. Same checks as saving. */
export const previewNumberingServ = async (company_id: number, type: unknown, data: { number_format?: unknown; start_number?: unknown }): Promise<{ next_number: string }> => {
    if (!isNumberedType(type)) {
        throw new AppError("Only quotes and invoices are numbered this way", 400);
    }
    return { next_number: await nextNumberWith(company_id, await checkedSettings(company_id, type, data)) };
};
