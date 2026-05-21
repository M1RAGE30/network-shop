import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validationResult } from "express-validator";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendVerificationCodeEmail } from "../lib/mailer";

const VERIFY_CODE_TTL_MS = 10 * 60 * 1000;

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

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing)
    return res.status(409).json({ message: "Email уже используется" });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashed,
      name,
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
    return res.json({ message: "Email уже подтверждён" });
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      verifyToken: null,
      verifyTokenExpiry: null,
    },
  });

  return res.json({ message: "Теперь вы можете войти в свой аккаунт." });
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
  return res.json(user);
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { name, email, phone, address, avatarUrl } = req.body as {
    name?: string;
    email?: string;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
  };

  if (!name?.trim()) return res.status(400).json({ message: "Имя обязательно" });
  if (!email?.trim()) return res.status(400).json({ message: "Email обязателен" });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail, NOT: { id: userId } },
    select: { id: true },
  });
  if (existing) {
    return res.status(409).json({ message: "Email уже используется" });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim(),
      email: normalizedEmail,
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
