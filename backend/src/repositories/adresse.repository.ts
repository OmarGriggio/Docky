import { pool } from "../config/database";
import { Adresse } from "../types/adresse";

export const getAdressesFromDB = async () => {
  const result = await pool.query("SELECT * FROM adresses");
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
      id_client,
      rue,
      npa,
      ville,
      pays
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    adresse.id_client,
    adresse.rue,
    adresse.npa,
    adresse.ville,
    adresse.pays
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
