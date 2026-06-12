import { Router } from "express";
import { body, param } from "express-validator";
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
import { OrderStatus } from "../../generated/client";

const router = Router();
router.use(authenticate);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.post(
  "/",
  requireNotAdmin,
  [
    body("address").trim().notEmpty().isLength({ max: 500 }),
    body("phone").optional({ nullable: true }).trim().isLength({ max: 30 }),
    body("comment").optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  createOrder,
);
router.patch("/:id/cancel", requireNotAdmin, cancelOwnOrder);
router.put(
  "/:id/status",
  requireAdmin,
  [
    param("id").isInt({ min: 1 }),
    body("status").isIn(Object.values(OrderStatus)),
  ],
  updateOrderStatus,
);

export default router;
