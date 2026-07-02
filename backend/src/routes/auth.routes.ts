import { Router, type RequestHandler } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  updateMe,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много попыток. Попробуйте через 15 минут." },
});

const resendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов кода. Подождите минуту." },
});

const antiSpamMiddlewares = (...middlewares: RequestHandler[]) =>
  process.env.AUTH_ANTISPAM_ENABLED === "true" ? middlewares : [];

router.post(
  "/register",
  ...antiSpamMiddlewares(authLimiter),
  [
    body("email")
      .isEmail()
      .isLength({ max: 254 })
      .withMessage("Некорректный email"),
    body("password")
      .isLength({ min: 6, max: 128 })
      .withMessage("Пароль от 6 до 128 символов"),
    body("name")
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage("Имя пользователя обязательно"),
  ],
  register,
);

router.post(
  "/login",
  ...antiSpamMiddlewares(authLimiter),
  [
    body("email").isEmail().isLength({ max: 254 }),
    body("password").notEmpty().isLength({ max: 128 }),
  ],
  login,
);

router.post(
  "/verify-email",
  ...antiSpamMiddlewares(authLimiter),
  [
    body("email").isEmail().isLength({ max: 254 }),
    body("code")
      .trim()
      .matches(/^\d{6}$/)
      .withMessage("Код должен состоять из 6 цифр"),
  ],
  verifyEmail,
);

router.post(
  "/resend-verification",
  ...antiSpamMiddlewares(resendLimiter),
  [body("email").isEmail().isLength({ max: 254 })],
  resendVerification,
);

const passwordRules = (field = "password") =>
  body(field)
  .isLength({ min: 6, max: 128 })
  .withMessage("Пароль от 6 до 128 символов");

router.get("/me", authenticate, getMe);
router.put(
  "/me",
  authenticate,
  [
    body("name")
      .trim()
      .notEmpty()
      .isLength({ max: 100 })
      .withMessage("Имя пользователя обязательно"),
    body("phone").optional({ values: "null" }).isLength({ max: 30 }),
    body("address").optional({ values: "null" }).isLength({ max: 255 }),
    body("avatarUrl").optional({ values: "null" }).isLength({ max: 500 }),
  ],
  updateMe,
);

router.put(
  "/me/password",
  authenticate,
  [
    body("currentPassword").notEmpty().isLength({ max: 128 }),
    passwordRules("newPassword"),
  ],
  changePassword,
);

router.post(
  "/forgot-password",
  ...antiSpamMiddlewares(authLimiter),
  [body("email").isEmail().isLength({ max: 254 })],
  forgotPassword,
);

router.get("/reset-password/validate", validateResetToken);

router.post(
  "/reset-password",
  ...antiSpamMiddlewares(authLimiter),
  [
    body("token").trim().isLength({ min: 32, max: 128 }),
    passwordRules(),
  ],
  resetPassword,
);

export default router;
