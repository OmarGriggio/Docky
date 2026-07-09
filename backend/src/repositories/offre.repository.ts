import { pool } from "../config/database";
import { Offre } from "../types/offre";

export const getOffresFromDB = async () => {
  const result = await pool.query("SELECT * FROM offres");
  return result.rows;
};

export const getOffreByNumFromDB = async (num_offre: string) => {
  const result = await pool.query("SELECT * FROM offres WHERE num_offre = $1", [num_offre]);
  return result.rows[0] ?? null;
};

export const createOffreInDB = async (
  offre: Offre
): Promise<Offre> => {
  const query = `
    INSERT INTO offres (
      id_client,
      num_offre,
      date,
      montant_ht,
      montant_ttc,
      rabais,
      statut
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    offre.id_client,
    offre.num_offre,
    offre.date,
    offre.montant_ht,
    offre.montant_ttc,
    offre.rabais,
    offre.statut
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
