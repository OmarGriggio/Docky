import { pool } from "../../shared/config/database";
import { CreateUserData, User } from "./user.types";

export const getUsersFromDB = async (company_id: number) => {
    const result = await pool.query("SELECT * FROM users WHERE company_id = $1", [company_id]);
    return result.rows;
};

export const getUserByEmail = async (email: string) => {
    const result = await pool.query("SELECT * FROM users where email = $1", [email]);
    return result.rows[0];
};

export const getUserByIdForCompany = async (id: Number, company_id: number) => {
    const result = await pool.query(
        "SELECT * FROM users WHERE id = $1 AND company_id = $2",
        [id, company_id]
    );
    return result.rows[0] ?? null;
};

export const deleteUserDB = async (id: Number, company_id: number) => {
    const result = await pool.query(
        "DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING *",
        [id, company_id]
    );
    return result.rows[0];
};

export const createUserDB = async (
    userData: CreateUserData
): Promise<User> => {
    const query = `
    INSERT INTO users (
      company_id,
      role,
      last_name,
      first_name,
      email,
      password_hash
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

    const values = [
      userData.company_id,
      userData.role,
      userData.firstname,
      userData.lastname,
      userData.email,
      userData.passwordHash
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};
