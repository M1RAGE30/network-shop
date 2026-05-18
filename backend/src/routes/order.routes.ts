import { Router } from "express";
import {
  authenticate,
  requireAdmin,
  requireNotAdmin,
} from "../middleware/auth.middleware";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOwnOrder,
} from "../controllers/order.controller";

const router = Router();
router.use(authenticate);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.post("/", requireNotAdmin, createOrder);
router.patch("/:id/cancel", requireNotAdmin, cancelOwnOrder);
router.put("/:id/status", requireAdmin, updateOrderStatus);

export default router;
