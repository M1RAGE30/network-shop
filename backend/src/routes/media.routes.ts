import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const ALLOWED_HOSTS = new Set([
  "images.5element.by",
  "5element.by",
  "www.5element.by",
]);

const proxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

function isAllowedUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return parsed;
    for (const allowed of ALLOWED_HOSTS) {
      if (host.endsWith(`.${allowed}`)) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

router.get("/proxy", proxyLimiter, async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  const target = isAllowedUrl(rawUrl);
  if (!target) {
    return res.status(400).json({ message: "URL не разрешён для прокси" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "image/*,*/*",
        "User-Agent":
          "Mozilla/5.0 (compatible; NetworkShop/1.0; +https://networkshop.local)",
        Referer: "https://5element.by/",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        message: "Не удалось загрузить изображение",
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return res.status(502).json({ message: "Ответ не является изображением" });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ message: "Изображение слишком большое" });
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return res.send(buffer);
  } catch {
    return res.status(502).json({ message: "Ошибка загрузки изображения" });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
