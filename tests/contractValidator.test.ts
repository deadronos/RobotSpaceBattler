import { describe, it, expect } from 'vitest';
import { formatErrors } from '../src/systems/matchTrace/contractValidator';
import type { ErrorObject } from 'ajv';

describe('formatErrors compatibility', () => {
  it('handles new Ajv instancePath error objects', () => {
    const err: ErrorObject = {
      instancePath: '/events/0/type',
      schemaPath: '#/properties/events/items/properties/type',
      keyword: 'enum',
      params: { allowedValues: ['spawn', 'move'] },
      message: "must be equal to one of the allowed values",
      data: 'invalid',
    } as unknown as ErrorObject;

    const out = formatErrors([err]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      path: '/events/0/type',
      message: "must be equal to one of the allowed values",
      value: 'invalid',
    });
  });

  it('handles legacy Ajv dataPath error objects', () => {
    // create an object shaped like older ajv errors
    const legacyErr = {
      dataPath: '.events[0].type',
      schemaPath: '#/properties/events/items/properties/type',
      keyword: 'enum',
      params: { allowedValues: ['spawn', 'move'] },
      message: "must be equal to one of the allowed values",
      data: 'invalid-legacy',
    } as unknown as ErrorObject;

    const out = formatErrors([legacyErr]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      path: '.events[0].type',
      message: "must be equal to one of the allowed values",
      value: 'invalid-legacy',
    });
  });
});
