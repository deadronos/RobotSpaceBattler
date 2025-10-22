/**
 * Contract Validator for MatchTrace system.
 *
 * Provides runtime validation of Team and MatchTrace entities against their
 * JSON schemas using ajv. Used in FR-009-A (contract validation) to ensure
 * data integrity before simulation playback.
 *
 * Schemas: specs/003-extend-placeholder-create/schemas/
 */

import type { ErrorObject } from "ajv";
// eslint-disable-next-line import/no-extraneous-dependencies
import Ajv from "ajv";

import {
  ContractValidationReport,
  ValidationError,
  ValidationResult,
} from "./types";

const ajv = new Ajv();

// ============================================================================
// Schema Definitions (inlined from specs/003-extend-placeholder-create/schemas/)
// ============================================================================

const TEAM_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Team",
  type: "object",
  required: ["id", "name", "units", "spawnPoints"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    metadata: { type: "object" },
    units: {
      type: "array",
      items: {
        anyOf: [
          { type: "string" },
          {
            type: "object",
            required: ["id", "modelRef", "teamId", "maxHealth"],
            properties: {
              id: { type: "string" },
              modelRef: { type: "string" },
              teamId: { type: "string" },
              maxHealth: { type: "number" },
              currentHealth: { type: "number" },
              weapons: { type: "array" },
              isCaptain: { type: "boolean" },
            },
          },
        ],
      },
    },
    spawnPoints: {
      type: "array",
      items: {
        type: "object",
        required: ["spawnPointId", "position"],
        properties: {
          spawnPointId: { type: "string" },
          position: {
            type: "object",
            required: ["x", "y", "z"],
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
          },
        },
      },
    },
  },
  additionalProperties: true,
};

const MATCHTRACE_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "MatchTrace",
  type: "object",
  required: ["events"],
  properties: {
    meta: {
      type: "object",
      properties: {
        rngSeed: { type: "integer" },
        rngAlgorithm: { type: "string" },
      },
      additionalProperties: true,
    },
    rngSeed: { type: "integer" },
    rngAlgorithm: { type: "string" },
    events: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "timestampMs"],
        properties: {
          type: {
            type: "string",
            enum: ["spawn", "move", "fire", "hit", "damage", "death", "score"],
          },
          timestampMs: { type: "integer" },
          frameIndex: { type: "integer" },
          sequenceId: { type: "integer" },
          entityId: { type: "string" },
          attackerId: { type: "string" },
          targetId: { type: "string" },
          teamId: { type: "string" },
          position: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
            required: ["x", "y", "z"],
          },
          projectileId: { type: "string" },
          collisionNormal: {
            type: "object",
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
          },
          amount: { type: "number" },
          resultingHealth: { type: "number" },
          sourceEventId: { type: "string" },
          reason: { type: "string" },
          killedBy: { type: "string" },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

// ============================================================================
// Validator Functions
// ============================================================================

/**
 * Compile validators (cached by ajv)
 */
const validateTeam = ajv.compile(TEAM_SCHEMA);
const validateMatchTrace = ajv.compile(MATCHTRACE_SCHEMA);

/**
 * Convert ajv validation errors to our ValidationError format
 */
export function formatErrors(
  errors: ErrorObject[] | null | undefined,
): ValidationError[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map((err) => {
    const errorRecord = err as unknown as Record<string, unknown>;
    const instancePath =
      typeof errorRecord.instancePath === "string"
        ? (errorRecord.instancePath as string)
        : undefined;
    // ajv v6 used `dataPath`; newer versions use `instancePath`. Read both
    // from the runtime object via the cast to avoid TypeScript errors.
    const dataPath =
      typeof (errorRecord as Record<string, unknown>)['dataPath'] === 'string'
        ? ((errorRecord as Record<string, unknown>)['dataPath'] as string)
        : undefined;
    const schemaPath =
      typeof errorRecord.schemaPath === "string"
        ? (errorRecord.schemaPath as string)
        : undefined;

    return {
      path: instancePath || dataPath || schemaPath || "root",
      message: err.message || "Unknown validation error",
      value: err.data,
    };
  });
}

/**
 * Validate a Team object against the Team schema.
 *
 * @param team - The team object to validate
 * @returns ValidationResult with valid flag and any errors found
 */
export function validateTeamContract(team: unknown): ValidationResult {
  const valid = validateTeam(team);
  return {
    valid: valid === true,
    errors: valid ? [] : formatErrors(validateTeam.errors),
  };
}

/**
 * Validate a MatchTrace object against the MatchTrace schema.
 *
 * @param trace - The MatchTrace object to validate
 * @returns ValidationResult with valid flag and any errors found
 */
export function validateMatchTraceContract(trace: unknown): ValidationResult {
  const valid = validateMatchTrace(trace);
  return {
    valid: valid === true,
    errors: valid ? [] : formatErrors(validateMatchTrace.errors),
  };
}

/**
 * Validate multiple teams against the Team schema.
 *
 * @param teams - Array of team objects to validate
 * @returns Array of ValidationResults, one per team
 */
export function validateTeamsContract(teams: unknown[]): ValidationResult[] {
  return teams.map((team) => validateTeamContract(team));
}

/**
 * Run full contract validation suite (FR-009-A).
 *
 * Validates Team schema and MatchTrace schema. Used as a pre-flight check
 * before running a match or replaying a trace.
 *
 * @param team - Team object to validate (optional)
 * @param trace - MatchTrace object to validate (optional)
 * @returns ContractValidationReport with overall status
 */
export function validateAllContracts(
  team?: unknown,
  trace?: unknown,
): ContractValidationReport {
  const teamResult = team
    ? validateTeamContract(team)
    : { valid: true, errors: [] };
  const traceResult = trace
    ? validateMatchTraceContract(trace)
    : { valid: true, errors: [] };

  const overallValid = teamResult.valid && traceResult.valid;

  return {
    timestamp: performance.now(),
    teamSchema: teamResult,
    matchTraceSchema: traceResult,
    overallValid,
  };
}

/**
 * Assert that validation passes, throw if not.
 *
 * @param result - ValidationResult from a validator function
 * @param context - Human-readable context for the error message
 * @throws Error if validation failed
 */
export function assertContractValid(
  result: ValidationResult,
  context: string,
): void {
  if (!result.valid) {
    const errorList = result.errors
      .map((err) => `  - ${err.path}: ${err.message}`)
      .join("\n");
    throw new Error(`Contract validation failed (${context}):\n${errorList}`);
  }
}
