export interface PdfTextOptions {
    size?: number;
    bold?: boolean;
    indent?: number;
    marginBottom?: number;
    marginTop?: number;
    // Only used by drawTextAt/drawTextRightAt - black when unset.
    color?: PdfColor;
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

export interface PdfPoint {
    x: number;
    y: number;
}

export interface PdfColor {
    r: number;
    g: number;
    b: number;
}
