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
 * TODO: This is a stub. Will be implemented in T024.
 */
async function runSingleDuel(
  archetypeA: WeaponArchetype,
  archetypeB: WeaponArchetype,
  seed: number
): Promise<{ winner: 'A' | 'B'; damageA: number; damageB: number }> {
  // Placeholder implementation
  console.log(`  Duel ${seed}: ${archetypeA} vs ${archetypeB}...`);
  
  // TODO: Initialize simulation with two robots
  // TODO: Equip them with specified archetypes
  // TODO: Run deterministic battle until one is destroyed
  // TODO: Return winner and damage stats
  
  // For now, return random result (will be replaced)
  const winner = Math.random() > 0.5 ? 'A' : 'B';
  return {
    winner,
    damageA: Math.random() * 1000,
    damageB: Math.random() * 1000,
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

export { runDuelMatrix };
export type { DuelConfig, DuelResult };
