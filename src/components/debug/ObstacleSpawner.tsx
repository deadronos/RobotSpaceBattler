import "./obstacleSpawner/obstacleSpawner.css";

import { useState } from "react";

import type { BattleWorld, ObstacleEntity } from "../../ecs/world";
import {
  syncObstaclesToRapier,
  updateRapierObstacleTransforms,
} from "../../simulation/obstacles/rapierIntegration";
import { buildObstacle } from "./obstacleSpawner/buildObstacle";
import { ObstacleList } from "./obstacleSpawner/ObstacleList";
import { ObstacleSpawnerForm } from "./obstacleSpawner/ObstacleSpawnerForm";
import { type FormState,initialForm } from "./obstacleSpawner/types";
interface ObstacleSpawnerProps {
  world: BattleWorld;
  onSpawn?: (obstacle: ObstacleEntity) => void;
}

export function ObstacleSpawner({ world, onSpawn }: ObstacleSpawnerProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [, forceRefresh] = useState(0);

  const obstacles = world.obstacles.entities;

  const updateForm = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const refresh = () => forceRefresh((v) => v + 1);

  const handleSpawn = () => {
    const obstacle = buildObstacle(form, new Set(obstacles.map((o) => o.id)));
    world.world.add(obstacle);
    syncObstaclesToRapier(world);
    onSpawn?.(obstacle);

    updateForm({
      id: `debug-obstacle-${form.counter + 1}`,
      counter: form.counter + 1,
    });
  };

  const toggleActive = (id: string) => {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return;
    obs.active = obs.active === false ? true : false;
    updateRapierObstacleTransforms(world);
    refresh();
  };

  const nudge = (id: string, dx: number, dz: number) => {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs || !obs.position) return;
    obs.position.x += dx;
    obs.position.z += dz;
    updateRapierObstacleTransforms(world);
    refresh();
  };

  const removeObstacle = (id: string) => {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return;
    world.world.remove(obs);
    refresh();
  };

  return (
    <div className="obs-spawner-panel">
      <ObstacleSpawnerForm form={form} updateForm={updateForm} onSpawn={handleSpawn} />
      <ObstacleList
        obstacles={obstacles}
        toggleActive={toggleActive}
        nudge={nudge}
        removeObstacle={removeObstacle}
      />
    </div>
  );
}
