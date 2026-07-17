import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../index";
import { randomUUID } from "node:crypto";

let adminToken = "";

beforeAll(async () => {
  const res = await request(app).post("/auth/register").send({ name: "Admin3", email: `admin3-${randomUUID()}@test.com`, password: "password123" });
  adminToken = res.body.accessToken;
});

describe("Admin API", () => {
  it("rejects non-admin users", async () => {
    const res = await request(app).get("/admin/analytics").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});
