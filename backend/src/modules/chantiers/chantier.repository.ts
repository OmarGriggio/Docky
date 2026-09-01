import { pool } from "../../shared/config/database";
import { Chantier, ChantierWithType, CreateChantierData } from "./chantier.types";

export const getChantiersFromDB = async (id_entreprise: number): Promise<ChantierWithType[]> => {
  const query = `
    SELECT
      c.id,
      c.id_client,
      tc.libelle AS type_chantier,
      c.nom,
      c.remarque,
      c.adresse_identique_client,
      c.rue,
      c.npa,
      c.ville,
      c.pays,
      c.date_creation
    FROM chantiers c
    JOIN types_chantier tc ON tc.id = c.id_type_chantier
    WHERE c.id_entreprise = $1
  `;

  const result = await pool.query(query, [id_entreprise]);
  return result.rows;
};

export const getChantierByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM chantiers WHERE id = $1 AND id_entreprise = $2",
    [id, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const createChantierInDB = async (
  chantier: CreateChantierData & { id_entreprise: number }
): Promise<Chantier> => {
  const query = `
    INSERT INTO chantiers (
      id_entreprise,
      id_client,
      id_type_chantier,
      nom,
      remarque,
      adresse_identique_client,
      rue,
      npa,
      ville,
      pays
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const values = [
    chantier.id_entreprise,
    chantier.id_client,
    chantier.id_type_chantier,
    chantier.nom,
    chantier.remarque ?? null,
    chantier.adresse_identique_client,
    chantier.rue ?? null,
    chantier.npa ?? null,
    chantier.ville ?? null,
    chantier.pays ?? null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const deleteChantierInDB = async (
  id: number,
  id_entreprise: number
): Promise<Chantier> => {
  const query = `
    DELETE FROM chantiers
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};
