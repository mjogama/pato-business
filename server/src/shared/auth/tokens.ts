import jwt from "jsonwebtoken";

import { env } from "@app/config/env";
import { UnauthorizedError } from "@shared/errors/AppError";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export type TokenType = "access" | "refresh";

/** Who a token was issued to, and the user's `tokenVersion` at the time ("sign out everywhere" bumps it). */
export interface TokenClaims {
  userId: string;
  version: number;
}

const secrets = { access: env.JWT_ACCESS_SECRET, refresh: env.JWT_REFRESH_SECRET };
const ttls = { access: env.JWT_ACCESS_TTL_SECONDS, refresh: env.JWT_REFRESH_TTL_SECONDS };

/** Signs a token for a user. Without a TTL in the env the token has no `exp` and never expires. */
export const signToken = (type: TokenType, userId: string, version = 0): string =>
  jwt.sign({ type, ver: version }, secrets[type], {
    subject: userId,
    ...(ttls[type] && { expiresIn: ttls[type] }),
  });

/** The claims of a valid token of this type; throws `UnauthorizedError` otherwise. Tokens from before versions count as 0. */
export const verifyToken = (type: TokenType, token: string): TokenClaims => {
  try {
    const payload = jwt.verify(token, secrets[type], { algorithms: ["HS256"] });
    if (typeof payload !== "string" && payload.type === type && payload.sub) {
      const version = Number.isInteger(payload.ver) ? (payload.ver as number) : 0;
      return { userId: payload.sub, version };
    }
  } catch {
    // fall through to the error below
  }
  throw new UnauthorizedError("Invalid or expired session");
};
