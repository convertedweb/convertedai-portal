// Node 20-kompatibilis tesztfuttató: tsc-vel lefordítja a teszteket, majd node --test futtatja őket.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const outDir = mkdtempSync(join(tmpdir(), "portal-tests-"));
try {
  const tests = readdirSync("tests").filter((file) => file.endsWith(".test.ts")).map((file) => join("tests", file));
  execFileSync(
    "npx",
    ["tsc", ...tests, "--outDir", outDir, "--module", "commonjs", "--moduleResolution", "node", "--target", "ES2022", "--esModuleInterop", "--skipLibCheck", "--strict", "--incremental", "false", "--rootDir", "."],
    { stdio: "inherit" },
  );
  writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));
  const compiled = tests.map((file) => join(outDir, file.replace(/\.ts$/, ".js")));
  execFileSync(process.execPath, ["--test", ...compiled], { stdio: "inherit" });
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
