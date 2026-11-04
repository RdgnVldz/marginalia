import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// In development, Next.js reloads modules often. Keeping the pool on
// globalThis stops it from opening a new set of connections every reload.

const globalForPool = globalThis as unknown as { pgPool?: Pool };

const pool =
    globalForPool.pgPool ??
    new Pool({
        connectionString: process.env.DATABASE_URL,
        idleTimeoutMillis: 5_000, // close unused connections quickly
        connectionTimeoutMillis: 10_000 // fail instead of hanging forver
    });

if (process.env.NODE_ENV !== "production") {
    globalForPool.pgPool = pool;
}

//Only on Vercel: close idle connections before the functions is suspended
if (process.env.VERCEL){
    attachDatabasePool(pool);
}

export const db = drizzle({ client: pool });