import app from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"] ?? "3001";
const port = Number(rawPort);
const host = process.env["HOST"] ?? "127.0.0.1";

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function verifyDatabaseConnectionIfConfigured() {
  if (!process.env.DATABASE_URL) {
    logger.info("DATABASE_URL is not set, using local JSON storage");
    return;
  }

  const [{ pool }] = await Promise.all([import("@workspace/db")]);

  try {
    await pool.query("select 1");
    logger.info("Database connection verified");
  } catch (err) {
    logger.error({ err }, "Database connection failed during startup");
    process.exit(1);
  }
}

await verifyDatabaseConnectionIfConfigured();

app.listen(port, host, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ host, port }, "Server listening");
});
