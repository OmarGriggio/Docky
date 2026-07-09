import { pool } from "../config/database";
import { OffreService } from "../types/offre_service";

export const getOffreServicesFromDB = async () => {
  const result = await pool.query("SELECT * FROM offre_service");
  return result.rows;
};

export const createOffreServiceInDB = async (
  offreService: OffreService
): Promise<OffreService> => {
  const query = `
    INSERT INTO offre_service (
      id_offre,
      id_employe_categorie,
      pos,
      libelle_service,
      quantite,
      unite,
      tarif,
      rabais
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    offreService.id_offre,
    offreService.id_employe_categorie,
    offreService.pos,
    offreService.libelle_service,
    offreService.quantite,
    offreService.unite,
    offreService.tarif,
    offreService.rabais
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
