import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../generated/client";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS not allowed" });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Запись уже существует" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({
        message: "Невозможно выполнить операцию: связанные данные",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Not found" });
    }
  }

  console.error(err);
  res.status(500).json({ message: "Ошибка сервера" });
};
