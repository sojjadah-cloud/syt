// Starts a local PostgreSQL server for development/testing (no system install required).
// Data is kept in ./.pg-data. Production deployments should use a managed PostgreSQL server.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".pg-data");
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "se_survey",
  password: "se_survey_dev",
  port: 54329,
  persistent: true,
  // UTF-8 is required for Arabic answers (Windows would otherwise default to WIN1252).
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) {
  const client = pg.getPgClient();
  await client.connect();
  await client.query("CREATE DATABASE se_survey ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'");
  await client.end();
}
console.log("PostgreSQL running: postgresql://se_survey:se_survey_dev@localhost:54329/se_survey");

const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
