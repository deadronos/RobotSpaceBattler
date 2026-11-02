import { useEffect } from "react";

interface UseAppShortcutsOptions {
  /** Shortcuts stay dormant while a dialog is open. */
  enabled: boolean;
  onPauseResume: () => void;
  onReset: () => void;
}

/**
 * App-level keyboard shortcuts: Space pauses/resumes and R resets (#170 moved
 * this out of `App`). Key repeat is ignored for toggles, and events that come
 * from a text field are skipped.
 */
export function useAppShortcuts({
  enabled,
  onPauseResume,
  onReset,
}: UseAppShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        onPauseResume();
      } else if (event.key === "r" || event.key === "R") {
        onReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onPauseResume, onReset]);
}
