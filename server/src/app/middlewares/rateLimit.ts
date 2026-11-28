import { rateLimit } from "express-rate-limit";

import type { Env } from "@app/config/env";
import { TooManyRequestsError } from "@shared/errors/AppError";

export const createRateLimiter = (config: Pick<Env, "RATE_LIMIT_WINDOW_MS" | "RATE_LIMIT_MAX">) =>
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX, // per IP, per window
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,

    handler: (_req, _res, next) => next(new TooManyRequestsError()),
  });

/** A tighter limit for one route, e.g. sign-in or placing a pre-order. Each call has its own count. */
export const createRouteLimiter = ({
  windowMs,
  limit,
  message,
  skipSuccessfulRequests = false,
}: {
  windowMs: number;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ipv6Subnet: 56,

    handler: (_req, _res, next) => next(new TooManyRequestsError(message)),
  });
