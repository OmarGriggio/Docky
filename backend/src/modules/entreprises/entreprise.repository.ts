import { pool } from "../../shared/config/database";
import { Entreprise } from "./entreprise.types";

export const getEntreprisesFromDB = async () => {
  const result = await pool.query("SELECT * FROM entreprises");
  return result.rows;
};

export const getEntrepriseByIdFromDB = async (id: number) => {
  const result = await pool.query("SELECT * FROM entreprises where id = $1", [id]);
  return result.rows[0] ?? null;
};

export const createEntrepriseInDB = async (
    entreprise: Omit<Entreprise, "id">
): Promise<Entreprise> => {
    const query = `
    INSERT INTO entreprises (
      nom_entreprise, email, telephone, iban, rue, npa, ville, pays, logo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
    const values = [
      entreprise.nom_entreprise, 
      entreprise.email, 
      entreprise.telephone,
      entreprise.iban,
      entreprise.rue,
      entreprise.npa, 
      entreprise.ville, 
      entreprise.pays, 
      entreprise.logo
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
};
