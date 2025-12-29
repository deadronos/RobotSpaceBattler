import React, { useEffect } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showDebugUI: boolean;
  onToggleDebugUI: (show: boolean) => void;
  showPerfOverlay: boolean;
  onTogglePerfOverlay: (show: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  showDebugUI,
  onToggleDebugUI,
  showPerfOverlay,
  onTogglePerfOverlay,
}: SettingsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="settings-modal-backdrop" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="settings-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="settings-modal-header">
          <h2 id="settings-modal-title">Settings</h2>
          <button
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            &times;
          </button>
        </div>

        <div className="settings-modal-body">
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

          {/* Extensible area for more settings */}
        </div>
      </div>
    </div>
  );
}
