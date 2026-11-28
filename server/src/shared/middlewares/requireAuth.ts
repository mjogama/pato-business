import type { NextFunction, Request, Response } from "express";

import type { AnyRequestHandler } from "./validate";
import { currentTokenVersion } from "@shared/auth/session";
import { UnauthorizedError } from "@shared/errors/AppError";
import { ACCESS_COOKIE, verifyToken } from "@shared/auth/tokens";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

/**
 * Lets a request through only when it carries a valid access token cookie whose version is still the user's
 * (so "sign out everywhere" ends every session at once). Sets `req.userId`.
 * Typed loosely like `validate`, so a handler with a validated (non-string) query still fits after it.
 */
export const requireAuth: AnyRequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== "string") throw new UnauthorizedError("Please sign in");
  const { userId, version } = verifyToken("access", token);
  if ((await currentTokenVersion(userId)) !== version) throw new UnauthorizedError("Invalid or expired session");
  req.userId = userId;
  next();
};
