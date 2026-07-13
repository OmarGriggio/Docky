import bcrypt from "bcrypt";
import { getUserByEmail } from "../utilisateurs/user.repository";
import { LoginUserData, User } from "../utilisateurs/user.types";
import { UnauthorizedError } from "../../shared/types/errors";
import { generateAccessToken } from "../../shared/middlewares/jwt.service";

export const authUserService = async (loginData: LoginUserData) => {
  const user: User | undefined = await getUserByEmail(loginData.email)

  if (!user) {
    throw new UnauthorizedError();
  }

  const isPasswordValid = await bcrypt.compare(
    loginData.passwordHash,
    user.motdepasse_hash
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError();
  }

  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    id_entreprise: user.id_entreprise
  });

  //TODO : add generateRefreshToken() (need to see how to stock refresh in front)

  return {"token": token}
};