import { Suspense, useMemo } from 'react';

import { Simulation } from './components/Simulation';
import { createBattleWorld } from './ecs/world';

const STATUS_TEXT = 'Initializing space match...';

function useBattleWorld() {
  return useMemo(() => createBattleWorld(), []);
}

export default function App() {
  const battleWorld = useBattleWorld();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="status" className="match-status" role="status">
        {STATUS_TEXT}
      </div>
      <Suspense fallback={<div className="match-status">Loading arena...</div>}>
        <Simulation battleWorld={battleWorld} />
      </Suspense>
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
        }}
      >
        <button type="button">Pause</button>
        <button type="button">Reset</button>
      </div>
    </div>
  );
}
