import React from "react";

import { TEAM_MARKERS } from "../../lib/teamPalette";
import { TEAM_IDENTITIES } from "../../lib/teamConfig";
import { Modal } from "./Modal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showDebugUI: boolean;
  onToggleDebugUI: (show: boolean) => void;
  showPerfOverlay: boolean;
  onTogglePerfOverlay: (show: boolean) => void;
  showRobotList: boolean;
  onToggleRobotList: (show: boolean) => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (enabled: boolean) => void;
  colorBlindPalette: boolean;
  onToggleColorBlindPalette: (enabled: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  showDebugUI,
  onToggleDebugUI,
  showPerfOverlay,
  onTogglePerfOverlay,
  showRobotList,
  onToggleRobotList,
  reducedMotion,
  onToggleReducedMotion,
  colorBlindPalette,
  onToggleColorBlindPalette,
}: SettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      contentClassName="settings-modal-content"
    >
      <div className="settings-row">
        <label htmlFor="debug-toggle">Show Debug UI</label>
        <input
          id="debug-toggle"
          type="checkbox"
          checked={showDebugUI}
          onChange={(e) => onToggleDebugUI(e.target.checked)}
        />
      </div>

      <div className="settings-row">
        <label htmlFor="perf-toggle">Show Performance Overlay</label>
        <input
          id="perf-toggle"
          type="checkbox"
          checked={showPerfOverlay}
          onChange={(e) => onTogglePerfOverlay(e.target.checked)}
        />
      </div>

      <div className="settings-row">
        <label htmlFor="robot-list-toggle">Show Robot List</label>
        <input
          id="robot-list-toggle"
          type="checkbox"
          checked={showRobotList}
          onChange={(e) => onToggleRobotList(e.target.checked)}
        />
      </div>

      <h3 className="settings-heading">Accessibility</h3>

      <div className="settings-row">
        <label htmlFor="reduced-motion-toggle">
          Reduce motion (fewer effects, no camera inertia)
        </label>
        <input
          id="reduced-motion-toggle"
          type="checkbox"
          checked={reducedMotion}
          onChange={(e) => onToggleReducedMotion(e.target.checked)}
        />
      </div>

      <div className="settings-row">
        <label htmlFor="color-blind-toggle">
          Colour-blind safe team colours
        </label>
        <input
          id="color-blind-toggle"
          type="checkbox"
          checked={colorBlindPalette}
          onChange={(e) => onToggleColorBlindPalette(e.target.checked)}
        />
      </div>

      <p className="settings-hint">
        Teams also differ by shape, so colour is never the only cue:{" "}
        <span aria-hidden="true">{TEAM_MARKERS.red.glyph}</span>{" "}
        {TEAM_IDENTITIES.red.label} and{" "}
        <span aria-hidden="true">{TEAM_MARKERS.blue.glyph}</span>{" "}
        {TEAM_IDENTITIES.blue.label}.
      </p>
      <p className="settings-hint">
        Camera: arrow keys orbit, + / − zoom, 0 resets. Space pauses, R resets
        the match.
      </p>
    </Modal>
  );
}
