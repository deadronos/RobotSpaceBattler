import React from 'react';

import { useUI } from '../../store/uiStore';

export default function StatusBox() {
  const paused = useUI((s) => s.paused);
  const speed = useUI((s) => s.speed);
  return (
    <div id="status" className="ui status">
      {paused ? 'Paused' : 'Running'} @ {speed.toFixed(1)}x
    </div>
  );
}
