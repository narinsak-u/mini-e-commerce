import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { products, categories, users } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";

const productName = `test-product-${randomUUID()}`;
const catName = `test-cat-${randomUUID()}`;
const adminEmail = `admin-${randomUUID()}@test.com`;
let adminToken = "";
let catId = "";
let productId = "";

beforeAll(async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: "password123" });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, adminEmail));
  adminToken = jwt.sign({ sub: res.body.user.id, role: "admin" }, env.jwtSecret, { expiresIn: "15m" });
  const catRes = await request(app).post("/categories").set("Authorization", `Bearer ${adminToken}`).send({ name: catName });
  catId = catRes.body.id;
});

afterAll(async () => {
  if (productId) await db.delete(products).where(eq(products.id, productId)).catch(() => {});
  if (catId) await db.delete(categories).where(eq(categories.id, catId)).catch(() => {});
  await db.delete(users).where(eq(users.email, adminEmail)).catch(() => {});
});

describe("Products API", () => {
  it("creates a product", async () => {
    const res = await request(app).post("/products").set("Authorization", `Bearer ${adminToken}`).send({ name: productName, price: 29.99, categoryId: catId });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(productName);
    productId = res.body.id;
  });

  it("lists products", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("gets product by id", async () => {
    const res = await request(app).get(`/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(productName);
  });

  it("rejects create without auth", async () => {
    const res = await request(app).post("/products").send({ name: "test", price: 10 });
    expect(res.status).toBe(401);
  });

  it("deletes a product", async () => {
    const res = await request(app).delete(`/products/${productId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    productId = "";
  });
});
