import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

describe('Contract Validator - specs/003-extend-placeholder-create', () => {
  const root = path.resolve(__dirname, '..');
  const schemaDir = path.join(root, 'specs', '003-extend-placeholder-create', 'schemas');
  const examplesDir = path.join(root, 'specs', '003-extend-placeholder-create', 'examples');

  it('validates team example against team.schema.json', () => {
    const ajv = new Ajv({ allErrors: true });
    const teamSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'team.schema.json'), 'utf8'));
    const validate = ajv.compile(teamSchema as any);
    const example = JSON.parse(fs.readFileSync(path.join(examplesDir, 'team.example.json'), 'utf8'));
    const valid = validate(example);
    if (!valid) console.error('Validation errors:', validate.errors);
    expect(valid).toBe(true);
  });

  it('validates matchtrace example against matchtrace.schema.json', () => {
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'matchtrace.schema.json'), 'utf8'));
    const validate = ajv.compile(schema as any);
    const example = JSON.parse(fs.readFileSync(path.join(examplesDir, 'matchtrace.example.json'), 'utf8'));
    const valid = validate(example);
    if (!valid) console.error('Validation errors:', validate.errors);
    expect(valid).toBe(true);
  });
});
