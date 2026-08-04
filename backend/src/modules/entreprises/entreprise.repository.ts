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

export const updateEntrepriseInDB = async (
    id: number,
    entreprise: Omit<Entreprise, "id">
): Promise<Entreprise> => {
    const query = `
    UPDATE entreprises
    SET
      nom_entreprise = $1,
      email = $2,
      telephone = $3,
      iban = $4,
      rue = $5,
      npa = $6,
      ville = $7,
      pays = $8,
      logo = $9
    WHERE id = $10
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
      entreprise.logo,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0] ?? null;
};

export const updateEntrepriseLogoInDB = async (id: number, logo: string) => {
    const result = await pool.query(
        "UPDATE entreprises SET logo = $1 WHERE id = $2 RETURNING *",
        [logo, id]
    );
    return result.rows[0] ?? null;
};
