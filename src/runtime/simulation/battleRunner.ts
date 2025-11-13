import { updateAISystem } from "../../ecs/systems/aiSystem";
import { updateCombatSystem } from "../../ecs/systems/combatSystem";
import { updateMovementSystem } from "../../ecs/systems/movementSystem";
import { updateProjectileSystem } from "../../ecs/systems/projectileSystem";
import { spawnTeams } from "../../ecs/systems/spawnSystem";
import { BattleWorld, resetBattleWorld, TeamId } from "../../ecs/world";
import { createXorShift32 } from "../../lib/random/xorshift";
import { isActiveRobot } from "../../lib/robotHelpers";
import { MatchStateMachine } from "../state/matchStateMachine";
import { TelemetryPort } from "./ports";

const VICTORY_DELAY_MS = 5000;

export interface BattleRunnerOptions {
  seed?: number;
  telemetry: TelemetryPort;
  matchMachine: MatchStateMachine;
}

export interface BattleRunner {
  step: (deltaSeconds: number) => void;
  reset: () => void;
}

function evaluateVictory(
  world: BattleWorld,
  matchMachine: MatchStateMachine,
): void {
  const snapshot = matchMachine.getSnapshot();
  if (snapshot.phase !== "running") {
    return;
  }

  const alive = world.robots.entities.reduce(
    (acc, robot) => {
      if (isActiveRobot(robot)) {
        acc[robot.team] += 1;
      }
      return acc;
    },
    { red: 0, blue: 0 },
  );

  const teams: TeamId[] = ["red", "blue"];
  const defeated = teams.filter((team) => alive[team] === 0);

  if (defeated.length === 0 || defeated.length === teams.length) {
    return;
  }

  const winner = defeated[0] === "red" ? "blue" : "red";
  matchMachine.declareVictory(winner, VICTORY_DELAY_MS);
}

export function createBattleRunner(
  world: BattleWorld,
  options: BattleRunnerOptions,
): BattleRunner {
  const seed = options.seed ?? world.state.seed ?? Date.now();
  const rng = createXorShift32(seed);
  const { telemetry, matchMachine } = options;

  function spawnMatch(nextSeed?: number) {
    const matchSeed = nextSeed ?? Math.floor(rng.next() * 0xffffffff);
    telemetry.reset(`match-${matchSeed}`);
    resetBattleWorld(world);
    spawnTeams(world, {
      seed: matchSeed,
      onRobotSpawn: (robot) =>
        telemetry.recordSpawn(robot, world.state.elapsedMs),
    });
    matchMachine.reset();
    matchMachine.start();
  }

  spawnMatch(seed);

  return {
    step: (deltaSeconds: number) => {
      const deltaMs = deltaSeconds * 1000;
      world.state.elapsedMs += deltaMs;

      const snapshot = matchMachine.getSnapshot();

      if (snapshot.phase === "running") {
        updateAISystem(world, () => rng.next());
        updateCombatSystem(world, telemetry);
        updateMovementSystem(world, deltaSeconds);
        updateProjectileSystem(world, deltaSeconds, telemetry);
        evaluateVictory(world, matchMachine);
      }

      const shouldRestart = matchMachine.tick(deltaMs);
      if (shouldRestart) {
        spawnMatch();
      }
    },
    reset: () => {
      spawnMatch();
    },
  };
}
