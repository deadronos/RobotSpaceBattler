import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GunTracerVisualEvent,
  LaserBeamVisualEvent,
  RocketExplosionVisualEvent,
  WeaponVisualEventEmitter,
} from "./events";
import { VisualPool } from "./pools";
import { QualityManager, QualitySettings } from "./QualityManager";
import { GunTracerWithImpact } from "./weapons/GunTracer";
import { LaserBeam } from "./weapons/LaserBeam";
import { RocketExplosion } from "./weapons/RocketExplosion";

const LASER_DEFAULT_DURATION = 250;
const EXPLOSION_DEFAULT_DURATION = 320;
const TRACER_DEFAULT_DURATION = 160;

interface LaserVisualEntry extends LaserBeamVisualEvent {
  color: string;
  lineWidth: number;
  durationMs: number;
}

interface ExplosionVisualEntry extends RocketExplosionVisualEvent {
  durationMs: number;
}

interface TracerVisualEntry extends GunTracerVisualEvent {
  color: string;
  lineWidth: number;
  durationMs: number;
}

function createLaserEntry(): LaserVisualEntry {
  return {
    type: "laser-beam",
    id: "",
    startPosition: [0, 0, 0],
    endPosition: [0, 0, 0],
    color: "#00ff88",
    durationMs: LASER_DEFAULT_DURATION,
    lineWidth: 0.2,
  };
}

function createExplosionEntry(): ExplosionVisualEntry {
  return {
    type: "rocket-explosion",
    id: "",
    position: [0, 0, 0],
    radius: 0,
    durationMs: EXPLOSION_DEFAULT_DURATION,
    color: undefined,
  };
}

function createTracerEntry(): TracerVisualEntry {
  return {
    type: "gun-tracer",
    id: "",
    startPosition: [0, 0, 0],
    impactPosition: [0, 0, 0],
    color: "#ffaa00",
    lineWidth: 0.1,
    durationMs: TRACER_DEFAULT_DURATION,
  };
}

function useQualitySettings(manager: QualityManager): QualitySettings {
  const [settings, setSettings] = useState(manager.getSettings());

  useEffect(() => manager.onChange(setSettings), [manager]);

  return settings;
}

interface WeaponRendererProps {
  eventEmitter: WeaponVisualEventEmitter;
  qualityManager: QualityManager;
}

export function WeaponRenderer({
  eventEmitter,
  qualityManager,
}: WeaponRendererProps) {
  const quality = useQualitySettings(qualityManager);
  const {
    showBeams,
    showExplosions,
    showTracers,
    beamLineWidth,
    tracerLineWidth,
  } = quality;

  const laserPool = useMemo(() => new VisualPool(createLaserEntry, { maxSize: 8 }), []);
  const explosionPool = useMemo(() => new VisualPool(createExplosionEntry, { maxSize: 6 }), []);
  const tracerPool = useMemo(() => new VisualPool(createTracerEntry, { maxSize: 12 }), []);

  const [laserBeams, setLaserBeams] = useState<LaserVisualEntry[]>([]);
  const [explosions, setExplosions] = useState<ExplosionVisualEntry[]>([]);
  const [tracers, setTracers] = useState<TracerVisualEntry[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const scheduleRemoval = (
    id: string,
    delay: number,
    remover: (removeId: string) => void,
  ) => {
    const timer = setTimeout(() => remover(id), Math.max(0, delay));
    timers.current.push(timer);
  };

  const removeLaser = useCallback(
    (id: string) => {
      setLaserBeams((previous) => {
        const next: LaserVisualEntry[] = [];
        previous.forEach((beam) => {
          if (beam.id === id) {
            laserPool.release(beam);
          } else {
            next.push(beam);
          }
        });
        return next;
      });
    },
    [laserPool],
  );

  const removeExplosion = useCallback(
    (id: string) => {
      setExplosions((previous) => {
        const next: ExplosionVisualEntry[] = [];
        previous.forEach((explosion) => {
          if (explosion.id === id) {
            explosionPool.release(explosion);
          } else {
            next.push(explosion);
          }
        });
        return next;
      });
    },
    [explosionPool],
  );

  const removeTracer = useCallback(
    (id: string) => {
      setTracers((previous) => {
        const next: TracerVisualEntry[] = [];
        previous.forEach((tracer) => {
          if (tracer.id === id) {
            tracerPool.release(tracer);
          } else {
            next.push(tracer);
          }
        });
        return next;
      });
    },
    [tracerPool],
  );

  useEffect(() => {
    const laserListener = eventEmitter.on("laser-beam", (event) => {
      if (!showBeams) {
        return;
      }

      const entry = laserPool.acquire();
      entry.id = event.id;
      entry.startPosition = event.startPosition;
      entry.endPosition = event.endPosition;
      entry.color = event.color ?? entry.color;
      entry.lineWidth = beamLineWidth;
      entry.durationMs = event.durationMs ?? LASER_DEFAULT_DURATION;

      setLaserBeams((prev) => [...prev, entry]);
      scheduleRemoval(entry.id, entry.durationMs, removeLaser);
    });

    const explosionListener = eventEmitter.on(
      "rocket-explosion",
      (event) => {
        if (!showExplosions) {
          return;
        }

        const entry = explosionPool.acquire();
        entry.id = event.id;
        entry.position = event.position;
        entry.radius = event.radius;
        entry.durationMs = event.durationMs ?? EXPLOSION_DEFAULT_DURATION;
        entry.color = event.color;

        setExplosions((prev) => [...prev, entry]);
        scheduleRemoval(entry.id, entry.durationMs, removeExplosion);
      },
    );

    const tracerListener = eventEmitter.on("gun-tracer", (event) => {
      if (!showTracers) {
        return;
      }

      const entry = tracerPool.acquire();
      entry.id = event.id;
      entry.startPosition = event.startPosition;
      entry.impactPosition = event.impactPosition;
      entry.color = event.color ?? entry.color;
      entry.lineWidth = tracerLineWidth;
      entry.durationMs = event.durationMs ?? TRACER_DEFAULT_DURATION;

      setTracers((prev) => [...prev, entry]);
      scheduleRemoval(entry.id, entry.durationMs, removeTracer);
    });

    return () => {
      laserListener();
      explosionListener();
      tracerListener();
    };
  }, [
    eventEmitter,
    showBeams,
    showExplosions,
    showTracers,
    beamLineWidth,
    tracerLineWidth,
    laserPool,
    explosionPool,
    tracerPool,
    removeLaser,
    removeExplosion,
    removeTracer,
  ]);

  useEffect(() => {
    if (!showTracers) {
      setTracers((previous) => {
        previous.forEach((tracer) => tracerPool.release(tracer));
        return [];
      });
    }
  }, [showTracers, tracerPool]);

  return (
    <group name="weapon-renderer">
      {laserBeams.map((beam) => (
        <LaserBeam
          key={beam.id}
          startPosition={beam.startPosition}
          endPosition={beam.endPosition}
          color={beam.color}
          lineWidth={beam.lineWidth}
        />
      ))}
      {explosions.map((explosion) => (
        <RocketExplosion
          key={explosion.id}
          position={explosion.position}
          radius={explosion.radius}
        />
      ))}
      {tracers.map((tracer) => (
        <GunTracerWithImpact
          key={tracer.id}
          startPosition={tracer.startPosition}
          endPosition={tracer.impactPosition}
          impactPosition={tracer.impactPosition}
          color={tracer.color}
          lineWidth={tracer.lineWidth}
        />
      ))}
    </group>
  );
}
