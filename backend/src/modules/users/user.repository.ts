import { pool } from "../../shared/config/database";
import { CreateUserData, Language, PublicUser } from "./user.types";

// Every column except password_hash - what any response sent back to a client
// selects/returns. Only getUserByEmail (login's own password check) needs the hash.
const PUBLIC_COLUMNS = "id, company_id, role, last_name, first_name, email, created_at, updated_at, last_login_at, is_active, language";

export const getUsersFromDB = async (company_id: number) => {
    const result = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE company_id = $1`, [company_id]);
    return result.rows;
};

export const getUserByEmail = async (email: string) => {
    const result = await pool.query("SELECT * FROM users where email = $1", [email]);
    return result.rows[0];
};

export const getUserByIdForCompany = async (id: Number, company_id: number) => {
    const result = await pool.query(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1 AND company_id = $2`,
        [id, company_id]
    );
    return result.rows[0] ?? null;
};

export const deleteUserDB = async (id: Number, company_id: number) => {
    const result = await pool.query(
        `DELETE FROM users WHERE id = $1 AND company_id = $2 RETURNING ${PUBLIC_COLUMNS}`,
        [id, company_id]
    );
    return result.rows[0];
};

export const createUserDB = async (
    userData: CreateUserData
): Promise<PublicUser> => {
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
    RETURNING ${PUBLIC_COLUMNS};
  `;

    const values = [
      userData.company_id,
      userData.role,
      userData.lastname,
      userData.firstname,
      userData.email,
      userData.passwordHash
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const updateUserLanguageDB = async (id: number, language: Language) => {
    const result = await pool.query(
        `UPDATE users SET language = $1 WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`,
        [language, id]
    );
    return result.rows[0] ?? null;
};
