// Lightweight performance test-harness registered on window.__perf
// Implements startMeasurement/stopMeasurement/reset/getLastReport used by Playwright

import type { PerfReport } from "../types";

type RAFHandle = number | null;

interface InternalState {
  running: boolean;
  startTime: number | null;
  warmupMs: number;
  targetFps: number;
  frames: number[]; // timestamps in ms
  rafHandle: RAFHandle;
  lastReport: PerfReport | null;
}

const state: InternalState = {
  running: false,
  startTime: null,
  warmupMs: 0,
  targetFps: 60,
  frames: [],
  rafHandle: null,
  lastReport: null,
};

function nowMs() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function rafLoop(ts: number) {
  if (!state.running) return;
  state.frames.push(ts);
  state.rafHandle = window.requestAnimationFrame(rafLoop);
}

export function startMeasurement(opts?: {
  warmupSeconds?: number;
  targetFrameRate?: number;
}) {
  // Reset existing state to ensure deterministic measurement
  reset();

  state.warmupMs = (opts?.warmupSeconds ?? 10) * 1000;
  state.targetFps = opts?.targetFrameRate ?? 60;
  state.running = true;
  state.startTime = nowMs();
  state.rafHandle = window.requestAnimationFrame(rafLoop);
  console.debug("[__perf] measurement started", {
    warmupMs: state.warmupMs,
    targetFps: state.targetFps,
  });
}

function computeBuckets(frames: number[], startMs: number, endMs: number) {
  const buckets: Array<{ startMs: number; frames: number; fps: number }> = [];
  const bucketStart = Math.floor(startMs);
  const bucketEnd = Math.ceil(endMs);
  for (let b = bucketStart; b < bucketEnd; b += 1000) {
    const start = b;
    const end = b + 1000;
    const framesInBucket = frames.filter((t) => t >= start && t < end).length;
    const fps = framesInBucket; // frames per 1s window
    buckets.push({ startMs: start - startMs, frames: framesInBucket, fps });
  }
  return buckets;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

const EMPTY_REPORT: PerfReport = {
  medianFPS: 0,
  p5FPS: 0,
  totalFrames: 0,
  droppedFrames: 0,
  durationMs: 0,
  buckets: [],
};

export async function stopMeasurement(): Promise<PerfReport> {
  if (!state.running) {
    console.debug("[__perf] stopMeasurement called but not running");
    return state.lastReport ?? EMPTY_REPORT;
  }

  state.running = false;
  if (state.rafHandle != null) {
    window.cancelAnimationFrame(state.rafHandle);
    state.rafHandle = null;
  }

  const endTime = nowMs();
  const warmupEnd = (state.startTime ?? endTime) + state.warmupMs;

  // Only consider frames after warm-up
  const framesPostWarmup = state.frames.filter(
    (t) => t >= warmupEnd && t <= endTime,
  );

  const durationMs = framesPostWarmup.length
    ? Math.max(
        0,
        framesPostWarmup[framesPostWarmup.length - 1] - framesPostWarmup[0],
      )
    : Math.max(0, endTime - warmupEnd);

  const totalFrames = framesPostWarmup.length;
  const buckets = computeBuckets(framesPostWarmup, warmupEnd, endTime);
  const bucketFps = buckets.map((b) => b.fps);

  const medianFPS = median(bucketFps);
  const p5FPS = percentile(bucketFps, 5);

  const durationSeconds = Math.max(0.0001, durationMs / 1000);
  const expectedFrames = durationSeconds * state.targetFps;
  const droppedFrames = Math.max(0, Math.round(expectedFrames - totalFrames));

  const report: PerfReport = {
    medianFPS,
    p5FPS,
    totalFrames,
    droppedFrames,
    durationMs,
    buckets,
  };

  state.lastReport = report;
  console.debug("[__perf] measurement stopped", report);
  return report;
}

export function reset() {
  state.running = false;
  state.startTime = null;
  state.frames.length = 0;
  state.rafHandle = null;
  state.lastReport = null;
}

export function getLastReport(): PerfReport | null {
  return state.lastReport;
}

// Register on window so Playwright/CI tests can call it
if (typeof window !== "undefined") {
  if (!window.__perf) {
    window.__perf = {
      startMeasurement,
      stopMeasurement,
      reset,
      getLastReport,
    };
  }
}
