import { useState } from "react";

import {
  qualityManager,
  useQualitySettings,
} from "../../state/quality/QualityManager";
import type { PostprocessingQualityLevel } from "../../state/quality/QualityManager";

const panelStyle: React.CSSProperties = {
  background: "rgba(8, 10, 22, 0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e9ecff",
  padding: 10,
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  width: 240,
  boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
  backdropFilter: "blur(6px)",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#f8f9ff",
  fontSize: 12,
};

export function PerfToggles() {
  const quality = useQualitySettings();
  const [status, setStatus] = useState<string | null>(null);

  const toggleInstancing = (enabled: boolean) => {
    qualityManager.setInstancingEnabled(enabled);
    setStatus(`Instancing ${enabled ? "enabled" : "disabled"}`);
  };

  const toggleObstacleVisuals = (enabled: boolean) => {
    qualityManager.setObstacleVisuals(enabled);
    setStatus(`Obstacle visuals ${enabled ? "shown" : "hidden"}`);
  };

  const togglePostprocessing = (enabled: boolean) => {
    qualityManager.setPostprocessingEnabled(enabled);
    setStatus(`Post FX ${enabled ? "enabled" : "disabled"}`);
  };

  const updatePostprocessingQuality = (quality: PostprocessingQualityLevel) => {
    qualityManager.setPostprocessingQuality(quality);
    setStatus(`Post FX quality set to ${quality}`);
  };

  const toggleShadows = (enabled: boolean) => {
    qualityManager.setShadowsEnabled(enabled);
    setStatus(`Shadows ${enabled ? "enabled" : "disabled"}`);
  };

  const updateRenderDpr = (value: number) => {
    if (!Number.isFinite(value)) {
      return;
    }
    const next = Math.max(0.75, Math.min(2, Number(value.toFixed(2))));
    qualityManager.setRenderDpr(next);
    setStatus(`Render DPR set to ${next}`);
  };

  const updateMaxInstances = (
    field: keyof typeof quality.visuals.instancing.maxInstances,
    value: number,
  ) => {
    qualityManager.updateInstancingMaxInstances({
      [field]: Math.max(1, Math.floor(value)),
    });
    setStatus(`Max ${field} set to ${Math.max(1, Math.floor(value))}`);
  };

  const max = quality.visuals.instancing.maxInstances;

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>Performance / Debug</div>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={quality.visuals.instancing.enabled}
          onChange={(e) => toggleInstancing(e.target.checked)}
        />
        Instancing
      </label>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={quality.visuals.obstacles.visualsEnabled}
          onChange={(e) => toggleObstacleVisuals(e.target.checked)}
        />
        Show obstacle visuals
      </label>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={quality.visuals.postprocessing.enabled}
          onChange={(e) => togglePostprocessing(e.target.checked)}
        />
        Post FX
      </label>

      <label style={labelStyle}>
        <span style={{ minWidth: 64, display: "inline-block" }}>
          Post FX quality
        </span>
        <select
          style={inputStyle}
          value={quality.visuals.postprocessing.quality}
          onChange={(e) =>
            updatePostprocessingQuality(
              e.target.value as PostprocessingQualityLevel,
            )
          }
        >
          <option value="low">Low</option>
          <option value="high">High</option>
        </select>
      </label>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={quality.visuals.render.shadowsEnabled}
          onChange={(e) => toggleShadows(e.target.checked)}
        />
        Shadows
      </label>

      <label style={labelStyle}>
        <span style={{ minWidth: 64, display: "inline-block" }}>
          Render DPR
        </span>
        <input
          type="number"
          style={inputStyle}
          value={quality.visuals.render.dpr}
          onChange={(e) => updateRenderDpr(Number(e.target.value))}
          min={0.75}
          max={2}
          step={0.05}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {(["bullets", "rockets", "lasers", "effects"] as const).map((key) => (
          <label key={key} style={labelStyle}>
            <span style={{ minWidth: 64, display: "inline-block" }}>{key}</span>
            <input
              type="number"
              style={inputStyle}
              value={max[key]}
              onChange={(e) =>
                updateMaxInstances(key, Number(e.target.value) || max[key])
              }
              min={1}
            />
          </label>
        ))}
      </div>

      {status ? (
        <div style={{ fontSize: 11, opacity: 0.75 }}>{status}</div>
      ) : null}
    </div>
  );
}
