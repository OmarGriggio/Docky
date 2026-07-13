export interface PdfTextOptions {

    size?: number;

    bold?: boolean;

}

export interface PdfDocumentOptions {

    margin?: number;

    pageSize?: [number, number];

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
