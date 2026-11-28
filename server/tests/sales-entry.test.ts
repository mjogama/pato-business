import { randomUUID } from "node:crypto";

import { createApp } from "@app/app";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authCookie } from "./helpers";

const app = createApp();

const valid = {
  date: "2026-11-01T09:30",
  title: "Market",
  items: [{ productName: "Ube Pandesal", price: 12.5, quantity: 3 }],
  note: "",
};

// Only requests that fail validation, so these tests never write to the database.
describe("sales entry module", () => {
  it("rejects invalid params and query", async () => {
    await request(app).get("/api/v1/sales-entries/not-a-uuid").set("Cookie", authCookie()).expect(400);
    await request(app).get("/api/v1/sales-entries?from=2026-13-01").set("Cookie", authCookie()).expect(400);
    await request(app)
      .get("/api/v1/sales-entries?from=2026-11-30&to=2026-11-01")
      .set("Cookie", authCookie())
      .expect(400);
    await request(app).delete("/api/v1/sales-entries/not-a-uuid").set("Cookie", authCookie()).expect(400);
  });

  it.each([
    ["date", { date: "2026-11-01 09:30" }],
    ["title", { title: "   " }],
    ["title", { title: "x".repeat(61) }],
    ["items", { items: [] }],
    ["items.0.productName", { items: [{ productName: " ", price: 1, quantity: 1 }] }],
    ["items.0.price", { items: [{ productName: "Cookie", price: 0, quantity: 1 }] }],
    ["items.0.price", { items: [{ productName: "Cookie", price: 1.234, quantity: 1 }] }],
    ["items.0.quantity", { items: [{ productName: "Cookie", price: 1, quantity: 1.5 }] }],
  ])("rejects a bad %s with field-level details", async (path, patch) => {
    const res = await request(app)
      .post("/api/v1/sales-entries")
      .set("Cookie", authCookie())
      .send({ ...valid, ...patch });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, statusCode: 400, message: "Validation failed" });
    expect(res.body.details).toEqual([expect.objectContaining({ path })]);
  });

  it("validates the body on update too", async () => {
    await request(app)
      .put(`/api/v1/sales-entries/${randomUUID()}`)
      .set("Cookie", authCookie())
      .send({ ...valid, items: [] })
      .expect(400);
  });
});
