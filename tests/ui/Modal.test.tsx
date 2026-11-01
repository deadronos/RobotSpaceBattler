import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/Modal";

function renderModal(onClose: () => void, extra: React.ReactNode = null) {
  return (
    <Modal isOpen onClose={onClose} title="Test">
      <input aria-label="first input" />
      <input aria-label="second input" />
      {extra}
    </Modal>
  );
}

describe("Modal focus management", () => {
  it("keeps focus where the user put it when the parent re-renders with a new onClose", () => {
    const { rerender } = render(renderModal(() => undefined));
    const second = screen.getByLabelText("second input");
    second.focus();

    // App passes inline callbacks and re-renders every simulation tick.
    rerender(renderModal(() => undefined));
    rerender(renderModal(() => undefined));

    expect(document.activeElement).toBe(second);
  });

  it("calls the latest onClose on Escape", () => {
    const stale = vi.fn<() => void>();
    const latest = vi.fn<() => void>();
    const { rerender } = render(renderModal(stale));
    rerender(renderModal(latest));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(latest).toHaveBeenCalledTimes(1);
    expect(stale).not.toHaveBeenCalled();
  });

  it("pulls focus back into the dialog when Tab is pressed from outside", () => {
    render(
      <>
        <button>outside</button>
        {renderModal(() => undefined)}
      </>,
    );
    screen.getByText("outside").focus();

    fireEvent.keyDown(window, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByLabelText("Close Test"));
  });

  it("wraps from the last enabled element, skipping disabled ones", () => {
    render(renderModal(() => undefined, <button disabled>disabled</button>));
    screen.getByLabelText("second input").focus();

    fireEvent.keyDown(window, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByLabelText("Close Test"));
  });

  it("restores focus to the opener when closed", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = render(renderModal(() => undefined));
    expect(document.activeElement).not.toBe(opener);

    rerender(
      <Modal isOpen={false} onClose={() => undefined} title="Test">
        {null}
      </Modal>,
    );

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
