import jwt from "jsonwebtoken";
import { getUserByEmail } from "../repositories/user.repository";
import { LoginUserData, User } from "../types/user";
import bcrypt from "bcrypt";

export const authUserService = async (loginData: LoginUserData) => {
  const user: User = await getUserByEmail(loginData.email)
  const isPasswordValid = await bcrypt.compare(
    loginData.passwordHash,
    user.motdepasse_hash
  );
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "5h"
    }
  );

  return {"token": token}
};