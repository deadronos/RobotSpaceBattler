import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsModal } from "@/components/ui/SettingsModal";
import React from "react";

function renderSettings() {
  const onClose = vi.fn<() => void>();
  const onToggleDebugUI = vi.fn<(show: boolean) => void>();
  const onTogglePerfOverlay = vi.fn<(show: boolean) => void>();
  const onToggleRobotList = vi.fn<(show: boolean) => void>();
  const onToggleReducedMotion = vi.fn<(enabled: boolean) => void>();
  const onToggleColorBlindPalette = vi.fn<(enabled: boolean) => void>();

  render(
    <SettingsModal
      isOpen
      onClose={onClose}
      showDebugUI={false}
      onToggleDebugUI={onToggleDebugUI}
      showPerfOverlay={false}
      onTogglePerfOverlay={onTogglePerfOverlay}
      showRobotList={false}
      onToggleRobotList={onToggleRobotList}
      reducedMotion={false}
      onToggleReducedMotion={onToggleReducedMotion}
      colorBlindPalette={false}
      onToggleColorBlindPalette={onToggleColorBlindPalette}
    />,
  );

  return {
    onTogglePerfOverlay,
    onToggleReducedMotion,
    onToggleColorBlindPalette,
  };
}

describe("SettingsModal", () => {
  it("shows the perf overlay toggle and calls handler when changed", () => {
    const { onTogglePerfOverlay } = renderSettings();

    const perfCheckbox = screen.getByLabelText(
      "Show Performance Overlay",
    ) as HTMLInputElement;
    expect(perfCheckbox).toBeInTheDocument();
    expect(perfCheckbox.checked).toBe(false);

    fireEvent.click(perfCheckbox);
    expect(onTogglePerfOverlay).toHaveBeenCalledWith(true);
  });

  it("exposes the reduced-motion and colour-blind toggles (#166)", () => {
    const { onToggleReducedMotion, onToggleColorBlindPalette } =
      renderSettings();

    const reducedMotion = screen.getByLabelText(
      /Reduce motion/,
    ) as HTMLInputElement;
    expect(reducedMotion.checked).toBe(false);
    fireEvent.click(reducedMotion);
    expect(onToggleReducedMotion).toHaveBeenCalledWith(true);

    const colorBlind = screen.getByLabelText(
      "Colour-blind safe team colours",
    ) as HTMLInputElement;
    expect(colorBlind.checked).toBe(false);
    fireEvent.click(colorBlind);
    expect(onToggleColorBlindPalette).toHaveBeenCalledWith(true);
  });

  it("documents the per-team shapes and keyboard camera controls", () => {
    renderSettings();

    expect(screen.getByText(/Teams also differ by shape/)).toBeInTheDocument();
    expect(screen.getByText(/arrow keys orbit/)).toBeInTheDocument();
  });
});
