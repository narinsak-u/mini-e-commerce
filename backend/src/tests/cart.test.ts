import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import { redis } from "../config/redis";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { products, categories, users } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";

let userToken = "";
let productId = "";
let catId = "";
const productName = `cart-test-${randomUUID()}`;
const adminEmail = `admin-${randomUUID()}@test.com`;
const userEmail = `user-${randomUUID()}@test.com`;

beforeAll(async () => {
  const adminRes = await request(app).post("/auth/register").send({ name: "Admin", email: adminEmail, password: "password123" });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, adminEmail));
  const adminToken = jwt.sign({ sub: adminRes.body.user.id, role: "admin" }, env.jwtSecret, { expiresIn: "15m" });

  const userRes = await request(app).post("/auth/register").send({ name: "User", email: userEmail, password: "password123" });
  userToken = userRes.body.accessToken;

  const catRes = await request(app).post("/categories").set("Authorization", `Bearer ${adminToken}`).send({ name: `cat-${randomUUID()}` });
  catId = catRes.body.id;
  const prodRes = await request(app).post("/products").set("Authorization", `Bearer ${adminToken}`).send({ name: productName, price: 19.99, categoryId: catId });
  productId = prodRes.body.id;
});

afterAll(async () => {
  const keys = await redis.keys("cart:*");
  if (keys.length > 0) await redis.del(...keys);
  if (productId) await db.delete(products).where(eq(products.id, productId)).catch(() => {});
  if (catId) await db.delete(categories).where(eq(categories.id, catId)).catch(() => {});
  await db.delete(users).where(eq(users.email, adminEmail)).catch(() => {});
  await db.delete(users).where(eq(users.email, userEmail)).catch(() => {});
});

describe("Cart API", () => {
  it("adds an item", async () => {
    const res = await request(app).post("/cart/items").set("Authorization", `Bearer ${userToken}`).send({ productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(2);
  });

  it("returns cart", async () => {
    const res = await request(app).get("/cart").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("clears cart", async () => {
    const res = await request(app).delete("/cart").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });
});
