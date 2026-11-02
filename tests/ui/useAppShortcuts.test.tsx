import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAppShortcuts } from "@/components/useAppShortcuts";

function setup(enabled = true) {
  const onPauseResume = vi.fn<() => void>();
  const onReset = vi.fn<() => void>();
  renderHook(() => useAppShortcuts({ enabled, onPauseResume, onReset }));
  return { onPauseResume, onReset };
}

describe("useAppShortcuts (#170)", () => {
  it("maps Space to pause/resume and R to reset", () => {
    const { onPauseResume, onReset } = setup();

    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "r" });

    expect(onPauseResume).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("stays dormant while a dialog is open", () => {
    const { onPauseResume, onReset } = setup(false);

    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "r" });

    expect(onPauseResume).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("ignores key repeat and events from text fields", () => {
    const { onPauseResume, onReset } = setup();
    const input = document.createElement("input");
    document.body.appendChild(input);

    fireEvent.keyDown(window, { key: " ", repeat: true });
    fireEvent.keyDown(input, { key: " ", bubbles: true });
    fireEvent.keyDown(input, { key: "R", bubbles: true });

    expect(onPauseResume).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
    input.remove();
  });
});
