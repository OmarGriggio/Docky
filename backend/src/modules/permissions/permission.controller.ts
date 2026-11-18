import { Request, Response } from "express";
import { permissionsOf } from "./permission.middleware";
import { getEmployeePermissionsServ, updateEmployeePermissionsServ } from "./permission.service";

// What the logged-in user may do - the frontend hides what they can't.
export const getMyPermissions = async (req: Request, res: Response) => {
    res.json(await permissionsOf(req));
};

export const getEmployeePermissions = async (req: Request, res: Response) => {
    res.json(await getEmployeePermissionsServ(req.user.company_id));
};

export const updateEmployeePermissions = async (req: Request, res: Response) => {
    res.json(await updateEmployeePermissionsServ(req.user.company_id, req.body));
};
