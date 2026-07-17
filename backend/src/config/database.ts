import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import * as schema from "../infrastructure/database/drizzle/schema";

const queryClient = postgres(env.databaseUrl);
export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
