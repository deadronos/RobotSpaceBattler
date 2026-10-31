import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { qualityManager } from "../../src/state/quality/QualityManager";
import { DynamicResScaler } from "../../src/visuals/DynamicResScaler";

const sampler = vi.hoisted(() => ({
  emit: null as null | ((fps: number) => void),
}));

vi.mock("../../src/visuals/useFpsSampler", () => ({
  useFpsSampler: (_interval: number, cb: (fps: number) => void) => {
    sampler.emit = cb;
  },
}));
vi.mock("../../src/visuals/dynamicResolution", () => ({
  TARGET_FPS: 60,
  CHECK_INTERVAL_MS: 1000,
  FPS_TOLERANCE: 5,
  RECOVER_FPS: 58,
  MIN_DPR: 0.75,
  MAX_DPR: 1.5,
}));

const feed = (fps: number, times: number) => {
  for (let i = 0; i < times; i++) sampler.emit!(fps);
};
const dpr = () => qualityManager.getSettings().visuals.render.dpr;

describe("DynamicResScaler", () => {
  beforeEach(() => {
    qualityManager.setRenderDpr(1.5);
    render(<DynamicResScaler />);
  });

  it("keeps the default DPR while FPS is healthy", () => {
    feed(60, 10);
    expect(dpr()).toBe(1.5);
  });

  it("ignores a brief dip but drops DPR after sustained low FPS", () => {
    feed(30, 2);
    expect(dpr()).toBe(1.5);
    feed(30, 1);
    expect(dpr()).toBe(1);
  });

  it("recovers DPR once load drops, never above the default", () => {
    feed(30, 3);
    expect(dpr()).toBe(1);
    feed(60, 3);
    expect(dpr()).toBe(1.5);
    feed(60, 6);
    expect(dpr()).toBe(1.5);
  });
});
