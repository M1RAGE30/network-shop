import { Router } from "express";
import {
  getProducts,
  getProductFilterMeta,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin,
} from "../middleware/auth.middleware";

const router = Router();

router.get("/filter-meta", optionalAuthenticate, getProductFilterMeta);
router.get("/", optionalAuthenticate, getProducts);
router.get("/:slug", getProduct);
router.post("/", authenticate, requireAdmin, createProduct);
router.put("/:id", authenticate, requireAdmin, updateProduct);
router.delete("/:id", authenticate, requireAdmin, deleteProduct);

export default router;
