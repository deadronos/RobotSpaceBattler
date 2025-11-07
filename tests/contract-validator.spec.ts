import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv from 'ajv';

const root = process.cwd();
const schemaDir = join(
  root,
  'specs',
  '003-extend-placeholder-create',
  'schemas',
);
const examplesDir = join(
  root,
  'specs',
  '003-extend-placeholder-create',
  'examples',
);

function loadJson<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

describe('contract validator', () => {
  const ajv = new Ajv({ allErrors: true });

  const teamSchema = loadJson<Record<string, unknown>>(
    join(schemaDir, 'team.schema.json'),
  );
  const matchTraceSchema = loadJson<Record<string, unknown>>(
    join(schemaDir, 'matchtrace.schema.json'),
  );

  const validateTeam = ajv.compile(teamSchema);
  const validateMatchTrace = ajv.compile(matchTraceSchema);

  it('validates team example payload', () => {
    const example = loadJson(join(examplesDir, 'team.example.json'));
    const valid = validateTeam(example);

    if (!valid) {
      console.error(validateTeam.errors);
    }

    expect(valid).toBe(true);
  });

  it('validates match trace example payload', () => {
    const example = loadJson(join(examplesDir, 'matchtrace.example.json'));
    const valid = validateMatchTrace(example);

    if (!valid) {
      console.error(validateMatchTrace.errors);
    }

    expect(valid).toBe(true);
  });
});
