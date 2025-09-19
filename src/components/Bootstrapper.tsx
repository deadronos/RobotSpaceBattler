import { useEffect } from 'react';

import { resetWorld } from '../ecs/miniplexStore';
import { resetAndSpawnDefaultTeams } from '../robots/spawnControls';
import { clearRespawnQueue } from '../systems/RespawnSystem';
import { resetScores } from '../systems/ScoringSystem';

export default function Bootstrapper() {
  useEffect(() => {
    // Ensure a clean world and spawn defaults on initial app mount.
    resetScores();
    clearRespawnQueue();
    resetAndSpawnDefaultTeams();

    return () => {
      // Clean up if the whole app remounts (e.g., during HMR)
      clearRespawnQueue();
      resetScores();
      resetWorld();
    };
  }, []);

  return null;
}
