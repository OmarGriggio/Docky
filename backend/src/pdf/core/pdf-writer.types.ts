import { PdfFontFamily } from "./pdf-fonts";

export interface PdfTextOptions {
    size?: number;
    bold?: boolean;
    indent?: number;
    marginBottom?: number;
    marginTop?: number;
    // Black when unset.
    color?: PdfColor;
}

export interface PdfDocumentOptions {

    margin?: number;

    pageSize?: [number, number];

    // Helvetica when unset - see pdf-fonts.ts.
    font?: PdfFontFamily;

}

export interface PdfTableColumn {

    key: string;

    title: string;

    width: number;

}

export interface PdfTable {

    columns: PdfTableColumn[];

    rows: Record<string, unknown>[];

}

export interface PdfPoint {
    x: number;
    y: number;
}

export interface PdfColor {
    r: number;
    g: number;
    b: number;
}
