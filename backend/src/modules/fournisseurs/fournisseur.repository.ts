import { pool } from "../../shared/config/database";
import { Fournisseur } from "./fournisseur.types";

export const getFournisseursFromDB = async (id_entreprise: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM fournisseurs WHERE id_entreprise = $1"
    : "SELECT * FROM fournisseurs WHERE id_entreprise = $1 AND actif = true";
  const result = await pool.query(query, [id_entreprise]);
  return result.rows;
};

export const getFournisseurByCode = async (code: string) => {
  const result = await pool.query("SELECT * FROM fournisseurs WHERE code_fournisseur = $1", [code]);
  return result.rows[0] ?? null;
};

export const getFournisseurByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM fournisseurs WHERE id = $1 AND id_entreprise = $2",
    [id, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const archiveFournisseurInDB = async (
  id: number,
  id_entreprise: number
): Promise<Fournisseur> => {
  const query = `
    UPDATE fournisseurs SET actif = false
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};

export const unarchiveFournisseurInDB = async (
  id: number,
  id_entreprise: number
): Promise<Fournisseur> => {
  const query = `
    UPDATE fournisseurs SET actif = true
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
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