import { TokenPayload } from "../middlewares/jwt.service";
import { Permissions } from "../../modules/permissions/permissions";

declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
      // The caller's permissions, loaded once per request by
      // permission.middleware.ts's permissionsOf.
      permissions?: Permissions;
    }
  }
}
