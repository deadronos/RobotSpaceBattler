import React from "react";

import useUI from "../../store/uiStore";

export default function StatusBox() {
  const redAlive = useUI((s) => s.redAlive);
  const blueAlive = useUI((s) => s.blueAlive);
  const redKills = useUI((s) => s.redKills);
  const blueKills = useUI((s) => s.blueKills);
  const physicsAvailable = useUI((s) => s.physicsAvailable);
  const rapierDebug = useUI((s) => s.rapierDebug);
  const devVisible = useUI((s) => s.devDiagnosticsVisible);
  const setDevVisible = useUI((s) => s.setDevDiagnosticsVisible);

  return (
    <div id="status" className="status-box">
      {!physicsAvailable ? (
        <div className="status-warning">Physics unavailable — running fallback mode.{rapierDebug ? ` (${rapierDebug})` : ''}</div>
      ) : null}
      <div>
        Space Station — {redAlive} vs {blueAlive}
      </div>
      <div className="status-controls">
        <button className="pause-button" onClick={() => setDevVisible(!devVisible)}>{devVisible ? 'Hide' : 'Show'} diagnostics</button>
      </div>
      <div>
        Kills: Red {redKills} • Blue {blueKills}
      </div>
    </div>
  );
}
