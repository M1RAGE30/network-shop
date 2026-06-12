import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import favoriteRoutes from "./routes/favorite.routes";
import reviewRoutes from "./routes/review.routes";
import chatRoutes from "./routes/chat.routes";
import adminRoutes from "./routes/admin.routes";
import uploadRoutes from "./routes/upload.routes";
import brandRoutes from "./routes/brand.routes";
import userRoutes from "./routes/user.routes";
import mediaRoutes from "./routes/media.routes";
import { setupSocket } from "./socket";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use("/uploads", express.static("uploads"));
app.use("/api/media", mediaRoutes);

const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 400,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

setupSocket(io);

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  console.error("JWT_SECRET must be set and at least 16 characters");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export { app, io, httpServer };
