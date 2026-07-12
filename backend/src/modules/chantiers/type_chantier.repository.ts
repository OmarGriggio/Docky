import { pool } from "../../shared/config/database";
import { TypeChantier } from "./type_chantier.types";

export const getTypesChantierFromDB = async () => {
  const result = await pool.query("SELECT * FROM types_chantier");
  return result.rows;
};

export const getTypeChantierByIdFromDB = async (id: number) => {
  const result = await pool.query("SELECT * FROM types_chantier WHERE id = $1", [id]);
  return result.rows[0] ?? null;
};

export const createTypeChantierInDB = async (
  typeChantier: Omit<TypeChantier, "id">
): Promise<TypeChantier> => {
  const query = `
    INSERT INTO types_chantier (libelle)
    VALUES ($1)
    RETURNING *;
  `;

  const result = await pool.query(query, [typeChantier.libelle]);
  return result.rows[0];
};

export const deleteTypeChantierInDB = async (
  id: number
): Promise<TypeChantier> => {
  const query = `
    UPDATE chantiers SET id_type_chantier = NULL 
      WHERE id_type_chantier = $1;
    DELETE FROM types_chantier
      WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};
