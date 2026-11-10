// Real Postgres for local dev/tests, no Docker needed. Ctrl+C to stop.
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const pg = new EmbeddedPostgres({ databaseDir: ".pgdata", user: "postgres", password: "postgres", port: 5433, persistent: true });
const fresh = !existsSync(".pgdata/PG_VERSION");
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("praxis");
console.log("postgres ready on :5433");
process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
