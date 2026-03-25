import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "dist");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

await build({
  entryPoints: [path.join(__dirname, "src", "content.ts")],
  bundle: true,
  outfile: path.join(distDir, "content.js"),
  platform: "browser",
  target: "es2020",
  format: "iife", // Chrome MV3 content scripts: avoid ESM/module complications
  sourcemap: true,
});

const filesToCopy = ["manifest.json", "pokepaste-translator-icon.png"];

for (const file of filesToCopy) {
  const srcPath = path.join(__dirname, file);
  const dstPath = path.join(distDir, file);
  fs.copyFileSync(srcPath, dstPath);
}

console.log(`[build] Output written to: ${distDir}`);
