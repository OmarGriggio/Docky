import { pool } from "../../shared/config/database";
import { Adresse } from "./adresse.types";

export const getAdressesFromDB = async (id_entreprise: number) => {
  const result = await pool.query("SELECT * FROM adresses WHERE id_entreprise = $1", [id_entreprise]);
  return result.rows;
};

export const getAdressesByClientIdFromDB = async (id_client: number) => {
  const result = await pool.query("SELECT * FROM adresses WHERE id_client = $1", [id_client]);
  return result.rows;
};

export const createAdresseInDB = async (
  adresse: Omit<Adresse, "id">
): Promise<Adresse> => {
  const query = `
    INSERT INTO adresses (
      id_entreprise,
      id_client,
      rue,
      npa,
      ville,
      pays
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    adresse.id_entreprise,
    adresse.id_client,
    adresse.rue,
    adresse.npa,
    adresse.ville,
    adresse.pays
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
