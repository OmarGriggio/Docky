import { pool } from "../config/database";

export const getRessourceTarifsFournisseursFromDB = async () => {
  const result = await pool.query("SELECT * FROM ressources_tarifs_fournisseurs");
  return result.rows;
};

export const getRessourceTarifsFournisseursByRessourceIdFromDB = async (id_ressource: number) => {
  const result = await pool.query(
    "SELECT * FROM ressources_tarifs_fournisseurs WHERE id_ressource = $1",
    [id_ressource]
  );
  return result.rows;
};
