import { Router } from "express";

import { env } from "@app/config/env";
import { validate } from "@shared/middlewares/validate";
import { requireAuth } from "@shared/middlewares/requireAuth";
import { createRouteLimiter } from "@app/middlewares/rateLimit";
import type { PreOrderController } from "./pre-order.controller";
import {
  getPreOrderSchemas,
  listPreOrdersSchemas,
  createPreOrderSchemas,
  deletePreOrderSchemas,
  updatePreOrderStatusSchemas,
} from "./pre-order.schema";

/** Stops one visitor flooding the owner (and customers' inboxes) with orders. */
const placeOrderLimiter = () =>
  createRouteLimiter({
    windowMs: 60 * 60 * 1000,
    limit: env.PRE_ORDER_RATE_LIMIT_MAX,
    message: "Too many pre-orders from your network. Please try again in an hour.",
  });

export class PreOrderRouter {
  readonly router: Router = Router();

  constructor(controller: PreOrderController) {
    // Placing an order is public; everything else is the owner's (orders hold customers' emails).
    this.router.post("/", placeOrderLimiter(), validate(createPreOrderSchemas), controller.create);
    this.router.get("/", requireAuth, validate(listPreOrdersSchemas), controller.list);
    this.router.get("/:id", requireAuth, validate(getPreOrderSchemas), controller.getById);
    this.router.patch("/:id/status", requireAuth, validate(updatePreOrderStatusSchemas), controller.updateStatus);
    this.router.delete("/:id", requireAuth, validate(deletePreOrderSchemas), controller.delete);
  }
}
