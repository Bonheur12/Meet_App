import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signAccessToken = (user) =>
  jwt.sign({ email: user.email }, env.jwtAccessSecret, {
    subject: user.id,
    expiresIn: env.jwtAccessExpires,
  });

export const signRefreshToken = (user) =>
  jwt.sign({ email: user.email }, env.jwtRefreshSecret, {
    subject: user.id,
    expiresIn: env.jwtRefreshExpires,
  });
