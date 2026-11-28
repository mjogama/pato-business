import { randomUUID } from "node:crypto";
import { createApp } from "@app/app";
import type { Product } from "@common/modules/product";
import type { BusinessSettings } from "@modules/menu/menu.schema";
import type { PreOrderEmailKind } from "@modules/pre-order/pre-order.mailer";
import { renderPreOrderEmail } from "@modules/pre-order/pre-order.mailer";
import type { CompletionEntry, NewPreOrder, PreOrderRepository } from "@modules/pre-order/pre-order.repository";
import type { PreOrder } from "@modules/pre-order/pre-order.schema";
import { PreOrderService, priceOn } from "@modules/pre-order/pre-order.service";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { authCookie } from "./helpers";

// Wednesday 2026-11-25, 10:00 in Manila.
const NOW = new Date("2026-11-25T02:00:00Z");

const product = (overrides: Partial<Product> = {}): Product => ({
  id: randomUUID(),
  name: "Ube Pandesal",
  categoryId: randomUUID(),
  shortDescription: "Soft.",
  price: 40,
  isAvailable: true,
  isFeatured: false,
  sortOrder: 0,
  isArchived: false,
  ...overrides,
});

describe("PreOrderService", () => {
  let orders: PreOrder[];
  let entries: CompletionEntry[];
  let sent: { kind: PreOrderEmailKind; code: string }[];
  let settings: BusinessSettings;
  let pandesal: Product;
  let ensaymada: Product;
  let products: Product[];
  let service: PreOrderService;

  beforeEach(() => {
    orders = [];
    entries = [];
    sent = [];
    settings = {
      businessName: "Pato",
      tagline: "",
      contactNumber: "",
      preOrdersOpen: true,
      preOrderDays: [1, 2, 3, 4, 5],
      preOrderCutoffDays: 1,
      preOrderCutoffTime: "23:59",
      preOrderHandoffTime: "",
    };
    pandesal = product();
    ensaymada = product({ name: "Ensaymada", price: 60, discountPrice: 10, discountEndsAt: "2026-11-26" });
    products = [pandesal, ensaymada, product({ name: "Old", isArchived: true })];

    const repository: PreOrderRepository = {
      findAll: async () => orders,
      findById: async (id) => orders.find((o) => o.id === id) ?? null,
      codeExists: async (code) => orders.some((o) => o.code === code),
      create: async (input: NewPreOrder) => {
        const order: PreOrder = {
          ...input,
          handoff: "",
          id: randomUUID(),
          status: "pending",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        };
        orders.push(order);
        return order;
      },
      setStatus: async (id, from, to, cancelReason) => {
        const order = orders.find((o) => o.id === id && o.status === from);
        if (!order) return null;
        Object.assign(order, { status: to }, cancelReason !== undefined && { cancelReason });
        return order;
      },
      complete: async (id, entry) => {
        const order = orders.find((o) => o.id === id && o.status === "confirmed");
        if (!order) return null;
        entries.push(entry);
        return Object.assign(order, { status: "completed", salesEntryId: randomUUID() });
      },
      delete: async (id) => {
        orders = orders.filter((o) => o.id !== id);
      },
    };

    service = new PreOrderService(
      repository,
      { findById: async (id) => products.find((p) => p.id === id) ?? null },
      { findSettings: async () => settings },
      { send: async (kind, order) => void sent.push({ kind, code: order.code }) },
      () => NOW,
    );
  });

  const input = (overrides = {}) => ({
    customerName: "Ana",
    email: "ana@example.com",
    contactNumber: "0917 123 4567",
    pickupDate: "2026-11-26",
    items: [
      { productId: pandesal.id, quantity: 3 },
      { productId: ensaymada.id, quantity: 1 },
      { productId: pandesal.id, quantity: 2 },
    ],
    ...overrides,
  });

  it("places an order with merged items, hand-over-day prices, a code and an email", async () => {
    const order = await service.create(input());
    expect(order.code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    expect(order.note).toBe("");
    expect(order.contactNumber).toBe("0917 123 4567");
    expect(order.items).toEqual([
      { productId: pandesal.id, productName: "Ube Pandesal", price: 40, quantity: 5 },
      { productId: ensaymada.id, productName: "Ensaymada", price: 50, quantity: 1 },
    ]);
    expect(sent).toEqual([{ kind: "placed", code: order.code }]);
  });

  it("prices a product with sizes per size and needs an available size", async () => {
    const cake = product({
      name: "Ube Cake",
      discountEndsAt: "2026-11-26",
      variants: [
        { name: "Small", price: 300, isAvailable: true },
        { name: "Large", price: 500, discountPrice: 50, isAvailable: true },
        { name: "Family", price: 800, isAvailable: false },
      ],
    });
    products.push(cake);
    const order = await service.create(
      input({
        items: [
          { productId: cake.id, variant: "Large", quantity: 1 },
          { productId: cake.id, variant: "small", quantity: 2 },
          { productId: cake.id, variant: "large", quantity: 1 },
        ],
      }),
    );
    expect(order.items).toEqual([
      { productId: cake.id, productName: "Ube Cake (Large)", price: 450, quantity: 2 },
      { productId: cake.id, productName: "Ube Cake (Small)", price: 300, quantity: 2 },
    ]);
    for (const item of [
      { productId: cake.id, quantity: 1 },
      { productId: cake.id, variant: "Family", quantity: 1 },
      { productId: cake.id, variant: "Huge", quantity: 1 },
      { productId: pandesal.id, variant: "Large", quantity: 1 },
    ]) {
      await expect(service.create(input({ items: [item] }))).rejects.toMatchObject({ statusCode: 400 });
    }
  });

  it("uses the full price once the sale has ended by the hand-over day", async () => {
    const order = await service.create(input({ pickupDate: "2026-11-27" }));
    expect(order.items[1]?.price).toBe(60);
  });

  it.each([
    ["today", "2026-11-25"],
    ["a Saturday", "2026-11-28"],
    ["more than 14 days ahead", "2026-12-10"],
  ])("refuses a hand-over day that is %s", async (_label, pickupDate) => {
    await expect(service.create(input({ pickupDate }))).rejects.toMatchObject({ statusCode: 400 });
  });

  it("only takes the owner's selling days, from the cut-off on", async () => {
    settings.preOrderDays = [4];
    await expect(service.create(input({ pickupDate: "2026-11-27" }))).rejects.toThrow(
      "only hand over pre-orders on Thursdays",
    );
    expect((await service.create(input({ pickupDate: "2026-11-26" }))).pickupDate).toBe("2026-11-26");
    settings.preOrderCutoffDays = 2;
    await expect(service.create(input({ pickupDate: "2026-11-26" }))).rejects.toThrow("Orders for that day are closed");
    expect((await service.create(input({ pickupDate: "2026-12-03" }))).pickupDate).toBe("2026-12-03");
  });

  it("closes a day at the cut-off time (Manila)", async () => {
    // Now is Wednesday 10:00; Thursday's orders close Wednesday at the cut-off time.
    settings.preOrderCutoffTime = "09:30";
    await expect(service.create(input({ pickupDate: "2026-11-26" }))).rejects.toThrow("Orders for that day are closed");
    settings.preOrderCutoffTime = "10:00";
    await expect(service.create(input({ pickupDate: "2026-11-26" }))).rejects.toThrow("Orders for that day are closed");
    settings.preOrderCutoffTime = "10:01";
    expect((await service.create(input({ pickupDate: "2026-11-26" }))).pickupDate).toBe("2026-11-26");
  });

  it("refuses archived, unknown or out-of-stock products, the honeypot and closed pre-orders", async () => {
    await expect(service.create(input({ items: [{ productId: randomUUID(), quantity: 1 }] }))).rejects.toMatchObject({
      statusCode: 400,
    });
    pandesal.isAvailable = false;
    await expect(service.create(input())).rejects.toThrow("out of stock");
    pandesal.isAvailable = true;
    await expect(
      service.create(
        input({
          items: [
            { productId: pandesal.id, quantity: 30 },
            { productId: pandesal.id, quantity: 30 },
          ],
        }),
      ),
    ).rejects.toThrow("At most 50");
    await expect(service.create(input({ website: "spam.example" }))).rejects.toMatchObject({ statusCode: 400 });
    settings.preOrdersOpen = false;
    await expect(service.create(input())).rejects.toMatchObject({ statusCode: 409 });
    expect(orders).toHaveLength(0);
  });

  it("confirms, then completes into a Sales Tracker entry", async () => {
    const { id, code } = await service.create(input());
    expect((await service.updateStatus(id, { status: "confirmed" })).status).toBe("confirmed");
    await expect(service.updateStatus(id, { status: "confirmed" })).rejects.toMatchObject({ statusCode: 409 });
    const done = await service.updateStatus(id, { status: "completed" });
    expect(done.status).toBe("completed");
    expect(done.salesEntryId).toBeDefined();
    expect(entries).toEqual([{ date: "2026-11-25T10:00", title: `Pre-order ${code}`, note: "Ana" }]);
    expect(sent.map((s) => s.kind)).toEqual(["placed", "confirmed"]);
    await expect(service.updateStatus(id, { status: "cancelled" })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("can't complete a pending order; cancels with a reason; deletes only cancelled orders", async () => {
    const { id } = await service.create(input());
    await expect(service.updateStatus(id, { status: "completed" })).rejects.toMatchObject({ statusCode: 409 });
    await expect(service.delete(id)).rejects.toMatchObject({ statusCode: 409 });
    const cancelled = await service.updateStatus(id, { status: "cancelled", reason: "Oven repair" });
    expect(cancelled).toMatchObject({ status: "cancelled", cancelReason: "Oven repair" });
    expect(sent.at(-1)?.kind).toBe("cancelled");
    await service.delete(id);
    await expect(service.getById(id)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("pre-order helpers", () => {
  it("prices a sale like the menu does", () => {
    const p = { price: 40, discountPrice: 15, discountEndsAt: "2026-11-30" };
    expect(priceOn(p, "2026-11-30")).toBe(25);
    expect(priceOn(p, "2026-12-01")).toBe(40);
    expect(priceOn({ price: 40 }, "2026-12-01")).toBe(40);
  });

  it("escapes customer text in emails", () => {
    const order = {
      code: "ABC234",
      customerName: "<b>Ana</b>",
      handoff: "8-Rizal",
      pickupDate: "2026-11-26",
      items: [{ productName: "Pan & Co", price: 10, quantity: 2 }],
    } as PreOrder;
    const { subject, html } = renderPreOrderEmail("placed", order, {
      businessName: "Pato",
      preOrderHandoffTime: "12–1 PM <canteen>",
    });
    expect(subject).toContain("ABC234");
    expect(html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
    expect(html).toContain("Pan &amp; Co");
    expect(html).not.toContain("<b>Ana");
    expect(html).toContain("12–1 PM &lt;canteen&gt;");
  });
});

describe("pre-order routes", () => {
  const app = createApp();

  it("validates a new order before touching the database", async () => {
    const res = await request(app).post("/api/v1/pre-orders").send({
      customerName: " ",
      email: "nope",
      contactNumber: "12-34",
      pickupDate: "2026-13-01",
      items: [],
    });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual([
      "contactNumber",
      "customerName",
      "email",
      "items",
      "pickupDate",
    ]);
  });

  it("limits placed orders per IP (PRE_ORDER_RATE_LIMIT_MAX is 3 in tests)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await request(app).post("/api/v1/pre-orders").send({})).status);
    expect(statuses.at(-1)).toBe(429);
    const res = await request(app).post("/api/v1/pre-orders").send({});
    expect(res.body).toMatchObject({ success: false, statusCode: 429 });
  });

  it("validates owner requests", async () => {
    const cookie = authCookie();
    await request(app).get("/api/v1/pre-orders?status=lost").set("Cookie", cookie).expect(400);
    await request(app).get("/api/v1/pre-orders?from=2026-11-30&to=2026-11-01").set("Cookie", cookie).expect(400);
    await request(app)
      .patch(`/api/v1/pre-orders/${randomUUID()}/status`)
      .set("Cookie", cookie)
      .send({ status: "pending" })
      .expect(400);
    await request(app)
      .patch(`/api/v1/pre-orders/${randomUUID()}/status`)
      .set("Cookie", cookie)
      .send({ status: "confirmed", reason: "x" })
      .expect(400);
    await request(app).put("/api/v1/menu/settings/pre-orders").set("Cookie", cookie).send({}).expect(400);
    for (const body of [
      { days: [] },
      { days: [6] },
      { cutoffDays: 0 },
      { cutoffDays: 7 },
      { cutoffTime: "24:00" },
      { cutoffTime: "6pm" },
      { handoffTime: "x".repeat(81) },
    ]) {
      await request(app).put("/api/v1/menu/settings/pre-orders").set("Cookie", cookie).send(body).expect(400);
    }
  });
});
