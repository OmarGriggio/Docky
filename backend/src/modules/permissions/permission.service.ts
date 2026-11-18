import { AppError } from "../../shared/types/errors";
import { TokenPayload } from "../../shared/middlewares/jwt.service";
import { getEmployeePermissionsFromDB, upsertEmployeePermissionsInDB } from "./permission.repository";
import { DEFAULT_EMPLOYEE_PERMISSIONS, FULL_PERMISSIONS, normalizePermissions, Permissions } from "./permissions";

/** The company's employees' permissions as set by its admin - the defaults without any. */
export const getEmployeePermissionsServ = async (company_id: number): Promise<Permissions> =>
    normalizePermissions(await getEmployeePermissionsFromDB(company_id)) ?? DEFAULT_EMPLOYEE_PERMISSIONS;

/** What this user may do: an employee (USER) their company's employee permissions, anyone else everything. */
export const getPermissionsOfServ = async (user: TokenPayload): Promise<Permissions> =>
    user.role === "USER" ? getEmployeePermissionsServ(user.company_id) : FULL_PERMISSIONS;

export const updateEmployeePermissionsServ = async (company_id: number, input: unknown): Promise<Permissions> => {
    const permissions = normalizePermissions(input);
    if (!permissions) {
        throw new AppError("permissions must be an object with modules and prices", 400);
    }
    await upsertEmployeePermissionsInDB(company_id, permissions);
    return permissions;
};
