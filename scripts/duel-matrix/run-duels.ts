/**
 * Duel Matrix Test Harness
 * Spec: specs/005-weapon-diversity/spec.md (Test B — RPS Duel Matrix)
 * 
 * Runs controlled 1v1 duels to validate rock-paper-scissors balance.
 * Usage: ts-node scripts/duel-matrix/run-duels.ts --archetypeA=laser --archetypeB=gun --runs=30
 */

import { WeaponArchetype } from '../../src/lib/weapons/types';

interface DuelConfig {
  archetypeA: WeaponArchetype;
  archetypeB: WeaponArchetype;
  runs: number;
  seed?: number;
}

interface DuelResult {
  archetypeA: WeaponArchetype;
  archetypeB: WeaponArchetype;
  winCountA: number;
  winCountB: number;
  totalRuns: number;
  winRateA: number;
  winRateB: number;
  damageTotalA: number;
  damageTotalB: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): DuelConfig {
  const args = process.argv.slice(2);
  const config: Partial<DuelConfig> = {
    runs: 30, // Default
  };

  for (const arg of args) {
    if (arg.startsWith('--archetypeA=')) {
      config.archetypeA = arg.split('=')[1] as WeaponArchetype;
    } else if (arg.startsWith('--archetypeB=')) {
      config.archetypeB = arg.split('=')[1] as WeaponArchetype;
    } else if (arg.startsWith('--runs=')) {
      config.runs = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      config.seed = parseInt(arg.split('=')[1], 10);
    }
  }

  // Validate required args
  if (!config.archetypeA || !config.archetypeB) {
    console.error('Error: --archetypeA and --archetypeB are required');
    console.error('Usage: ts-node run-duels.ts --archetypeA=laser --archetypeB=gun --runs=30');
    process.exit(1);
  }

  // Validate archetype values
  const validArchetypes: WeaponArchetype[] = ['gun', 'laser', 'rocket'];
  if (!validArchetypes.includes(config.archetypeA)) {
    console.error(`Error: Invalid archetypeA: ${config.archetypeA}`);
    process.exit(1);
  }
  if (!validArchetypes.includes(config.archetypeB)) {
    console.error(`Error: Invalid archetypeB: ${config.archetypeB}`);
    process.exit(1);
  }

  return config as DuelConfig;
}

/**
 * Run a single duel between two archetypes
 * Task: T024 - Real 1v1 simulation with ECS
 */
async function runSingleDuel(
  archetypeA: WeaponArchetype,
  archetypeB: WeaponArchetype,
  seed: number
): Promise<{ winner: 'A' | 'B'; damageA: number; damageB: number }> {
  const { createBattleWorld, resetBattleWorld } = await import('../../src/ecs/world');
  const { createXorShift32 } = await import('../../src/lib/random/xorshift');
  const { updateAISystem } = await import('../../src/ecs/systems/aiSystem');
  const { updateCombatSystem } = await import('../../src/ecs/systems/combatSystem');
  const { updateMovementSystem } = await import('../../src/ecs/systems/movementSystem');
  const { updateProjectileSystem } = await import('../../src/ecs/systems/projectileSystem');
  const { TelemetryAggregator } = await import('../../src/telemetry/aggregator');
  const { calculateDamage } = await import('../../src/simulation/damage/damagePipeline');

  // Create battle world and telemetry
  const world = createBattleWorld();
  const telemetry = new TelemetryAggregator();
  const matchId = `duel-${archetypeA}-vs-${archetypeB}-${seed}`;
  
  telemetry.startMatch(matchId);
  resetBattleWorld(world);
  world.state.seed = seed;
  
  const rng = createXorShift32(seed);

  // Map weapon archetype to WeaponType (they use same names)
  const weaponA = archetypeA as 'laser' | 'gun' | 'rocket';
  const weaponB = archetypeB as 'laser' | 'gun' | 'rocket';

  // Spawn two robots facing each other at close range (within weapon range)
  // Place them stationary at optimal range for a pure damage test
  const robotA = world.world.add({
    id: 'robot-a',
    kind: 'robot',
    team: 'red',
    position: [-10, 0, 0],
    velocity: [0, 0, 0],
    orientation: 0,
    speed: 0, // Stationary for pure damage testing
    weapon: weaponA,
    fireCooldown: 0,
    fireRate: 1.5,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'engage',
      targetId: 'robot-b',
      strafeSign: 1,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex: 0,
    lastDamageTimestamp: 0,
  });

  const robotB = world.world.add({
    id: 'robot-b',
    kind: 'robot',
    team: 'blue',
    position: [10, 0, 0],
    velocity: [0, 0, 0],
    orientation: Math.PI,
    speed: 0, // Stationary for pure damage testing
    weapon: weaponB,
    fireCooldown: 0,
    fireRate: 1.5,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'engage',
      targetId: 'robot-a',
      strafeSign: -1,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex: 0,
    lastDamageTimestamp: 0,
  });

  // Track damage dealt
  let damageA = 0;
  let damageB = 0;

  // Simple telemetry adapter that tracks damage (implements TelemetryPort interface)
  const duelTelemetry = {
    reset: () => {},
    recordSpawn: () => {},
    recordFire: () => {},
    recordDamage: (event: { targetId: string; amount: number }) => {
      if (event.targetId === 'robot-b') {
        damageA += event.amount;
      } else if (event.targetId === 'robot-a') {
        damageB += event.amount;
      }
    },
    recordDeath: () => {},
  };

  // Run simulation loop until one robot is destroyed
  const MAX_TICKS = 5000; // Prevent infinite loops
  const DELTA_SECONDS = 1 / 60; // 60 FPS
  
  let projectilesFired = 0;
  
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    world.state.elapsedMs += DELTA_SECONDS * 1000;

    const projectilesB4 = world.projectiles.entities.length;
    
    // Update all systems
    updateAISystem(world, () => rng.next());
    updateCombatSystem(world, duelTelemetry);
    updateMovementSystem(world, DELTA_SECONDS);
    updateProjectileSystem(world, DELTA_SECONDS, duelTelemetry);

    const projectilesAfter = world.projectiles.entities.length;
    if (projectilesAfter > projectilesB4) {
      projectilesFired += (projectilesAfter - projectilesB4);
    }

    // Check if duel is over
    const aAlive = robotA.health > 0;
    const bAlive = robotB.health > 0;

    if (!aAlive || !bAlive) {
      const winner = aAlive ? 'A' : 'B';
      
      // Clean up
      world.clear();
      telemetry.endMatch();
      
      return {
        winner,
        damageA,
        damageB,
      };
    }
  }

  // Timeout - determine winner by remaining health
  world.clear();
  telemetry.endMatch();
  
  return {
    winner: robotA.health > robotB.health ? 'A' : 'B',
    damageA,
    damageB,
  };
}

/**
 * Run matrix of duels and aggregate results
 */
async function runDuelMatrix(config: DuelConfig): Promise<DuelResult> {
  console.log(`\nRunning Duel Matrix:`);
  console.log(`  ${config.archetypeA} vs ${config.archetypeB}`);
  console.log(`  Runs: ${config.runs}`);
  console.log(`  Seed: ${config.seed ?? 'random'}\n`);

  let winCountA = 0;
  let winCountB = 0;
  let damageTotalA = 0;
  let damageTotalB = 0;

  for (let i = 0; i < config.runs; i++) {
    const seed = config.seed !== undefined ? config.seed + i : Date.now() + i;
    const result = await runSingleDuel(config.archetypeA, config.archetypeB, seed);

    if (result.winner === 'A') {
      winCountA++;
    } else {
      winCountB++;
    }

    damageTotalA += result.damageA;
    damageTotalB += result.damageB;
  }

  const winRateA = winCountA / config.runs;
  const winRateB = winCountB / config.runs;

  return {
    archetypeA: config.archetypeA,
    archetypeB: config.archetypeB,
    winCountA,
    winCountB,
    totalRuns: config.runs,
    winRateA,
    winRateB,
    damageTotalA,
    damageTotalB,
  };
}

/**
 * Display results in a readable format
 */
function displayResults(result: DuelResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('DUEL MATRIX RESULTS');
  console.log('='.repeat(60));
  console.log(`\n${result.archetypeA.toUpperCase()} vs ${result.archetypeB.toUpperCase()}`);
  console.log(`Total Runs: ${result.totalRuns}\n`);
  
  console.log(`${result.archetypeA}:`);
  console.log(`  Wins: ${result.winCountA} (${(result.winRateA * 100).toFixed(1)}%)`);
  console.log(`  Total Damage: ${result.damageTotalA.toFixed(0)}`);
  
  console.log(`\n${result.archetypeB}:`);
  console.log(`  Wins: ${result.winCountB} (${(result.winRateB * 100).toFixed(1)}%)`);
  console.log(`  Total Damage: ${result.damageTotalB.toFixed(0)}`);
  
  console.log(`\n${'='.repeat(60)}\n`);

  // Output JSON for automated testing
  console.log('JSON Output:');
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const config = parseArgs();
    const result = await runDuelMatrix(config);
    displayResults(result);
    
    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('Error running duel matrix:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runDuelMatrix, runSingleDuel };
export type { DuelConfig, DuelResult };
