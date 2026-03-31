import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const envFile = new URL("../.env", import.meta.url);
const requireFromOffera = createRequire(
  new URL("../artifacts/offera/package.json", import.meta.url),
);
const vitePackageJson = requireFromOffera.resolve("vite/package.json");
const viteBin = path.join(path.dirname(vitePackageJson), "bin", "vite.js");

if (existsSync(envFile)) {
  process.loadEnvFile(fileURLToPath(envFile));
}

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: process.env.PORT ?? "5173",
  BASE_PATH: process.env.BASE_PATH ?? "/",
  API_TARGET: process.env.API_TARGET ?? "http://127.0.0.1:3001",
};

const child = spawn(
  process.execPath,
  [viteBin, "--config", "artifacts/offera/vite.config.ts", "--host", "0.0.0.0"],
  {
    cwd: rootDir,
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
