import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const envFile = new URL("../.env", import.meta.url);
const children = new Set();
let shuttingDown = false;

if (existsSync(envFile)) {
  process.loadEnvFile(fileURLToPath(envFile));
}

function start(label, script, overrides = {}) {
  const child = spawn(process.execPath, [script], {
    cwd: rootDir,
    env: { ...process.env, ...overrides },
    stdio: "inherit",
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    for (const other of children) {
      other.kill("SIGTERM");
    }

    if (signal) {
      console.error(`${label} stopped with signal ${signal}.`);
      process.exit(1);
      return;
    }

    process.exit(code ?? 0);
  });

  return child;
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start("api", "scripts/run-api-dev.mjs", { PORT: process.env.API_PORT ?? "3001" });
start("web", "scripts/run-offera-dev.mjs", {
  PORT: process.env.WEB_PORT ?? "5173",
  API_TARGET: process.env.API_TARGET ?? "http://127.0.0.1:3001",
  BASE_PATH: process.env.BASE_PATH ?? "/",
});
