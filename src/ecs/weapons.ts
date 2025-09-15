import type { Entity } from './miniplexStore';

export type WeaponType = 'hitscan' | 'projectile' | 'beam';

export interface DamageProfile {
  base: number;
  falloff?: { start: number; end: number };
  armorPiercing?: number;
}

export interface WeaponComponent {
  id: string;
  type: WeaponType;
  damage: DamageProfile;
  cooldownMs: number;
  spread?: number;
  range?: number;
  projectilePrefab?: string;
  owner?: Entity;
  team?: string;
}

export interface CooldownComponent {
  remainingMs: number;
}

export interface AmmoComponent {
  clip: number;
  reserve: number;
  perShot: number;
}

export interface ProjectileComponent {
  owner?: Entity;
  damage: DamageProfile;
  lifetimeMs: number;
  speed: number;
  aoeRadius?: number;
}

export interface BeamComponent {
  owner?: Entity;
  durationMs: number;
  damagePerSecond: number;
}

export interface WeaponStateComponent {
  isFiring?: boolean;
  isReloading?: boolean;
  isCharging?: boolean;
}
