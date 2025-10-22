import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import Ajv from 'ajv';

/**
 * Contract Validator Test Harness
 *
 * Comprehensive Vitest suite for JSON Schema validation using ajv.
 * Tests compliance with specs/003-extend-placeholder-create/schemas/
 * and FR-009-A acceptance criteria.
 */

describe('Contract Validator - specs/003-extend-placeholder-create', () => {
  const root = path.resolve(__dirname, '..');
  const schemaDir = path.join(root, 'specs', '003-extend-placeholder-create', 'schemas');
  const examplesDir = path.join(root, 'specs', '003-extend-placeholder-create', 'examples');

  // ========================================================================
  // Test: Schema Files Exist
  // ========================================================================

  it('should have team.schema.json in schemas directory', () => {
    const schemaPath = path.join(schemaDir, 'team.schema.json');
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it('should have matchtrace.schema.json in schemas directory', () => {
    const schemaPath = path.join(schemaDir, 'matchtrace.schema.json');
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  // ========================================================================
  // Test: Team Schema Validation
  // ========================================================================

  it('validates team example against team.schema.json', () => {
    const ajv = new Ajv({ allErrors: true });
    const teamSchema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'team.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(teamSchema as any);
    const example = JSON.parse(
      fs.readFileSync(path.join(examplesDir, 'team.example.json'), 'utf8'),
    );
    const valid = validate(example);
    if (!valid) console.error('Team validation errors:', validate.errors);
    expect(valid).toBe(true);
  });

  it('should enforce Team schema required fields: id, name, units, spawnPoints', () => {
    const ajv = new Ajv({ allErrors: true });
    const teamSchema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'team.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(teamSchema as any);

    const required = teamSchema.required || [];
    expect(required).toContain('id');
    expect(required).toContain('name');
    expect(required).toContain('units');
    expect(required).toContain('spawnPoints');
  });

  it('should fail Team validation when required id field is missing', () => {
    const ajv = new Ajv({ allErrors: true });
    const teamSchema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'team.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(teamSchema as any);

    const invalidTeam = {
      name: 'Test Team',
      units: [],
      spawnPoints: [],
    };
    const valid = validate(invalidTeam);
    expect(valid).toBe(false);
  });

  // ========================================================================
  // Test: MatchTrace Schema Validation
  // ========================================================================

  it('validates matchtrace example against matchtrace.schema.json', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);
    const example = JSON.parse(
      fs.readFileSync(path.join(examplesDir, 'matchtrace.example.json'), 'utf8'),
    );
    const valid = validate(example);
    if (!valid) console.error('MatchTrace validation errors:', validate.errors);
    expect(valid).toBe(true);
  });

  it('should enforce MatchTrace schema required field: events', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const required = schema.required || [];
    expect(required).toContain('events');
  });

  it('should allow empty events array in MatchTrace', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);

    const minimal = { events: [] };
    const valid = validate(minimal);
    expect(valid).toBe(true);
  });

  it('should enforce event types: spawn, move, fire, hit, damage, death, score', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);

    const validTypes = ['spawn', 'move', 'fire', 'hit', 'damage', 'death', 'score'];

    validTypes.forEach((type) => {
      const event = {
        type,
        timestampMs: 0,
      };
      const trace = { events: [event] };
      const valid = validate(trace);
      if (!valid) {
        console.error(`Event type '${type}' validation failed:`, validate.errors);
      }
      expect(valid).toBe(true);
    });
  });

  it('should fail on invalid event type', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);

    const trace = {
      events: [
        {
          type: 'invalid-event',
          timestampMs: 0,
        },
      ],
    };
    const valid = validate(trace);
    expect(valid).toBe(false);
  });

  it('should require timestampMs in all events', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);

    const trace = {
      events: [
        {
          type: 'spawn',
          // missing timestampMs
        },
      ],
    };
    const valid = validate(trace);
    expect(valid).toBe(false);
  });

  // ========================================================================
  // Test: FR-009-A Acceptance Criteria
  // ========================================================================

  it('FR-009-A: should validate Team contract fields', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'team.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);

    const teamWithAllFields = {
      id: 'alpha',
      name: 'Alpha Team',
      units: [
        {
          id: 'unit1',
          modelRef: 'model.gltf',
          teamId: 'alpha',
          maxHealth: 100,
        },
      ],
      spawnPoints: [
        {
          spawnPointId: 'sp1',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
    };
    expect(validate(teamWithAllFields)).toBe(true);
  });

  it('FR-009-A: should validate MatchTrace events with complete payload', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    const validate = ajv.compile(schema as any);

    const completeTrace = {
      rngSeed: 42,
      rngAlgorithm: 'seeded-random',
      events: [
        {
          type: 'spawn',
          timestampMs: 0,
          sequenceId: 1,
          entityId: 'u1',
          teamId: 'alpha',
          position: { x: 0, y: 0, z: 0 },
        },
        {
          type: 'damage',
          timestampMs: 100,
          sequenceId: 2,
          targetId: 'u2',
          attackerId: 'u1',
          amount: 10,
          resultingHealth: 90,
        },
      ],
    };
    expect(validate(completeTrace)).toBe(true);
  });

  // ========================================================================
  // Test: Schema Integrity
  // ========================================================================

  it('should ensure schemas are valid JSON Schema format', () => {
    const teamSchema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'team.schema.json'), 'utf8'),
    );
    expect(teamSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(teamSchema.title).toBeDefined();
    expect(teamSchema.type).toBe('object');

    const traceSchema = JSON.parse(
      fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'),
    );
    expect(traceSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(traceSchema.title).toBeDefined();
    expect(traceSchema.type).toBe('object');
  });
});
