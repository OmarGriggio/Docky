import { TokenPayload } from "../middlewares/jwt.service";

declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
    }
  }
}
