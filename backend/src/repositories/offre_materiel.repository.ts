import { pool } from "../config/database";
import { OffreMateriel } from "../types/offre_materiel";

export const getOffreMaterielsFromDB = async () => {
  const result = await pool.query("SELECT * FROM offre_materiel");
  return result.rows;
};

export const createOffreMaterielInDB = async (
  offreMateriel: OffreMateriel
): Promise<OffreMateriel> => {
  const query = `
    INSERT INTO offre_materiel (
      id_offre,
      id_tarifs_materiel,
      pos,
      ref_materiel,
      libelle_materiel,
      quantite,
      tarif,
      rabais
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    offreMateriel.id_offre,
    offreMateriel.id_tarifs_materiel,
    offreMateriel.pos,
    offreMateriel.ref_materiel,
    offreMateriel.libelle_materiel,
    offreMateriel.quantite,
    offreMateriel.tarif,
    offreMateriel.rabais
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
