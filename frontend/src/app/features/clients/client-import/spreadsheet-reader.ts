import { cellText } from './import-columns';

// A spreadsheet read in the browser - the file is never uploaded, only the
// rows the user then imports. One entry per sheet (a CSV has one), every cell
// as text, every row as wide as the widest.
export interface Spreadsheet {
  name: string;
  rows: string[][];
}

const square = (rows: string[][]): string[][] => {
  const width = Math.max(0, ...rows.map(row => row.length));
  return rows.map(row => [...row, ...Array(width - row.length).fill('')]);
};

// A CSV saved by Excel on a Swiss/French Windows is often not UTF-8 but
// Windows-1252 ("Genève" would come out garbled) - UTF-8 first, strictly,
// that one otherwise. A BOM is dropped.
const readText = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return text.replace(/^﻿/, '');
};

export const isCsv = (file: File): boolean => /\.csv$/i.test(file.name) || file.type === 'text/csv';

// The libraries are loaded only here, when a file is picked - out of every
// other page's bundle. papaparse guesses the separator (Excel in Switzerland
// writes ";").
export const readSpreadsheet = async (file: File): Promise<Spreadsheet[]> => {
  if (isCsv(file)) {
    const { default: Papa } = await import('papaparse');
    const parsed = Papa.parse<string[]>(await readText(file), { skipEmptyLines: false });
    return [{ name: file.name, rows: square(parsed.data.map(row => row.map(cellText))) }];
  }
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  const sheets = await readXlsxFile(file);
  return sheets.map(sheet => ({ name: sheet.sheet, rows: square(sheet.data.map(row => row.map(cellText))) }));
};
