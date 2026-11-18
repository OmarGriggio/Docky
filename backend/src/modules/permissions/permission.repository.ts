import { db } from "../../shared/config/database";

export const getEmployeePermissionsFromDB = async (company_id: number): Promise<unknown | null> => {
    const result = await db().query("SELECT permissions FROM employee_permissions WHERE company_id = $1", [company_id]);
    return result.rows[0]?.permissions ?? null;
};

export const upsertEmployeePermissionsInDB = async (company_id: number, permissions: unknown): Promise<void> => {
    await db().query(
        `INSERT INTO employee_permissions (company_id, permissions) VALUES ($1, $2)
         ON CONFLICT (company_id) DO UPDATE SET permissions = EXCLUDED.permissions`,
        [company_id, JSON.stringify(permissions)]
    );
};
