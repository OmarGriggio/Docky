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

export const getAdressesByFournisseurIdFromDB = async (id_fournisseur: number) => {
  const result = await pool.query("SELECT * FROM adresses WHERE id_fournisseur = $1", [id_fournisseur]);
  return result.rows;
};

export const getAdresseByIdFromDB = async (id: number, id_entreprise: number) => {
  const result = await pool.query(
    "SELECT * FROM adresses WHERE id = $1 AND id_entreprise = $2",
    [id, id_entreprise]
  );
  return result.rows[0] ?? null;
};

export const deleteAdresseInDB = async (id: number, id_entreprise: number): Promise<Adresse> => {
  const query = `
    DELETE FROM adresses
      WHERE id = $1 AND id_entreprise = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [id, id_entreprise]);
  return result.rows[0];
};

export const unsetPrincipaleForClientInDB = async (id_client: number, id_entreprise: number) => {
  await pool.query(
    "UPDATE adresses SET principale = false WHERE id_client = $1 AND id_entreprise = $2 AND principale = true",
    [id_client, id_entreprise]
  );
};

export const unsetPrincipaleForFournisseurInDB = async (id_fournisseur: number, id_entreprise: number) => {
  await pool.query(
    "UPDATE adresses SET principale = false WHERE id_fournisseur = $1 AND id_entreprise = $2 AND principale = true",
    [id_fournisseur, id_entreprise]
  );
};

export const createAdresseInDB = async (
  adresse: Omit<Adresse, "id">
): Promise<Adresse> => {
  const query = `
    INSERT INTO adresses (
      id_entreprise,
      id_client,
      id_fournisseur,
      principale,
      rue,
      npa,
      ville,
      pays
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    adresse.id_entreprise,
    adresse.id_client,
    adresse.id_fournisseur,
    adresse.principale,
    adresse.rue,
    adresse.npa,
    adresse.ville,
    adresse.pays
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
