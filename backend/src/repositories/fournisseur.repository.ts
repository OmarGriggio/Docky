import { pool } from "../config/database";
import { Fournisseur } from "../types/fournisseur";

export const getFournisseursFromDB = async () => {
  const result = await pool.query("SELECT * FROM fournisseurs");
  return result.rows;
};

export const getFournisseurByCode = async (code: string) => {
  const result = await pool.query("SELECT * FROM fournisseurs WHERE code_fournisseur = $1", [code]);
  return result.rows[0] ?? null;
};

export const createFournisseurInDB = async (
  fournisseur: Fournisseur
): Promise<Fournisseur> => {
  const query = `
    INSERT INTO fournisseurs (
      code_fournisseur,
      societe,
      adresse,
      categorie
    )
    VALUES ('${fournisseur.code_fournisseur}', '${fournisseur.societe}', '${fournisseur.adresse}', '${fournisseur.categorie}')
    RETURNING *;
  `;

  const result = await pool.query(query);
  return result.rows[0];
};