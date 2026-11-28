import { randomUUID } from "node:crypto";

import { createApp } from "@app/app";
import { AuthModule } from "@modules/auth/auth.module";
import { signToken } from "@shared/auth/tokens";
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authCookie } from "./helpers";

const user = { id: randomUUID(), username: "pato", passwordHash: bcrypt.hashSync("secret-pass", 4) };

const repository = {
  findByUsername: async (username: string) => (username === user.username ? user : null),
  findById: async (id: string) => (id === user.id ? user : null),
};

const service = new AuthModule({ repository }).service;

describe("auth service", () => {
  it("signs in with the right password", async () => {
    const session = await service.login({ username: "pato", password: "secret-pass" });
    expect(session.user).toEqual({ id: user.id, username: "pato" });
    expect(await service.me(user.id)).toEqual(session.user);
  });

  it("gives the same error for a wrong password and an unknown user", async () => {
    const wrong = await service.login({ username: "pato", password: "nope" }).catch((e: Error) => e);
    const unknown = await service.login({ username: "ghost", password: "nope" }).catch((e: Error) => e);
    expect(wrong).toMatchObject({ statusCode: 401, message: "Invalid username or password" });
    expect(unknown).toMatchObject({ statusCode: 401, message: "Invalid username or password" });
  });

  it("refreshes only with a refresh token", async () => {
    const session = await service.login({ username: "pato", password: "secret-pass" });
    expect((await service.refresh(session.refreshToken)).user.id).toBe(user.id);
    await expect(service.refresh(session.accessToken)).rejects.toMatchObject({ statusCode: 401 });
    await expect(service.refresh(signToken("refresh", randomUUID()))).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("auth routes", () => {
  const app = createApp();

  it("validates the login body", async () => {
    await request(app).post("/api/v1/auth/login").send({ username: "pato" }).expect(400);
  });

  it("rejects /me and refresh without cookies", async () => {
    await request(app).get("/api/v1/auth/me").expect(401);
    await request(app).post("/api/v1/auth/refresh").expect(401);
    await request(app).get("/api/v1/auth/me").set("Cookie", "access_token=garbage").expect(401);
  });

  it("protects every recipes and sales-entries route, reads included", async () => {
    await request(app).get("/api/v1/recipes").expect(401);
    await request(app).get(`/api/v1/recipes/${randomUUID()}`).expect(401);
    await request(app).post("/api/v1/recipes").send({}).expect(401);
    await request(app).put(`/api/v1/recipes/${randomUUID()}`).send({}).expect(401);
    await request(app).delete(`/api/v1/recipes/${randomUUID()}`).expect(401);
    await request(app).get("/api/v1/sales-entries").expect(401);
    await request(app).get("/api/v1/sales-entries/product-suggestions").expect(401);
    await request(app).get(`/api/v1/sales-entries/${randomUUID()}`).expect(401);
    await request(app).post("/api/v1/sales-entries").send({}).expect(401);
    await request(app).delete(`/api/v1/sales-entries/${randomUUID()}`).expect(401);
  });

  it("limits failed sign-ins per IP (LOGIN_RATE_LIMIT_MAX is 3 in tests)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await request(app).post("/api/v1/auth/login").send({ username: "pato" })).status);
    }
    expect(statuses.at(-1)).toBe(429);
    const res = await request(app).post("/api/v1/auth/login").send({ username: "pato", password: "x" });
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/sign-in attempts/);
  });

  it("lets a valid access cookie through", async () => {
    await request(app).post("/api/v1/recipes").set("Cookie", authCookie()).send({}).expect(400);
  });
});
