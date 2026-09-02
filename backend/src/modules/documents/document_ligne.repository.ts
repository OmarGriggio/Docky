import { pool } from "../../shared/config/database";
import { DocumentLigne } from "./document_ligne.types";

export const getDocumentLignesFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM document_lignes WHERE id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getLignesByDocumentIdFromDB = async (id_document: number, includeArchived = false) => {
  const query = includeArchived
    ? "SELECT * FROM document_lignes WHERE id_document = $1"
    : "SELECT * FROM document_lignes WHERE id_document = $1 AND actif = true";
  const result = await pool.query(query, [id_document]);
  return result.rows;
};

export const getLigneByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM document_lignes WHERE id = $1 AND id_entreprise = $2",
    [id, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const getNextPosForDocumentFromDB = async (id_document: number): Promise<number> => {
  const result = await pool.query(
    "SELECT COALESCE(MAX(pos), 0) + 1 AS next_pos FROM document_lignes WHERE id_document = $1",
    [id_document]
  );
  return Number(result.rows[0].next_pos);
};

export const createLigneInDB = async (
  ligne: Omit<DocumentLigne, "id">
): Promise<DocumentLigne> => {
  const query = `
    INSERT INTO document_lignes (
      id_entreprise,
      id_document,
      pos,
      type,
      libelle,
      quantite,
      unite,
      prix_unitaire,
      rabais,
      actif
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    ligne.id_entreprise,
    ligne.id_document,
    ligne.pos,
    ligne.type,
    ligne.libelle,
    ligne.quantite,
    ligne.unite,
    ligne.prix_unitaire,
    ligne.rabais,
    ligne.actif
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const archiveLigneInDB = async (id: number, id_entreprise: number): Promise<DocumentLigne> => {
  const query = `
    UPDATE document_lignes SET actif = false
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};

export const unarchiveLigneInDB = async (id: number, id_entreprise: number): Promise<DocumentLigne> => {
  const query = `
    UPDATE document_lignes SET actif = true
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};
