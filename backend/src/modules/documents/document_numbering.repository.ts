import { db } from "../../shared/config/database";
import { DocumentNumbering, NumberedDocumentType } from "./document_numbering.types";

export const getNumberingFromDB = async (company_id: number, type: NumberedDocumentType): Promise<DocumentNumbering | null> => {
    const result = await db().query(
        "SELECT * FROM document_numbering WHERE company_id = $1 AND type = $2",
        [company_id, type]
    );
    return result.rows[0] ?? null;
};

// At most one row per (company_id, type).
export const upsertNumberingInDB = async (numbering: DocumentNumbering): Promise<DocumentNumbering> => {
    const result = await db().query(
        `INSERT INTO document_numbering (company_id, type, number_format, start_number, start_year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, type)
         DO UPDATE SET number_format = EXCLUDED.number_format, start_number = EXCLUDED.start_number, start_year = EXCLUDED.start_year
         RETURNING *`,
        [numbering.company_id, numbering.type, numbering.number_format, numbering.start_number, numbering.start_year]
    );
    return result.rows[0];
};
