
export type WeaponType = 'gun' | 'laser' | 'rocket';

export interface WeaponComponent {
  id: string;
  type: WeaponType;
  ownerId: number;
  team: 'red' | 'blue';
  range: number;
  cooldown: number; // seconds
  lastFiredAt?: number;
  power: number; // base damage
  accuracy?: number; // 0..1
  spread?: number; // radians
  ammo?: { clip: number; clipSize: number; reserve: number };
  energyCost?: number;
  projectilePrefab?: string;
  aoeRadius?: number;
  beamParams?: { duration?: number; width?: number; tickInterval?: number };
  flags?: { continuous?: boolean; chargeable?: boolean; burst?: boolean; homing?: boolean };
}

export interface WeaponStateComponent {
  firing?: boolean;
  reloading?: boolean;
  chargeStart?: number;
  cooldownRemaining?: number;
}

export interface ProjectileComponent {
  sourceWeaponId: string;
  ownerId: number;
  damage: number;
  team: 'red' | 'blue';
  aoeRadius?: number;
  lifespan: number;
  spawnTime: number;
  speed?: number;
  homing?: { turnSpeed: number; targetId?: number };
}

export interface BeamComponent {
  sourceWeaponId: string;
  ownerId: number;
  firedAt: number;
  origin: [number, number, number];
  direction: [number, number, number];
  length: number;
  width: number;
  activeUntil: number;
  tickDamage: number;
  tickInterval: number;
  lastTickAt: number;
}

export interface DamageEvent {
  sourceId: number;
  weaponId?: string;
  targetId?: number;
  position?: [number, number, number];
  damage: number;
}
