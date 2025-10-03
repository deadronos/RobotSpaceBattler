import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef, useState } from "react";

import { getRuntimeEventLog } from "../ecs/ecsResolve";
import type { DeathAuditEntry } from "../utils/runtimeEventLog";
import { getFixedStepMetrics } from "../utils/sceneMetrics";

export default function DiagnosticsOverlay({
  updateHz = 8,
  showEventLog = false,
  showFixedStepMetrics = false,
}: {
  updateHz?: number;
  showEventLog?: boolean;
  showFixedStepMetrics?: boolean;
}) {
  const textRef = useRef<HTMLDivElement | null>(null);
  const eventLogRef = useRef<HTMLDivElement | null>(null);
  const samples = useMemo(
    () => ({ last: Date.now(), fps: 0, acc: 0, frames: 0 }),
    [],
  );
  const interval = 1000 / Math.max(1, updateHz);
  const nextUpdateRef = useRef(Date.now() + interval);
  const [recentEvents, setRecentEvents] = useState<DeathAuditEntry[]>([]);

  useFrame((_, dt) => {
    const now = Date.now();
    samples.frames += 1;
    samples.acc += dt;
    if (now >= nextUpdateRef.current) {
      const fps = (samples.frames / (samples.acc || 1e-6)) | 0;
      samples.fps = fps;
      samples.frames = 0;
      samples.acc = 0;
      nextUpdateRef.current = now + interval;

      const el = textRef.current;
      if (el) {
        let text = `FPS ${fps} | dt ${(dt * 1000).toFixed(1)}ms | t ${now.toFixed(0)}ms`;
        
        // Add fixed-step metrics if enabled
        if (showFixedStepMetrics) {
          const stepMetrics = getFixedStepMetrics();
          text += ` | Steps: ${stepMetrics.stepsLastFrame} | Backlog: ${stepMetrics.backlog}`;
          
          // Add rAF timing metrics if available
          if (stepMetrics.lastRafTimestamp !== undefined) {
            text += ` | rAF: ${stepMetrics.lastRafTimestamp.toFixed(0)}ms`;
          }
          if (stepMetrics.invalidationsPerRaf !== undefined) {
            text += ` | Inv: ${stepMetrics.invalidationsPerRaf}`;
          }
        }
        
        el.textContent = text;
      }

      // Update event log display if enabled
      if (showEventLog) {
        const log = getRuntimeEventLog();
        if (log) {
          const events = log.read({ order: "newest-first" }).slice(0, 10);
          setRecentEvents(events);
        }
      }
    }
  });

  // Use Html to render on top of the canvas without affecting scene
  return (
    <Html position={[0, 0, 0]} prepend zIndexRange={[1000, 2000]}>
      <div className="diag-container">
        <div ref={textRef} className="diag-overlay">
          FPS …
        </div>
        {showEventLog && recentEvents.length > 0 && (
          <div ref={eventLogRef} className="diag-overlay event-log">
            <div className="event-log-title">Recent Events (last 10):</div>
            {recentEvents.map((evt) => (
              <div key={evt.id} className="event-entry">
                <div>
                  <strong>{evt.classification}</strong> | Δ{evt.scoreDelta}
                </div>
                <div className="event-details">
                  Victim: {evt.victimId} ({evt.victimTeam})
                  {evt.killerId && ` | Killer: ${evt.killerId} (${evt.killerTeam})`}
                </div>
                <div className="event-meta">
                  Frame {evt.frameCount} @ {evt.simNowMs}ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Html>
  );
}
