import type { z } from "zod";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface RequestSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

type Parsed<S extends RequestSchemas, K extends keyof RequestSchemas, Fallback> = S[K] extends z.ZodType
  ? z.output<S[K]>
  : Fallback;

export type ValidatedRequest<S extends RequestSchemas> = Request<
  Parsed<S, "params", Record<string, string>>,
  unknown,
  Parsed<S, "body", unknown>,
  Parsed<S, "query", Record<string, unknown>>
>;

/** Fits before any handler, whatever its validated params, body and query types. */
export type AnyRequestHandler = RequestHandler<any, any, any, any>;

export const validate =
  (schemas: RequestSchemas): AnyRequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as Request["params"];
    }
    if (schemas.query) {
      Object.defineProperty(req, "query", {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  };
