import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

export interface AuthRequest<P = Record<string, string>> extends Request<P> {
  userId?: number;
  userRole?: string;
}

const decodeAuthToken = (req: AuthRequest) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      role: string;
    };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    return true;
  } catch {
    return false;
  }
};

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!decodeAuthToken(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  decodeAuthToken(req);
  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export const requireNotAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.userRole === "ADMIN") {
    return res
      .status(403)
      .json({ message: "Действие недоступно для администратора" });
  }
  next();
};
