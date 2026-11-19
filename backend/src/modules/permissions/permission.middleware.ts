import { NextFunction, Request, Response } from "express";
import { AppError, ForbiddenError } from "../../shared/types/errors";
import { getDocumentByIdFromDB } from "../documents/document.repository";
import { getSectionByIdFromDB } from "../documents/document_section.repository";
import { getLineByIdFromDB } from "../documents/document_line.repository";
import { getPermissionsOfServ } from "./permission.service";
import { AccessLevel, allows, moduleOfDocumentType, PERMISSION_MODULES, PermissionModule, Permissions } from "./permissions";

// Route guards for the employee permissions (permissions.ts) - after
// authenticate. A refusal is a 403, like a role refusal. The permissions are
// read once per request and kept on it.

export const permissionsOf = async (req: Request): Promise<Permissions> => {
    if (!req.permissions) {
        req.permissions = await getPermissionsOfServ(req.user);
    }
    return req.permissions;
};

/** The module at that level at least. GET routes take READ, the rest WRITE. */
export const requirePermission = (module: PermissionModule, level: AccessLevel) =>
    async (req: Request, _res: Response, next: NextFunction) => {
        if (!allows(await permissionsOf(req), module, level)) {
            throw new ForbiddenError();
        }
        next();
    };

/** Any one of these modules at that level - a client or catalog list read by the quote, invoice or chantier forms' pickers, without the clients or catalog module itself. */
export const requireAnyPermission = (modules: PermissionModule[], level: AccessLevel) =>
    async (req: Request, _res: Response, next: NextFunction) => {
        const permissions = await permissionsOf(req);
        if (!modules.some(module => allows(permissions, module, level))) {
            throw new ForbiddenError();
        }
        next();
    };

// Where a request names the document it touches: its id in the URL, a
// section's or a line's id in the URL, `document_id` in the query or the
// body. Null when it names none or it isn't the company's - the route itself
// answers that one (a 404, a 400).
type DocumentLocator = (req: Request) => Promise<number | null>;

const asId = (value: unknown): number | null => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

export const documentFromParam: DocumentLocator = async req => asId(req.params.id);
export const documentFromQuery: DocumentLocator = async req => asId(req.query.document_id);
export const documentFromBody: DocumentLocator = async req => asId(req.body?.document_id);
export const documentOfSection: DocumentLocator = async req => {
    const id = asId(req.params.id);
    return id === null ? null : (await getSectionByIdFromDB(id, req.user.company_id))?.document_id ?? null;
};
export const documentOfLine: DocumentLocator = async req => {
    const id = asId(req.params.id);
    return id === null ? null : (await getLineByIdFromDB(id, req.user.company_id))?.document_id ?? null;
};

/** The module of the document the request touches (a quote, an invoice, a chantier's ledger) at that level. */
export const requireDocumentPermission = (level: AccessLevel, locate: DocumentLocator, alsoAllowedBy?: PermissionModule) =>
    async (req: Request, _res: Response, next: NextFunction) => {
        const permissions = await permissionsOf(req);
        // Everything allowed (an admin, a company without settings): nothing to look up.
        if (PERMISSION_MODULES.every(module => allows(permissions, module, level))) {
            return next();
        }
        const documentId = await locate(req);
        const document = documentId === null ? null : await getDocumentByIdFromDB(documentId, req.user.company_id);
        // None (or another company's): the route answers its own 404.
        if (!document || allows(permissions, moduleOfDocumentType(document.type), level)) {
            return next();
        }
        // A chantier's section dates and note: the calendar plans them too -
        // a chantier's only, never a quote's or an invoice's.
        if (alsoAllowedBy && document.type === "PROJECT" && allows(permissions, alsoAllowedBy, level)) {
            return next();
        }
        throw new ForbiddenError();
    };

/** A new quote or invoice, of the type in the body (POST /document) - any other type a 400. */
export const requireDocumentTypePermission = (level: AccessLevel) =>
    async (req: Request, _res: Response, next: NextFunction) => {
        const type = req.body?.type;
        if (type !== "QUOTE" && type !== "INVOICE") {
            throw new AppError("type must be QUOTE or INVOICE", 400);
        }
        if (!allows(await permissionsOf(req), moduleOfDocumentType(type), level)) {
            throw new ForbiddenError();
        }
        next();
    };

/** The document types this user can read - a list asked for without a type only returns those. */
export const readableDocumentTypes = async (req: Request): Promise<string[]> => {
    const permissions = await permissionsOf(req);
    return ["QUOTE", "INVOICE", "PROJECT"].filter(type => allows(permissions, moduleOfDocumentType(type), "READ"));
};
