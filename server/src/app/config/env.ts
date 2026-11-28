import "dotenv/config";
import { z } from "zod";

const trustProxy = z
  .string()
  .default("false")
  .transform((value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    const hops = Number(value);
    return Number.isInteger(hops) && hops >= 0 ? hops : value;
  });

/** A whole number of seconds. Blank or unset (`JWT_ACCESS_TTL_SECONDS=`) means no expiry. */
const optionalSeconds = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const originList = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url()).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8001),
  DATABASE_URL: z.string().min(1),
  BASE_URL: originList,
  TRUST_PROXY: trustProxy,
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  BODY_LIMIT: z.string().min(1).default("100kb"),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  // Failed sign-ins per IP per 15 minutes (successful ones don't count).
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  // Placed pre-orders per IP per hour.
  PRE_ORDER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  // Image uploads (Cloudinary). Without the three credentials, uploads answer 503.
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_FOLDER: z.string().min(1).default("pato"),
  // Pre-order emails (Resend). Without both, emails are skipped and orders still work.
  RESEND_API_KEY: z.string().min(1).optional(),
  /** A sender on a domain verified in Resend, e.g. `Pato's Pâtisserie <orders@example.com>`. */
  EMAIL_FROM: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // Blank or unset means the token (and its cookie) never expires.
  JWT_ACCESS_TTL_SECONDS: optionalSeconds,
  JWT_REFRESH_TTL_SECONDS: optionalSeconds,
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

export const env: Env = parsed.data;
