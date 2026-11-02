"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const executable = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "patch-package.cmd" : "patch-package",
);

if (!fs.existsSync(executable)) {
  console.log(
    "[patches] No hay herramientas de desarrollo instaladas; se omiten los parches.",
  );
  process.exit(0);
}

const result = spawnSync(executable, [], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("[patches] Error al ejecutar patch-package:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
