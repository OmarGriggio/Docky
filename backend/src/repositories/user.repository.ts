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
    VALUES ('${userData.firstname}', '${userData.lastname}', '${userData.email}', '${userData.passwordHash}')
    RETURNING *;
  `;

    const result = await pool.query(query);
    return result.rows[0];
};
