import React from 'react';

import { useUiStore } from '../../store/uiStore';

export function SettingsDrawer() {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const closeSettings = useUiStore((s) => s.closeSettings);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  if (!settingsOpen) return null;

  const handleClose = () => closeSettings();
  const handleApply = () => {
    // TODO: persist settings to store / ECS bridge (persisted via uiStore for now)
    setSettingsOpen(false);
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Settings Drawer"
      className="settings-drawer"
    >
      <header className="settings-drawer__header">
        <h2>Settings</h2>
        <button type="button" onClick={handleClose} aria-label="Close settings">
          Close
        </button>
      </header>

      <div className="settings-drawer__content">
        <section>
          <h3>Team Composition</h3>
          <p>Adjust weapon sliders and toggles for next match (placeholder UI).</p>
          <label>
            Weapon power
            <input type="range" min={0} max={100} defaultValue={50} />
          </label>
        </section>

        <section>
          <h3>Accessibility</h3>
          <label>
            Reduced Motion
            <input type="checkbox" />
          </label>
        </section>
      </div>

      <footer className="settings-drawer__footer">
        <button type="button" onClick={handleApply}>Apply</button>
        <button type="button" onClick={handleClose}>Cancel</button>
      </footer>
    </aside>
  );
}

export default SettingsDrawer;
