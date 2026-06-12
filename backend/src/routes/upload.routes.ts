import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_MIMETYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много загрузок. Попробуйте позже." },
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Недопустимый тип файла"));
    }
  },
});

router.post(
  "/image",
  authenticate,
  uploadLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "Файл слишком большой (макс. 5 МБ)"
            : "Ошибка загрузки файла";
        return res.status(400).json({ message });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Файл не загружен" });
    return res.json({ url: `/uploads/${req.file.filename}` });
  },
);

export default router;
