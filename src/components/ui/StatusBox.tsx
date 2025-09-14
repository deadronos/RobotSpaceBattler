import React from "react";

import useUI from "../../store/uiStore";

export default function StatusBox() {
  const redAlive = useUI((s) => s.redAlive);
  const blueAlive = useUI((s) => s.blueAlive);
  const redKills = useUI((s) => s.redKills);
  const blueKills = useUI((s) => s.blueKills);

  return (
    <div id="status" className="status-box">
      <div>
        Space Station — {redAlive} vs {blueAlive}
      </div>
      <div>
        Kills: Red {redKills} • Blue {blueKills}
      </div>
    </div>
  );
}
