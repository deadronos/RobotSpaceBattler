import { useCallback, useMemo, useRef, useState } from "react";

import type { Robot } from "../ecs/entities/Robot";
import type { Vector3 } from "../types";

export interface UseCinematicModeOptions {
  robots: Robot[];
  initiallyActive?: boolean;
  followStrength?: number;
  maxFocusRobots?: number;
  fallbackTarget?: Vector3;
}

export interface CinematicModeResult {
  focus: Vector3;
  isActive: boolean;
  setActive: (active: boolean) => void;
  toggle: () => void;
  handleKeyDown: (event: Pick<KeyboardEvent, "code">) => void;
  update: (deltaTime: number) => void;
}

const DEFAULT_TARGET: Vector3 = { x: 0, y: 0, z: 0 };
const DEFAULT_STRENGTH = 0.12;
const MAX_DELTA = 0.25;

function lerp(current: number, target: number, alpha: number) {
  return current + (target - current) * alpha;
}

function averageVectors(vectors: Vector3[]): Vector3 {
  if (vectors.length === 0) {
    return { ...DEFAULT_TARGET };
  }

  const sum = vectors.reduce(
    (acc, value) => ({
      x: acc.x + value.x,
      y: acc.y + value.y,
      z: acc.z + value.z,
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: sum.x / vectors.length,
    y: sum.y / vectors.length,
    z: sum.z / vectors.length,
  };
}

function calculateIntensity(robot: Robot): number {
  if (robot.health <= 0) {
    return -Infinity;
  }

  const healthPressure = 1 - robot.health / Math.max(robot.maxHealth, 1);
  const damageMomentum = robot.stats.damageDealt / 200;
  const incomingDamage = robot.stats.damageTaken / 300;
  const killWeight = robot.stats.kills * 0.2;

  return (
    healthPressure * 0.5 +
    damageMomentum * 0.3 +
    incomingDamage * 0.15 +
    killWeight
  );
}

export function useCinematicMode({
  robots,
  initiallyActive = false,
  followStrength = DEFAULT_STRENGTH,
  maxFocusRobots = 3,
  fallbackTarget = DEFAULT_TARGET,
}: UseCinematicModeOptions): CinematicModeResult {
  const [isActive, setIsActive] = useState(initiallyActive);
  const [focus, setFocus] = useState<Vector3>({ ...fallbackTarget });
  const focusRef = useRef<Vector3>({ ...fallbackTarget });

  const sortedRobots = useMemo(() => {
    const scored = robots.map((robot) => ({
      robot,
      intensity: calculateIntensity(robot),
    }));
    const positive = scored.filter((entry) => entry.intensity > 0);
    const pool = positive.length > 0 ? positive : scored;

    const sorted = pool.sort((a, b) => b.intensity - a.intensity);
    if (sorted.length === 0) {
      return [];
    }

    const focusCutoff = Math.max(sorted[0].intensity * 0.5, 0);
    const focused = sorted.filter(
      (entry, index) => index === 0 || entry.intensity >= focusCutoff,
    );

    return focused
      .slice(0, Math.max(1, maxFocusRobots))
      .map((entry) => entry.robot);
  }, [robots, maxFocusRobots]);

  const hotspot = useMemo(() => {
    const active = sortedRobots.filter((robot) => robot.health > 0);
    if (active.length === 0) {
      return { ...fallbackTarget };
    }

    return averageVectors(active.map((robot) => robot.position));
  }, [sortedRobots, fallbackTarget]);

  const setActive = useCallback((active: boolean) => {
    setIsActive(active);
  }, []);

  const toggle = useCallback(() => {
    setIsActive((value) => !value);
  }, []);

  const handleKeyDown = useCallback(
    (event: Pick<KeyboardEvent, "code">) => {
      if (event.code === "KeyC") {
        toggle();
      }
    },
    [toggle],
  );

  const update = useCallback(
    (deltaTime: number) => {
      if (!isActive) {
        return;
      }

      const clampedDelta = Math.min(Math.max(deltaTime, 0), MAX_DELTA);
      const normalizedAlpha =
        1 - Math.pow(1 - followStrength, clampedDelta * 60);

      focusRef.current = {
        x: lerp(focusRef.current.x, hotspot.x, normalizedAlpha),
        y: lerp(focusRef.current.y, hotspot.y, normalizedAlpha),
        z: lerp(focusRef.current.z, hotspot.z, normalizedAlpha),
      };
      setFocus({ ...focusRef.current });
    },
    [followStrength, hotspot, isActive],
  );

  return {
    focus,
    isActive,
    setActive,
    toggle,
    handleKeyDown,
    update,
  };
}
