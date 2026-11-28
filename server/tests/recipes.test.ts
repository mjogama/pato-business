import { randomUUID } from "node:crypto";

import { createApp } from "@app/app";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authCookie } from "./helpers";

const app = createApp();

describe("recipes module", () => {
  it("rejects invalid params and query", async () => {
    await request(app).get("/api/v1/recipes/not-a-uuid").set("Cookie", authCookie()).expect(400);
    await request(app).get("/api/v1/recipes?limit=0").set("Cookie", authCookie()).expect(400);
  });

  it("returns 404 for a missing recipe", async () => {
    const res = await request(app).get(`/api/v1/recipes/${randomUUID()}`).set("Cookie", authCookie());

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, statusCode: 404 });
  });
});
