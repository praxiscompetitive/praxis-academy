import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Serverless-friendly: one small connection per lambda; use a pooled URL (Neon / Vercel Postgres) in production.
const g = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
const sql = (g.sql ??= postgres(process.env.DATABASE_URL!, { max: 1, prepare: false }));
export const db = drizzle(sql, { schema });
export * from "./schema";
