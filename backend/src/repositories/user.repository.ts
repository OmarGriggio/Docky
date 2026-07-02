import { pool } from "../config/database";
import { CreateUserData, User } from "../types/user";

export const getUsersFromDB = async () => {
    const result = await pool.query("SELECT * FROM utilisateurs");
    return result.rows;
};

export const getUserByEmail = async (email: string) => {
    const result = await pool.query(`SELECT * FROM utilisateurs where email = '${email}'`);
    return result.rows[0] ?? null;
};

export const createUserDB = async (
    userData: CreateUserData
): Promise<User> => {
    const query = `
    INSERT INTO utilisateurs (
      nom,
      prenom,
      email,
      motdepasse_hash
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

    const values = [
        userData.firstname,
        userData.lastname,
        userData.email,
        userData.passwordHash
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};
