/** Integration tests for categories API. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { categories, users } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";

const catName = `test-cat-${randomUUID()}`;
const adminEmail = `admin-${randomUUID()}@test.com`;
let catId = "";
let adminToken = "";

beforeAll(async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: "password123" });
  await db.update(users).set({ role: "admin" }).where(eq(users.email, adminEmail));
  adminToken = jwt.sign({ sub: res.body.user.id, role: "admin" }, env.jwtSecret, { expiresIn: "15m" });
});

afterAll(async () => {
  if (catId) await db.delete(categories).where(eq(categories.id, catId)).catch(() => {});
  await db.delete(users).where(eq(users.email, adminEmail)).catch(() => {});
});

describe("Categories API", () => {
  it("creates a category", async () => {
    const res = await request(app)
      .post("/categories").set("Authorization", `Bearer ${adminToken}`)
      .send({ name: catName });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(catName);
    catId = res.body.id;
  });

  it("lists categories", async () => {
    const res = await request(app).get("/categories");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects create without auth", async () => {
    const res = await request(app).post("/categories").send({ name: "test" });
    expect(res.status).toBe(401);
  });

  it("deletes a category", async () => {
    const res = await request(app)
      .delete(`/categories/${catId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    catId = "";
  });
});
