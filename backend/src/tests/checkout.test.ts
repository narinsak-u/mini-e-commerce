import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import { redis } from "../config/redis";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { orderItems } from "../infrastructure/database/drizzle/schema/order-items";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { users } from "../infrastructure/database/drizzle/schema/users";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";

let userToken = "";
let productId = "";
let orderId = "";

beforeAll(async () => {
  const userRes = await request(app).post("/auth/register").send({ name: "User", email: `user-${randomUUID()}@test.com`, password: "password123" });
  userToken = userRes.body.accessToken;
  const adminRes = await request(app).post("/auth/register").send({ name: "Admin2", email: `admin2-${randomUUID()}@test.com`, password: "password123" });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, adminRes.body.user.email));
  const adminToken = jwt.sign({ sub: adminRes.body.user.id, role: "admin" }, env.jwtSecret, { expiresIn: "15m" });
  const catRes = await request(app).post("/categories").set("Authorization", `Bearer ${adminToken}`).send({ name: `cat-${randomUUID()}` });
  const prodRes = await request(app).post("/products").set("Authorization", `Bearer ${adminToken}`).send({ name: `prod-${randomUUID()}`, price: 9.99, categoryId: catRes.body.id });
  productId = prodRes.body.id;
  await request(app).post("/cart/items").set("Authorization", `Bearer ${userToken}`).send({ productId, quantity: 1 });
});

afterAll(async () => {
  if (orderId) { await db.delete(orderItems).where(eq(orderItems.orderId, orderId)).catch(() => {}); await db.delete(orders).where(eq(orders.id, orderId)).catch(() => {}); }
  const keys = await redis.keys("cart:*");
  if (keys.length > 0) await redis.del(...keys);
});

describe("Checkout API", () => {
  it("creates an order from cart", async () => {
    const res = await request(app).post("/checkout").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(Number(res.body.totalAmount)).toBeGreaterThan(0);
    orderId = res.body.id;
  });

  it("returns empty cart after checkout", async () => {
    const res = await request(app).get("/cart").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });

  it("lists user orders", async () => {
    const res = await request(app).get("/orders").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
