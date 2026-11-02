// Opt-in scene breakdown for scripts/perf/measure-visuals.js (#229-#233).
//
// `--breakdown` dumps what the frame is actually made of — lights by type,
// unique materials, programs, meshes grouped by material/triangles/instance
// count/`castShadow` — and times the share of the frame spent inside
// `gl.render`. It replaces the throwaway `scripts/perf/probe-render-cost.mjs`
// prototype from the 2026-11-02 assessment and runs against a production build
// with `?debug`, so it needs `window.__robotScene`.

const MAX_GROUP_NAMES = 4;

/**
 * Dumps the scene graph: lights, material/mesh grouping and program count.
 * Runs on the page, so it must stay self-contained.
 */
export async function collectSceneBreakdown(page) {
  const dump = await page.evaluate(() => {
    const { scene, gl } = window.__robotScene;
    const lights = [];
    const rows = [];
    const materials = new Set();

    scene.traverse((object) => {
      if (object.isLight) {
        lights.push({
          type: object.type,
          color: `#${object.color.getHexString()}`,
          intensity: object.intensity,
          castShadow: object.castShadow,
        });
        return;
      }
      if (!(object.isMesh || object.isPoints || object.isLine)) {
        return;
      }
      const geometry = object.geometry;
      const vertices = geometry.index
        ? geometry.index.count
        : geometry.attributes.position.count;
      const material = Array.isArray(object.material)
        ? object.material[0]
        : object.material;
      materials.add(material.uuid);
      rows.push({
        name: object.name || object.parent?.name || object.parent?.type || "?",
        type: object.type,
        triangles: Math.round(vertices / 3),
        instances: object.isInstancedMesh ? object.count : 1,
        material: material.type,
        transparent: Boolean(material.transparent),
        castShadow: Boolean(object.castShadow),
        vertexColors: Boolean(material.vertexColors),
      });
    });

    const groups = {};
    for (const row of rows) {
      const key = [
        row.type,
        row.material,
        `tris=${row.triangles}`,
        `inst=${row.instances}`,
        `cast=${row.castShadow}`,
        `transparent=${row.transparent}`,
        `vertexColors=${row.vertexColors}`,
      ].join("|");
      const group = groups[key] ?? { key, count: 0, names: [] };
      group.count += 1;
      if (group.names.length < 4 && !group.names.includes(row.name)) {
        group.names.push(row.name);
      }
      groups[key] = group;
    }

    return {
      lights,
      lightsByType: lights.reduce((acc, light) => {
        acc[light.type] = (acc[light.type] ?? 0) + 1;
        return acc;
      }, {}),
      shadowCastingLights: lights.filter((light) => light.castShadow).length,
      meshCount: rows.length,
      uniqueMaterials: materials.size,
      programs: gl.info.programs?.length ?? -1,
      triangleTotal: rows.reduce(
        (sum, row) => sum + row.triangles * row.instances,
        0,
      ),
      groups: Object.values(groups).sort((a, b) => b.count - a.count),
      rows,
    };
  });
  return { ...dump, maxGroupNames: MAX_GROUP_NAMES };
}

/**
 * Uncapped fps plus the mean ms per frame spent inside `gl.render` (main,
 * shadow and composer passes all funnel through it).
 */
export async function sampleRenderCallTime(page, durationMs = 5000) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const gl = window.__robotScene.gl;
        const original = gl.render.bind(gl);
        let renderMs = 0;
        gl.render = (scene, camera) => {
          const started = performance.now();
          original(scene, camera);
          renderMs += performance.now() - started;
        };
        const start = performance.now();
        let frames = 0;
        const round = (value) => Math.round(value * 100) / 100;
        const step = (now) => {
          frames += 1;
          if (now - start < duration) {
            requestAnimationFrame(step);
            return;
          }
          gl.render = original;
          const elapsed = now - start;
          const frameMs = elapsed / frames;
          resolve({
            frames,
            durationMs: Math.round(elapsed),
            // Drop the bootstrap frame, which includes the hook itself.
            meanFrameMs: round(frameMs),
            fps: round((frames / elapsed) * 1000),
            renderMsPerFrame: round(renderMs / frames),
            renderShare: round(renderMs / elapsed),
          });
        };
        requestAnimationFrame(step);
      }),
    durationMs,
  );
}

/** Per-light table, so a light cut is documented light by light. */
export function formatLightList(breakdown) {
  if (!breakdown || breakdown.scene.lights.length === 0) return [];
  const lines = [];
  lines.push("| # | type | colour | intensity | casts shadow |");
  lines.push("| ---: | --- | --- | ---: | --- |");
  breakdown.scene.lights.forEach((light, index) => {
    lines.push(
      `| ${index + 1} | ${light.type} | ${light.color} | ${light.intensity} | ${light.castShadow} |`,
    );
  });
  lines.push("");
  return lines;
}

/** Markdown section for the harness report. */
export function formatBreakdown(breakdown) {
  if (!breakdown) return [];
  const lines = [];
  lines.push("## M8 scene breakdown (`--breakdown`)");
  lines.push("");
  const lights = Object.entries(breakdown.scene.lightsByType)
    .map(([type, count]) => `${count}× ${type}`)
    .join(", ");
  lines.push(`- lights: ${lights || "none"}`);
  lines.push(`- shadow-casting lights: ${breakdown.scene.shadowCastingLights}`);
  lines.push(
    `- meshes: ${breakdown.scene.meshCount}, unique materials: ${breakdown.scene.uniqueMaterials}, programs: ${breakdown.scene.programs}`,
  );
  lines.push(
    `- triangles drawn (instances × geometry): ${breakdown.scene.triangleTotal}`,
  );
  lines.push(
    `- uncapped: ${breakdown.render.fps} fps, ${breakdown.render.meanFrameMs} ms/frame, ${breakdown.render.renderMsPerFrame} ms in gl.render (${Math.round(breakdown.render.renderShare * 100)}%)`,
  );
  lines.push("");
  lines.push(
    "| meshes | type | material | tris | instances | cast | transparent |",
  );
  lines.push("| ---: | --- | --- | ---: | ---: | --- | --- |");
  for (const group of breakdown.scene.groups) {
    const parts = Object.fromEntries(
      group.key.split("|").map((part) => {
        const [head, value] = part.split("=");
        return value === undefined ? [head, ""] : [head, value];
      }),
    );
    const type = group.key.split("|")[0];
    const material = group.key.split("|")[1];
    lines.push(
      `| ${group.count} | ${type} | ${material} | ${parts.tris} | ${parts.inst} | ${parts.cast} | ${parts.transparent} |`,
    );
  }
  lines.push("");
  return lines;
}
