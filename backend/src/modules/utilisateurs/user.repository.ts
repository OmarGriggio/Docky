import { pool } from "../../shared/config/database";
import { CreateUserData, User } from "./user.types";

export const getUsersFromDB = async () => {
    const result = await pool.query("SELECT * FROM utilisateurs");
    return result.rows;
};

export const getUserByEmail = async (email: string) => {
    const result = await pool.query("SELECT * FROM utilisateurs where email = $1", [email]);
    return result.rows[0];
};

export const createUserDB = async (
    userData: CreateUserData
): Promise<User> => {
    const query = `
    INSERT INTO utilisateurs (
      id_entreprise,
      nom,
      prenom,
      email,
      motdepasse_hash
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

    const values = [
      userData.id_entreprise,
      userData.firstname,
      userData.lastname,
      userData.email,
      userData.passwordHash
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};
