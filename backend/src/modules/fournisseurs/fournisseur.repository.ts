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

export const deleteFournisseurInDB = async (
  code_fournisseur: string
): Promise<Fournisseur> => {
  const query = `
    DELETE FROM fournisseurs
      WHERE code_fournisseur = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [code_fournisseur]);
  return result.rows[0];
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
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [
    fournisseur.code_fournisseur,
    fournisseur.societe,
    fournisseur.adresse,
    fournisseur.categorie
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};