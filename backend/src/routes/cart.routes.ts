import { Router } from "express";
import {
  authenticate,
  requireNotAdmin,
} from "../middleware/auth.middleware";
import {
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
  bulkAddToCart,
} from "../controllers/cart.controller";

const router = Router();
router.use(authenticate);
router.get("/", requireNotAdmin, getCart);
router.post("/", requireNotAdmin, addToCart);
router.post("/bulk", requireNotAdmin, bulkAddToCart);
router.put("/:productId", requireNotAdmin, updateCart);
router.delete("/:productId", requireNotAdmin, removeFromCart);
router.delete("/", requireNotAdmin, clearCart);

export default router;
