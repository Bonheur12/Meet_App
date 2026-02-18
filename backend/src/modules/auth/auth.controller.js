import {
  clearRefreshToken,
  loginUser,
  refreshSession,
  registerUser,
} from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.validation.js";
import { prisma } from "../../db/prisma.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const user = await registerUser(payload);

    return res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await loginUser(payload);

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    const session = await refreshSession(token);
    return res.json(session);
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      await clearRefreshToken(req.user.id);
    }

    res.clearCookie("refreshToken", cookieOptions);
    return res.json({ message: "Logged out" });
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};
