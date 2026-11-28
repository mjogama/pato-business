import type { NextFunction, Request, Response } from "express";

import type { AnyRequestHandler } from "./validate";
import { UnauthorizedError } from "@shared/errors/AppError";
import { ACCESS_COOKIE, verifyToken } from "@shared/auth/tokens";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

/**
 * Lets a request through only when it carries a valid access token cookie. Sets `req.userId`.
 * Typed loosely like `validate`, so a handler with a validated (non-string) query still fits after it.
 */
export const requireAuth: AnyRequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== "string") throw new UnauthorizedError("Please sign in");
  req.userId = verifyToken("access", token);
  next();
};
