import { pool } from "../../shared/config/database";
import { CreateUserData, User } from "./user.types";

export const getUsersFromDB = async (id_entreprise: number) => {
    const result = await pool.query("SELECT * FROM utilisateurs WHERE id_entreprise = $1", [id_entreprise]);
    return result.rows;
};

export const getUserByEmail = async (email: string) => {
    const result = await pool.query("SELECT * FROM utilisateurs where email = $1", [email]);
    return result.rows[0];
};

export const deleteUserDB = async (id: Number) => {
    const result = await pool.query("DELETE FROM utilisateurs where id = $1", [id]);
    return result.rows[0];
};

export const createUserDB = async (
    userData: CreateUserData
): Promise<User> => {
    const query = `
    INSERT INTO utilisateurs (
      id_entreprise,
      role,
      nom,
      prenom,
      email,
      motdepasse_hash
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

    const values = [
      userData.id_entreprise,
      userData.role,
      userData.firstname,
      userData.lastname,
      userData.email,
      userData.passwordHash
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};
