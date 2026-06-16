import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
} from "../lib/mailer";

const VERIFY_CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function generateVerifyCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

async function setVerificationCode(userId: number, email: string) {
  const code = generateVerifyCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyToken: code,
      verifyTokenExpiry: new Date(Date.now() + VERIFY_CODE_TTL_MS),
    },
  });
  await sendVerificationCodeEmail(email, code);
}

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password, name } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();
  const trimmedName = String(name).trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing)
    return res.status(409).json({ message: "Email уже используется" });

  const existingByName = await prisma.user.findFirst({
    where: { name: trimmedName },
  });
  if (existingByName)
    return res.status(409).json({ message: "Данное имя уже занято" });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashed,
      name: trimmedName,
    },
  });

  await setVerificationCode(user.id, normalizedEmail);

  return res.status(201).json({
    message: "Код подтверждения отправлен на почту.",
    email: normalizedEmail,
  });
};

export const resendVerification = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const normalizedEmail = String(req.body.email).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.isEmailVerified) {
    return res.json({
      message: "Если аккаунт существует и не подтверждён, код отправлен на почту.",
    });
  }

  await setVerificationCode(user.id, normalizedEmail);

  return res.json({
    message: "Новый код отправлен на почту. Действует 10 минут.",
    email: normalizedEmail,
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const normalizedEmail = String(req.body.email).trim().toLowerCase();
  const code = String(req.body.code).trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return res.status(400).json({ message: "Неверный email или код" });
  }

  if (user.isEmailVerified) {
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );
    return res.json({
      message: "Email уже подтверждён",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  }

  if (!user.verifyToken || user.verifyToken !== code) {
    return res.status(400).json({ message: "Неверный email или код" });
  }

  if (!user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
    return res.status(400).json({
      message: "Код истёк. Запросите новый код на этой странице.",
      code: "CODE_EXPIRED",
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      verifyToken: null,
      verifyTokenExpiry: null,
    },
  });

  const token = jwt.sign(
    { id: updated.id, role: updated.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return res.json({
    message: "Email подтверждён",
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      phone: updated.phone,
      address: updated.address,
      avatarUrl: updated.avatarUrl,
    },
    token,
  });
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user)
    return res.status(401).json({ message: "Неверный email или пароль" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return res.status(401).json({ message: "Неверный email или пароль" });

  if (!user.isEmailVerified) {
    const hasActiveCode =
      !!user.verifyToken &&
      !!user.verifyTokenExpiry &&
      user.verifyTokenExpiry > new Date();
    if (!hasActiveCode) {
      await setVerificationCode(user.id, normalizedEmail);
    }
    return res.status(403).json({
      message: hasActiveCode
        ? "Подтвердите email. Используйте код из последнего письма."
        : "Подтвердите email. Новый код отправлен на почту.",
      code: "EMAIL_NOT_VERIFIED",
      email: normalizedEmail,
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" },
  );

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      avatarUrl: user.avatarUrl,
    },
    token,
  });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      avatarUrl: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  return res.json(user);
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { name, phone, address, avatarUrl } = req.body as {
    name?: string;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
  };

  if (!name?.trim()) return res.status(400).json({ message: "Имя обязательно" });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      avatarUrl: avatarUrl?.trim() || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      avatarUrl: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  return res.json(user);
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(400).json({ message: "Неверный текущий пароль" });
  }

  const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
  if (isSameAsCurrent) {
    return res.status(400).json({
      message: "Новый пароль не должен совпадать с текущим",
      code: "PASSWORD_SAME_AS_CURRENT",
    });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return res.json({ message: "Пароль изменён" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const normalizedEmail = String(req.body.email).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user?.isEmailVerified) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    await sendPasswordResetEmail(normalizedEmail, token);
  }

  return res.json({
    message: "Если аккаунт с такой почтой существует, ссылка для сброса пароля отправлена. Ссылка действует 1 час.",
  });
};

export const validateResetToken = async (req: Request, res: Response) => {
  const token = String(req.query.token || "").trim();
  if (!token || token.length < 32) {
    return res.json({ valid: false });
  }

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token },
    select: { passwordResetExpiry: true },
  });

  const valid =
    !!user?.passwordResetExpiry && user.passwordResetExpiry > new Date();

  return res.json({ valid });
};

export const resetPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const token = String(req.body.token).trim();
  const { password } = req.body;

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token },
  });

  if (
    !user ||
    !user.passwordResetExpiry ||
    user.passwordResetExpiry < new Date()
  ) {
    return res.status(400).json({
      message: "Ссылка недействительна или истекла. Запросите сброс пароля снова.",
      code: "RESET_EXPIRED",
    });
  }

  const isSameAsCurrent = await bcrypt.compare(String(password), user.password);
  if (isSameAsCurrent) {
    return res.status(400).json({
      message: "Новый пароль не должен совпадать со старым",
      code: "PASSWORD_SAME_AS_OLD",
    });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return res.json({ message: "Пароль обновлён. Теперь вы можете войти." });
};
