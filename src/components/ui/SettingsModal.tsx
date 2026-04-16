import React from "react";

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

      {/* Extensible area for more settings */}
    </Modal>
  );
}
