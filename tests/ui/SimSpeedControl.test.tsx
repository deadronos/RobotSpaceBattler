import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SimSpeedControl } from "@/components/ui/SimSpeedControl";
import { SIM_SPEED_OPTIONS } from "@/lib/simSpeed";

describe("SimSpeedControl (#170)", () => {
  it("renders every supported speed in a labelled group", () => {
    render(<SimSpeedControl value={1} onChange={() => {}} />);

    const group = screen.getByRole("group", { name: "Simulation speed" });
    expect(group).toBeTruthy();
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "0.5×",
      "1×",
      "2×",
      "4×",
    ]);
    expect(buttons).toHaveLength(SIM_SPEED_OPTIONS.length);
  });

  it("marks the active speed as pressed", () => {
    render(<SimSpeedControl value={2} onChange={() => {}} />);

    expect(
      screen.getByRole("button", { name: "2×" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "1×" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("reports the chosen speed", () => {
    const onChange = vi.fn<(speed: number) => void>();
    render(<SimSpeedControl value={1} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "4×" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
