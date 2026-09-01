import { pool } from "../../shared/config/database";
import { Fournisseur } from "./fournisseur.types";

export const getFournisseursFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM fournisseurs WHERE id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getFournisseurByCode = async (code: string) => {
  const result = await pool.query("SELECT * FROM fournisseurs WHERE code_fournisseur = $1", [code]);
  return result.rows[0] ?? null;
};

export const getFournisseurByCodeForEntreprise = async (code: string, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM fournisseurs WHERE code_fournisseur = $1 AND id_entreprise = $2",
    [code, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const deleteFournisseurInDB = async (
  code_fournisseur: string,
  id_entreprise: number
): Promise<Fournisseur> => {
  const query = `
    DELETE FROM fournisseurs
      WHERE code_fournisseur = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [code_fournisseur, id_entreprise]);
  return result.rows[0];
};

export const createFournisseurInDB = async (
  fournisseur: Omit<Fournisseur, "id">
): Promise<Fournisseur> => {
  const query = `
    INSERT INTO fournisseurs (
      id_entreprise,
      code_fournisseur,
      societe,
      adresse,
      categorie
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    fournisseur.id_entreprise,
    fournisseur.code_fournisseur,
    fournisseur.societe,
    fournisseur.adresse,
    fournisseur.categorie
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};