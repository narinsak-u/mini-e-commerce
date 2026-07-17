/** Integration tests for the full auth flow. */
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { users } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";

const testEmail = `test-${randomUUID()}@example.com`;
const testPassword = "password123";
const testName = "Test User";
let accessToken = "";
let refreshTokenValue = "";

afterAll(async () => {
  await db.delete(users).where(eq(users.email, testEmail));
});

describe("Auth API", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: testName, email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe(testName);
    expect(res.body.user.role).toBe("customer");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    accessToken = res.body.accessToken;
    refreshTokenValue = res.body.refreshToken;
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: testName, email: testEmail, password: testPassword });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Email already in use");
  });

  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: testEmail, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("refreshes token with valid refresh token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: refreshTokenValue });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("rejects refresh with invalid token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid refresh token");
  });

  it("logs out successfully", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: refreshTokenValue });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });

  it("rejects register with invalid email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Bad", email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("rejects register with short password", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Bad", email: `bad-${randomUUID()}@example.com`, password: "12345" });
    expect(res.status).toBe(400);
  });
});
