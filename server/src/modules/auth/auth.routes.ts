import { Router } from "express";

import { env } from "@app/config/env";
import { loginSchemas } from "./auth.schema";
import type { AuthController } from "./auth.controller";
import { validate } from "@shared/middlewares/validate";
import { requireAuth } from "@shared/middlewares/requireAuth";
import { createRouteLimiter } from "@app/middlewares/rateLimit";

/** Slows password guessing: only failed sign-ins count, so the owner is never locked out by signing in. */
const loginLimiter = () =>
  createRouteLimiter({
    windowMs: 15 * 60 * 1000,
    limit: env.LOGIN_RATE_LIMIT_MAX,
    skipSuccessfulRequests: true,
    message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
  });

export class AuthRouter {
  readonly router: Router = Router();

  constructor(controller: AuthController) {
    this.router.post("/login", loginLimiter(), validate(loginSchemas), controller.login);
    this.router.post("/refresh", controller.refresh);
    this.router.get("/me", requireAuth, controller.me);
  }
}
