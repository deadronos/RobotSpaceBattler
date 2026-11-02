// Prototype A/B render-cost probe from the 2026-11-02 assessment (#229-#233).
// Usage: node scripts/perf/probe-render-cost.mjs "$PWD" (after npm run build).
// To be folded into scripts/perf/visuals/ and deleted; see the render-cost plan.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const root = process.argv[2];
const require = createRequire(root + "/package.json");
const { chromium } = require("playwright");

const port = 4311;
const preview = spawn(
  "npx",
  ["vite", "preview", "--port", String(port), "--strictPort"],
  { cwd: root, stdio: "ignore" },
);
const base = `http://localhost:${port}/RobotSpaceBattler/`;
for (let i = 0; i < 60; i++) {
  try {
    await fetch(base);
    break;
  } catch {
    await delay(500);
  }
}

const browser = await chromium.launch({
  headless: false,
  args: [
    "--use-angle=metal",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
  ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
});

async function open(query) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(base + "?debug" + query);
  await page.waitForFunction(
    () => (window.__battleWorld?.state.frameIndex ?? -1) >= 300,
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(1500);
  return page;
}

async function fps(page, ms = 5000) {
  return page.evaluate(
    (d) =>
      new Promise((res) => {
        const t0 = performance.now();
        let n = 0;
        let renderMs = 0;
        const gl = window.__robotScene.gl;
        const orig = gl.render.bind(gl);
        gl.render = (s, c) => {
          const a = performance.now();
          orig(s, c);
          renderMs += performance.now() - a;
        };
        const step = (now) => {
          n++;
          if (now - t0 < d) requestAnimationFrame(step);
          else {
            gl.render = orig;
            res({
              fps: +(n / ((now - t0) / 1000)).toFixed(1),
              renderCallMsPerFrame: +(renderMs / n).toFixed(2),
              calls: window.__rendererStats.drawCalls,
              tris: window.__rendererStats.triangles,
            });
          }
        };
        requestAnimationFrame(step);
      }),
    ms,
  );
}

const page = await open("");
const dump = await page.evaluate(() => {
  const { scene, gl } = window.__robotScene;
  const rows = [];
  const lights = {};
  const mats = new Set();
  scene.traverse((o) => {
    if (o.isLight) lights[o.type] = (lights[o.type] ?? 0) + 1;
    if (!(o.isMesh || o.isPoints || o.isLine)) return;
    const g = o.geometry;
    const idx = g.index ? g.index.count : g.attributes.position.count;
    mats.add(o.material.uuid);
    rows.push({
      name: o.name || o.parent?.type,
      type: o.type,
      visible: o.visible,
      inst: o.isInstancedMesh ? o.count : 1,
      tris: Math.round(idx / 3),
      mat: o.material.type,
      cast: o.castShadow,
      transparent: o.material.transparent,
    });
  });
  const agg = {};
  for (const r of rows) {
    const k = `${r.type}|${r.mat}|tris=${r.tris}|inst=${r.inst}|cast=${r.cast}`;
    agg[k] = (agg[k] ?? 0) + 1;
  }
  return {
    lights,
    uniqueMaterials: mats.size,
    meshes: rows.length,
    agg,
    programs: gl.info.programs.length,
    robots: window.__battleWorld.robots.entities.length,
  };
});
console.log(JSON.stringify(dump, null, 1));
for (let i = 0; i < 2; i++) console.log("baseline", await fps(page));
if (process.env.BASELINE_ONLY) {
  await browser.close();
  preview.kill();
  process.exit(0);
}

// Runtime A/B toggles on the same page.
const toggle = (fn) => page.evaluate(fn);
await toggle(() => {
  window.__robotScene.scene.traverse((o) => {
    if (o.isPoints) o.visible = false;
  });
});
console.log("stars off", await fps(page));
await toggle(() => {
  window.__robotScene.scene.traverse((o) => {
    if (o.isPointLight) o.visible = false;
  });
});
await page.waitForTimeout(1500);
console.log("+ point lights off", await fps(page));
await toggle(() => {
  window.__robotScene.scene.traverse((o) => {
    if (o.isSpotLight || o.isHemisphereLight) o.visible = false;
  });
});
await page.waitForTimeout(1500);
console.log("+ spot/hemi off", await fps(page));
await page.close();

for (const q of ["&postfx=0", "&shadows=0", "&postfx=0&shadows=0"]) {
  const p = await open(q);
  console.log(q, await fps(p));
  await p.close();
}
// Sim-only cost: pause rendering by measuring render-call time share above.
await browser.close();
preview.kill();
