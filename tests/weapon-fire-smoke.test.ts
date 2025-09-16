import { resetWorld, createRobotEntity, world } from '../src/ecs/miniplexStore';
import { weaponSystem } from '../src/systems/WeaponSystem';
import { hitscanSystem } from '../src/systems/HitscanSystem';
import { damageSystem } from '../src/systems/DamageSystem';
import { createSeededRng } from '../src/utils/seededRng';

// Smoke test: a gun fires at a target and deals damage
test('gun weapon should hit target and apply damage', () => {
  resetWorld();

  const rng = createSeededRng(999);
  const dt = 1 / 60;

  // Create shooter
  const shooter = createRobotEntity({
    team: 'red',
    position: [0, 0.6, 0],
  }) as any;

  shooter.weapon = {
    id: 'w1',
    type: 'gun',
    ownerId: shooter.id as number,
    team: 'red',
    range: 100,
    cooldown: 0.1,
    power: 20,
    accuracy: 1,
    spread: 0,
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  // Create target
  const target = createRobotEntity({
    team: 'blue',
    position: [5, 0.6, 0],
    hp: 100,
  }) as any;

  // Point shooter at target
  shooter.targetId = target.id as number;

  // Prepare event containers
  const events: any = { weaponFired: [], damage: [], impact: [], death: [] };

  // 1. Weapon system emits weaponFired
  weaponSystem(world, dt, rng, events);

  // 2. Hitscan system resolves the shot
  hitscanSystem(world, rng, events.weaponFired, events);

  // 3. Damage system applies damage
  damageSystem(world, events.damage, events);

  // Expect target hp reduced
  const remaining = (target as any).hp as number;
  expect(remaining).toBeLessThan(100);
  expect(remaining).toBe(80); // 100 - power (20)
});
