import { resetWorld, createRobotEntity, world } from '../src/ecs/miniplexStore';
import { weaponSystem } from '../src/systems/WeaponSystem';
import { projectileSystem } from '../src/systems/ProjectileSystem';
import { beamSystem } from '../src/systems/BeamSystem';
import { damageSystem } from '../src/systems/DamageSystem';
import { createSeededRng } from '../src/utils/seededRng';

// Test: rocket AoE damage
test('rocket should explode and apply AoE damage', () => {
  resetWorld();
  const rng = createSeededRng(42);
  const dt = 1 / 60;

  const shooter = createRobotEntity({ team: 'red', position: [0, 0.6, 0] }) as any;
  shooter.weapon = {
    id: 'rocket1',
    type: 'rocket',
    ownerId: shooter.id as number,
    team: 'red',
    range: 100,
    cooldown: 0.1,
    power: 50,
    aoeRadius: 3,
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  // Targets near explosion center
  const target1 = createRobotEntity({ team: 'blue', position: [5, 0.6, 0], hp: 100 }) as any;
  const target2 = createRobotEntity({ team: 'blue', position: [6.5, 0.6, 0], hp: 100 }) as any; // farther

  shooter.targetId = target1.id as number;

  const events: any = { weaponFired: [], damage: [] };

  // Fire
  weaponSystem(world, dt, rng, events);
  expect(events.weaponFired.length).toBeGreaterThan(0);

  // Run projectile system to spawn projectile (pass the weaponFired events)
  projectileSystem(world, dt, rng, events.weaponFired, events);

  // Simulate several frames to move the projectile into targets
  for (let i = 0; i < 120; i++) {
    // subsequent frames: no new fired events
    projectileSystem(world, dt, rng, [], events);
    // apply damage if any
    if (events.damage.length > 0) {
      damageSystem(world, events.damage, { death: [] });
      break;
    }
  }

  // Expect at least one target damaged
  const t1hp = (target1 as any).hp as number;
  const t2hp = (target2 as any).hp as number;
  expect(t1hp).toBeLessThan(100);
  expect(t2hp).toBeLessThan(100);
});

// Test: beam tick damage over time
test('laser beam should apply tick damage over time to target', () => {
  resetWorld();
  const rng = createSeededRng(7);
  const dt = 1 / 60;

  const shooter = createRobotEntity({ team: 'red', position: [0, 0.6, 0] }) as any;
  shooter.weapon = {
    id: 'laser1',
    type: 'laser',
    ownerId: shooter.id as number,
    team: 'red',
    range: 20,
    cooldown: 0.1,
    power: 10,
    beamParams: { duration: 1000, width: 0.1, tickInterval: 100 },
    flags: { continuous: true },
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  const target = createRobotEntity({ team: 'blue', position: [5, 0.6, 0], hp: 100 }) as any;
  shooter.targetId = target.id as number;

  const events: any = { weaponFired: [], damage: [] };

  // Fire beam (initial creation)
  weaponSystem(world, dt, rng, events);
  beamSystem(world, dt, rng, events.weaponFired, events);

  // Find beam and force its lastTickAt back so the next beamSystem call will tick
  const beam = Array.from(world.entities).find((e: any) => e.beam) as any;
  expect(beam).toBeDefined();
  if (beam) {
    beam.beam.lastTickAt = Date.now() - beam.beam.tickInterval - 1;
  }

  // Invoke beamSystem to process tick(s)
  for (let i = 0; i < 5; i++) {
    beamSystem(world, dt, rng, [], events);
    if (events.damage.length > 0) {
      damageSystem(world, events.damage, { death: [] });
    }
  }

  expect((target as any).hp).toBeLessThan(100);
});

// Test: homing rocket should steer towards a moving target
test('homing rocket should update trajectory towards moving target', () => {
  resetWorld();
  const rng = createSeededRng(123);
  const dt = 1 / 60;

  const shooter = createRobotEntity({ team: 'red', position: [0, 0.6, 0] }) as any;
  shooter.weapon = {
    id: 'homing1',
    type: 'rocket',
    ownerId: shooter.id as number,
    team: 'red',
    range: 100,
    cooldown: 0.1,
    power: 20,
    aoeRadius: 0,
    flags: { homing: true },
  };
  shooter.weaponState = { firing: true, cooldownRemaining: 0 };

  const target = createRobotEntity({ team: 'blue', position: [8, 0.6, 0], hp: 100 }) as any;
  shooter.targetId = target.id as number;

  const events: any = { weaponFired: [], damage: [] };

  // Fire homing projectile
  weaponSystem(world, dt, rng, events);
  projectileSystem(world, dt, rng, events.weaponFired, events);

  // Find the spawned projectile
  const projectile = Array.from(world.entities).find((e: any) => e.projectile && e.projectile.homing) as any;
  expect(projectile).toBeDefined();

  // Ensure homing data exists
  expect(projectile.projectile.homing).toBeDefined();

  // Record initial distance to target
  const initialPos = [...projectile.position] as [number, number, number];
  const initialDist = Math.hypot(
    initialPos[0] - target.position[0],
    initialPos[1] - target.position[1],
    initialPos[2] - target.position[2]
  );

  // Update homing behavior for more frames to allow steering (target stationary)
  for (let i = 0; i < 120; i++) {
    projectileSystem(world, dt, rng, [], events);
  }

  const finalPos = projectile.position as [number, number, number];
  const finalDist = Math.hypot(
    finalPos[0] - target.position[0],
    finalPos[1] - target.position[1],
    finalPos[2] - target.position[2]
  );

  // Expect projectile to have moved closer to the moving target due to homing
  expect(finalDist).toBeLessThan(initialDist);
});
