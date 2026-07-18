import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { notifications } from "../infrastructure/database/drizzle/schema/notifications";
import { randomUUID } from "node:crypto";

let userToken = "";
let userId = "";
let notifId = "";

describe("Notifications API", () => {
  beforeAll(async () => {
    const res = await request(app).post("/auth/register").send({ name: "NotifUser", email: `notif-${randomUUID()}@test.com`, password: "password123" });
    userToken = res.body.accessToken;
    userId = res.body.user.id;
    // Seed a notification directly for testing
    notifId = randomUUID();
    await db.insert(notifications).values({ id: notifId, userId, type: "payment_success", title: "Test Notification", body: "Test body", read: false, createdAt: new Date() });
  });

  afterAll(async () => {
    if (notifId) await db.delete(notifications).where(eq(notifications.id, notifId)).catch(() => {});
  });

  it("lists notifications", async () => {
    const res = await request(app).get("/notifications").set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });
});
