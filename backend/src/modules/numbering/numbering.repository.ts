import { db } from "../../shared/config/database";
import { Numbering, NumberedType } from "./numbering.types";

export const getNumberingFromDB = async (company_id: number, type: NumberedType): Promise<Numbering | null> => {
    const result = await db().query(
        "SELECT * FROM numbering WHERE company_id = $1 AND type = $2",
        [company_id, type]
    );
    return result.rows[0] ?? null;
};

// At most one row per (company_id, type).
export const upsertNumberingInDB = async (numbering: Numbering): Promise<Numbering> => {
    const result = await db().query(
        `INSERT INTO numbering (company_id, type, number_format, start_number, start_year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, type)
         DO UPDATE SET number_format = EXCLUDED.number_format, start_number = EXCLUDED.start_number, start_year = EXCLUDED.start_year
         RETURNING *`,
        [numbering.company_id, numbering.type, numbering.number_format, numbering.start_number, numbering.start_year]
    );
    return result.rows[0];
};
