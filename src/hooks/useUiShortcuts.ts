import { useCallback, useEffect } from "react";

import { useUiStore } from "../store/uiStore";

export function useUiShortcuts() {
  const openSettings = useUiStore((s) => s.openSettings);
  const openStats = useUiStore((s) => s.openStats);
  const closeSettings = useUiStore((s) => s.closeSettings);
  const closeStats = useUiStore((s) => s.closeStats);
  const toggleHud = useUiStore((s) => s.toggleHud);
  const togglePause = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new CustomEvent("battle:togglePause"));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.repeat) return;

      switch (e.key) {
        case " ":
          // Space toggles pause — delegate to simulation in future via custom event
          togglePause();
          e.preventDefault();
          break;
        case "c":
        case "C":
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("battle:toggleCinematic"));
          }
          break;
        case "o":
        case "O":
          toggleHud();
          break;
        case "Escape":
          openSettings();
          closeStats();
          break;
        case "s":
        case "S":
          openStats();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    closeSettings,
    closeStats,
    openSettings,
    openStats,
    toggleHud,
    togglePause,
  ]);
}

export default useUiShortcuts;
