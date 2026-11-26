import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("PWA Installability & Offline Compliance", () => {
  it("provides required PNG icon resolutions (192x192, 512x512, maskable 512x512, and 180x180 apple-touch-icon)", () => {
    const requiredFiles = [
      "public/pwa-192x192.png",
      "public/pwa-512x512.png",
      "public/pwa-maskable-512x512.png",
      "public/apple-touch-icon.png",
      "public/favicon.ico",
      "public/icon.svg",
    ];
    for (const rel of requiredFiles) {
      const fullPath = path.join(root, rel);
      assert.ok(fs.existsSync(fullPath), `Expected PWA asset ${rel} to exist`);
      assert.ok(fs.statSync(fullPath).size > 500, `Expected ${rel} to be non-empty`);
    }
  });

  it("configures index.html with mobile-web-app-capable and PNG apple-touch-icon", () => {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    assert.match(html, /<meta\s+name="mobile-web-app-capable"\s+content="yes"\s*\/>/i);
    assert.match(html, /<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"\s*\/>/i);
    assert.match(html, /<link\s+rel="apple-touch-icon"\s+href="\/apple-touch-icon\.png"\s*\/>/i);
    assert.doesNotMatch(html, /rel="apple-touch-icon"\s+href="\/icon\.svg"/i);
  });

  it("builds complete manifest.webmanifest and Workbox sw.js via VitePWA", () => {
    const manifestPath = path.join(root, "dist/manifest.webmanifest");
    const swPath = path.join(root, "dist/sw.js");
    assert.ok(fs.existsSync(manifestPath), "Expected built dist/manifest.webmanifest to exist");
    assert.ok(fs.existsSync(swPath), "Expected built dist/sw.js to exist");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.id, "/");
    assert.equal(manifest.start_url, "/");
    assert.equal(manifest.scope, "/");
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.short_name && manifest.short_name.length <= 12, "short_name must be <= 12 chars");

    const has192 = manifest.icons.some((i: any) => i.sizes === "192x192" && i.type === "image/png" && i.purpose === "any");
    const has512 = manifest.icons.some((i: any) => i.sizes === "512x512" && i.type === "image/png" && i.purpose === "any");
    const hasMaskable = manifest.icons.some((i: any) => i.sizes === "512x512" && i.type === "image/png" && i.purpose === "maskable");
    assert.ok(has192, "Manifest must include 192x192 PNG icon with purpose 'any'");
    assert.ok(has512, "Manifest must include 512x512 PNG icon with purpose 'any'");
    assert.ok(hasMaskable, "Manifest must include 512x512 PNG icon with purpose 'maskable'");

    const swContent = fs.readFileSync(swPath, "utf8");
    assert.match(swContent, /precacheAndRoute/, "Service worker must precache app shell and bundle assets");
    assert.match(swContent, /index\.html/, "Service worker must precache index.html for offline navigation");
  });

  it("wires VitePWA devOptions, TypeScript declarations, PWAInstallButton, and OfflineIndicator", () => {
    const viteCfg = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
    assert.match(viteCfg, /VitePWA\(/);
    assert.match(viteCfg, /devOptions:\s*\{[\s\S]*enabled:\s*true/);

    const viteEnv = fs.readFileSync(path.join(root, "src/vite-env.d.ts"), "utf8");
    assert.match(viteEnv, /vite-plugin-pwa\/client/);

    const navbar = fs.readFileSync(path.join(root, "src/components/Navbar.tsx"), "utf8");
    assert.match(navbar, /PWAInstallButton/);

    const appTsx = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
    assert.match(appTsx, /OfflineIndicator/);
  });
});
