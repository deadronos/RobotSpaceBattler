import { vec3 } from "../../lib/math/vec3";
import type { EffectEntity } from "../worldTypes";
import { GenericPool, GenericPoolStats, createGenericPool } from "./poolUtils";

export type EffectPoolStats = GenericPoolStats;
export type EffectPool = GenericPool<EffectEntity>;

function createEmptyEffect(): EffectEntity {
  return {
    id: "",
    kind: "effect",
    effectType: "impact",
    position: vec3(),
    radius: 0,
    color: "#ffffff",
    createdAt: 0,
    duration: 0,
  };
}

function resetEffect(effect: EffectEntity): void {
  effect.instanceIndex = undefined;
  effect.id = "";
  effect.secondaryColor = undefined;
  effect.effectType = "impact";
  effect.position = vec3();
  effect.radius = 0;
  effect.color = "#ffffff";
  effect.createdAt = 0;
  effect.duration = 0;
}

export function createEffectPool(initialSize = 64): EffectPool {
  return createGenericPool<EffectEntity>(
    initialSize,
    createEmptyEffect,
    resetEffect,
  );
}
