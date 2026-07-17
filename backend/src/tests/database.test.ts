import { describe, it, expect } from "vitest";
import { db } from "../config/database";
import { sql } from "drizzle-orm";

describe("Database", () => {
  it("connects and runs a query", async () => {
    const result = await db.execute(sql`SELECT 1 as value`);
    expect(result).toBeDefined();
  });
});
