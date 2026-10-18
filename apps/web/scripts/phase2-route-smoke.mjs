import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = process.cwd();
const nextBin = resolve(webRoot, "node_modules/next/dist/bin/next");
if (!existsSync(nextBin)) throw new Error("Next.js CLI was not found. Run npm ci before the production build.");

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return server.close(() => reject(new Error("Could not obtain a free local port.")));
      const port = address.port;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

const port = await freePort();
const baseUrl = `http://127.0.0.1:${port}`;
let output = "";
let exited = false;
const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: webRoot,
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
child.stderr.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
child.on("exit", () => { exited = true; });

async function stop() {
  if (!exited) child.kill("SIGTERM");
  await new Promise((resolveStop) => {
    if (exited) return resolveStop();
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolveStop(); }, 2500);
    child.once("exit", () => { clearTimeout(timer); resolveStop(); });
  });
}

try {
  const deadline = Date.now() + 45_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`Next.js production server exited early. Output:\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/en`);
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for server to bind. */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  assert.ok(ready, `Next.js production server did not become ready. Output:\n${output}`);

  const routes = ["/en", "/ar", "/en/jobs", "/ar/jobs"];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    assert.equal(response.status, 200, `${route} should render HTTP 200, got ${response.status}`);
    const html = await response.text();
    assert.ok(html.includes("FURSA") || html.includes("فرصة"), `${route} should include the FURSA shared brand shell`);
    assert.ok(html.includes("main-content"), `${route} should include the skip-link content target`);
    console.log(`PASS ${route} -> ${response.status}`);
  }
  console.log("FURSA Phase 2 route smoke checks passed for English/Arabic home and job-search routes.");
} finally {
  await stop();
}
