import { resetWorld, createRobotEntity, world } from '../src/ecs/miniplexStore';
import { weaponSystem } from '../src/systems/WeaponSystem';
import { hitscanSystem } from '../src/systems/HitscanSystem';
import { projectileSystem } from '../src/systems/ProjectileSystem';
import { beamSystem } from '../src/systems/BeamSystem';
import { damageSystem } from '../src/systems/DamageSystem';
import { createSeededRng } from '../src/utils/seededRng';

// Edge-case: friendly-fire avoidance for hitscan weapons
test('hitscan should avoid damaging friendly targets', () => {
  resetWorld();
  const rng = createSeededRng(1);
  const dt = 1 / 60;

  const shooter = createRobotEntity({ team: 'red', position: [0, 0.6, 0] }) as any;
  shooter.weapon = {
    id: 'gun_ff',
    type: 'gun',
    ownerId: shooter.id as number,
    team: 'red',
    range: 100,
    cooldown: 0.1,
    power: 30,
    accuracy: 1,
    spread: 0,
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  // Friendly in between
  const friend = createRobotEntity({ team: 'red', position: [2.5, 0.6, 0], hp: 100 }) as any;
  const enemy = createRobotEntity({ team: 'blue', position: [5, 0.6, 0], hp: 100 }) as any;

  shooter.targetId = enemy.id as number;

  const events: any = { weaponFired: [], damage: [], impact: [] };

  weaponSystem(world, dt, rng, events);
  hitscanSystem(world, rng, events.weaponFired, events);
  damageSystem(world, events.damage, { death: [] });

  // Friendly should not be damaged
  expect(friend.hp).toBe(100);
  // Enemy should be damaged
  expect(enemy.hp).toBeLessThan(100);
});

// Edge-case: projectile lifetime cleanup
test('projectile should be removed after lifespan expires', () => {
  resetWorld();
  const rng = createSeededRng(2);
  const dt = 1 / 60;

  const shooter = createRobotEntity({ team: 'red', position: [0, 0.6, 0] }) as any;
  shooter.weapon = {
    id: 'rocket_life',
    type: 'rocket',
    ownerId: shooter.id as number,
    team: 'red',
    range: 100,
    cooldown: 0.1,
    power: 10,
    aoeRadius: 0,
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  const events: any = { weaponFired: [], damage: [] };

  // Fire rocket (spawns projectile)
  weaponSystem(world, dt, rng, events);
  projectileSystem(world, dt, rng, events.weaponFired, events);

  // Find projectile
  const projectile = Array.from(world.entities).find((e: any) => e.projectile) as any;
  expect(projectile).toBeDefined();

  // Force spawnTime to far past so it's expired
  projectile.projectile.spawnTime = Date.now() - (projectile.projectile.lifespan + 1) * 1000;

  // Run projectile system which should remove expired projectile
  projectileSystem(world, dt, rng, [], events);

  const found = Array.from(world.entities).find((e: any) => e === projectile);
  expect(found).toBeUndefined();
});

// Edge-case: beam expiration and continuous damage over time
test('beam should tick damage over time and expire after duration', () => {
  resetWorld();
  const rng = createSeededRng(3);
  const dt = 1 / 60;

  const shooter = createRobotEntity({ team: 'red', position: [0, 0.6, 0] }) as any;
  shooter.weapon = {
    id: 'laser_exp',
    type: 'laser',
    ownerId: shooter.id as number,
    team: 'red',
    range: 20,
    cooldown: 0.1,
    power: 20,
    beamParams: { duration: 500, width: 0.1, tickInterval: 100 },
    flags: { continuous: true },
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  const target = createRobotEntity({ team: 'blue', position: [5, 0.6, 0], hp: 100 }) as any;

  const events: any = { weaponFired: [], damage: [] };

  // Fire the beam and create beam entity
  weaponSystem(world, dt, rng, events);
  beamSystem(world, dt, rng, events.weaponFired, events);

  const beamEntity = Array.from(world.entities).find((e: any) => e.beam) as any;
  expect(beamEntity).toBeDefined();

  // Force tick multiple times by setting lastTickAt back and calling beamSystem
  for (let i = 0; i < 3; i++) {
    if (beamEntity) beamEntity.beam.lastTickAt = Date.now() - beamEntity.beam.tickInterval - 1;
    beamSystem(world, dt, rng, [], events);
    if (events.damage.length > 0) {
      damageSystem(world, events.damage, { death: [] });
      events.damage = [];
    }
  }

  // target should have been damaged by ticks
  expect(target.hp).toBeLessThan(100);

  // Now force expiration
  if (beamEntity) beamEntity.beam.activeUntil = Date.now() - 1;
  beamSystem(world, dt, rng, [], events);

  const stillBeam = Array.from(world.entities).find((e: any) => e.beam);
  expect(stillBeam).toBeUndefined();
});

// Edge-case: AoE falloff damage applies decreasing damage by distance and excludes far targets
test('rocket AoE should damage multiple targets with falloff and exclude outside radius', () => {
  resetWorld();
  const rng = createSeededRng(4);
  const dt = 1 / 60;

  // We'll create a projectile positioned exactly at center to trigger collision and AoE
  const centerTarget = createRobotEntity({ team: 'blue', position: [5, 0.6, 0], hp: 100 }) as any;
  const nearTarget = createRobotEntity({ team: 'blue', position: [6.5, 0.6, 0], hp: 100 }) as any; // 1.5 units
  const farTarget = createRobotEntity({ team: 'blue', position: [9.5, 0.6, 0], hp: 100 }) as any; // 4.5 units

  // Create a projectile entity at the center with AoE radius 3
  const projectileEntity: any = {
    id: 'proj_manual',
    position: [5, 0.6, 0],
    team: 'red',
    projectile: {
      sourceWeaponId: 'rocket_aoe',
      ownerId: 999,
      damage: 30,
      team: 'red',
      aoeRadius: 3,
      lifespan: 5,
      spawnTime: Date.now(),
      speed: 0,
    },
    velocity: [0, 0, 0],
  };

  world.add(projectileEntity);

  const events: any = { weaponFired: [], damage: [] };

  // Run projectile system which should detect collision (centerTarget is at same pos) and apply AoE
  projectileSystem(world, dt, rng, [], events);
  // Apply damage
  if (events.damage.length > 0) {
    damageSystem(world, events.damage, { death: [] });
  }

  // centerTarget at distance 0 should take some damage
  expect(centerTarget.hp).toBeLessThan(100);
  // nearTarget within 3 units should take damage (falloff)
  expect(nearTarget.hp).toBeLessThan(100);
  // farTarget outside radius should be untouched
  expect(farTarget.hp).toBe(100);

  // Additionally, ensure nearTarget took less damage than centerTarget (falloff)
  const centerDamage = 100 - centerTarget.hp;
  const nearDamage = 100 - nearTarget.hp;
  expect(centerDamage).toBeGreaterThan(nearDamage);
});
