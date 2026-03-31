import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const envFile = new URL("../.env", import.meta.url);

if (existsSync(envFile)) {
  process.loadEnvFile(fileURLToPath(envFile));
}

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: process.env.PORT ?? "3001",
};

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code ?? "unknown"}`));
    });
  });
}

try {
  await runNode(["artifacts/api-server/build.mjs"]);

  const server = spawn(
    process.execPath,
    ["--enable-source-maps", "artifacts/api-server/dist/index.mjs"],
    {
      cwd: rootDir,
      env,
      stdio: "inherit",
    },
  );

  server.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
