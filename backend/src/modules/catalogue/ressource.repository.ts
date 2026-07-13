import { pool } from "../../shared/config/database";

export const getRessourcesFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM ressources WHERE id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getRessourcesByTypeFromDB = async (type: string, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM ressources WHERE type = $1 AND id_entreprise = $2",
    [type, id_entreprise]
  );
  return result.rows;
};
