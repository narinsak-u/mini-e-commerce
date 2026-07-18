import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { redis } from "../config/redis";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { orderItems } from "../infrastructure/database/drizzle/schema/order-items";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { users } from "../infrastructure/database/drizzle/schema/users";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { randomUUID } from "node:crypto";

let userToken = "";
let orderId = "";

describe("Orders API", () => {
  beforeAll(async () => {
    const userRes = await request(app).post("/auth/register").send({ name: "OrderUser", email: `order-${randomUUID()}@test.com`, password: "password123" });
    userToken = userRes.body.accessToken;
    const adminRes = await request(app).post("/auth/register").send({ name: "OrderAdmin", email: `order-admin-${randomUUID()}@test.com`, password: "password123" });
    await db.update(users).set({ role: "admin" }).where(eq(users.email, adminRes.body.user.email));
    const adminToken = jwt.sign({ sub: adminRes.body.user.id, role: "admin" }, env.jwtSecret, { expiresIn: "15m" });
    const catRes = await request(app).post("/categories").set("Authorization", `Bearer ${adminToken}`).send({ name: `cat-${randomUUID()}` });
    const prodRes = await request(app).post("/products").set("Authorization", `Bearer ${adminToken}`).send({ name: `prod-${randomUUID()}`, price: 15, categoryId: catRes.body.id });
    await request(app).post("/cart/items").set("Authorization", `Bearer ${userToken}`).send({ productId: prodRes.body.id, quantity: 1 });
    const orderRes = await request(app).post("/checkout").set("Authorization", `Bearer ${userToken}`);
    orderId = orderRes.body.id;
  });

  afterAll(async () => {
    if (orderId) {
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId)).catch(() => {});
      await db.delete(orders).where(eq(orders.id, orderId)).catch(() => {});
    }
    const keys = await redis.keys("cart:*");
    if (keys.length) await redis.del(...keys);
  });

  it("lists user orders", async () => {
    const res = await request(app).get("/orders").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("gets order by id", async () => {
    const res = await request(app).get(`/orders/${orderId}`).set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
  });

  it("cancels a pending order", async () => {
    const res = await request(app).post(`/orders/${orderId}/cancel`).set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("rejects cancel on already-cancelled order", async () => {
    const res = await request(app).post(`/orders/${orderId}/cancel`).set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(400);
  });
});
