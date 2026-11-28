import type { CookieOptions, Request, Response } from "express";

import { env } from "@app/config/env";
import type { loginSchemas } from "./auth.schema";
import { sendSuccess } from "@shared/http/response";
import type { AuthService, Session } from "./auth.service";
import { UnauthorizedError } from "@shared/errors/AppError";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@shared/auth/tokens";
import type { ValidatedRequest } from "@shared/middlewares/validate";

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const isProd = env.NODE_ENV === "production";

/** The client (Vercel) and API (Railway) are different sites in production, so the cookies must be SameSite=None. */
const cookieOptions = (ttlSeconds: number | undefined, path: string): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path,
  maxAge: ttlSeconds ? ttlSeconds * 1000 : TEN_YEARS_MS,
});

const ACCESS_PATH = "/";
const REFRESH_PATH = "/api/v1/auth";

const setSessionCookies = (res: Response, { accessToken, refreshToken }: Session) => {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(env.JWT_ACCESS_TTL_SECONDS, ACCESS_PATH));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(env.JWT_REFRESH_TTL_SECONDS, REFRESH_PATH));
};

/** Clearing needs the same path, `SameSite` and `Secure` as when the cookie was set, or the browser keeps it. */
const clearSessionCookies = (res: Response) => {
  const { maxAge: _access, ...access } = cookieOptions(undefined, ACCESS_PATH);
  const { maxAge: _refresh, ...refresh } = cookieOptions(undefined, REFRESH_PATH);
  res.clearCookie(ACCESS_COOKIE, access);
  res.clearCookie(REFRESH_COOKIE, refresh);
};

export class AuthController {
  constructor(private readonly service: AuthService) {}

  login = async (req: ValidatedRequest<typeof loginSchemas>, res: Response) => {
    const session = await this.service.login(req.body);
    setSessionCookies(res, session);
    sendSuccess(res, { message: "Signed in", data: session.user });
  };

  refresh = async (req: Request, res: Response) => {
    const token: unknown = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== "string") throw new UnauthorizedError("Please sign in");
    const session = await this.service.refresh(token);
    setSessionCookies(res, session);
    sendSuccess(res, { message: "Session refreshed", data: session.user });
  };

  /** Signs out this browser. Always succeeds, even without a session. */
  logout = async (_req: Request, res: Response) => {
    clearSessionCookies(res);
    sendSuccess(res, { message: "Signed out", data: null });
  };

  /** Signs out every device, this one included. */
  logoutEverywhere = async (req: Request, res: Response) => {
    await this.service.logoutEverywhere(req.userId as string);
    clearSessionCookies(res);
    sendSuccess(res, { message: "Signed out everywhere", data: null });
  };

  me = async (req: Request, res: Response) => {
    const user = await this.service.me(req.userId as string);
    sendSuccess(res, { message: "Signed in", data: user });
  };
}
