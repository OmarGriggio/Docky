import { pool } from "../../shared/config/database";

export const getRessourceTarifsFournisseursFromDB = async (id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM ressources_tarifs_fournisseurs WHERE id_entreprise = $1",
    [id_entreprise]
  );
  return result.rows;
};

export const getRessourceTarifsFournisseursByRessourceIdFromDB = async (id_ressource: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM ressources_tarifs_fournisseurs WHERE id_ressource = $1 AND id_entreprise = $2",
    [id_ressource, id_entreprise]
  );
  return result.rows;
};
