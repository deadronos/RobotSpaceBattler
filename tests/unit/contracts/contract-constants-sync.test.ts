import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  BASE_DAMAGE,
  MULTIPLIERS as CODE_MULTIPLIERS,
} from '../../../src/ecs/constants/weaponConstants';
import type { WeaponType } from '../../../src/types';

/**
 * Minimal parser to extract base damage and multipliers from the
 * human-readable scoring contract markdown.
 */
function parseContract(contractText: string) {
  const result: {
    baseDamage: Record<string, number>;
    multipliers: Record<string, Record<string, number>>;
  } = { baseDamage: {}, multipliers: {} };

  // Extract the Base Damage Values section
  const baseSection = contractText.match(/### Base Damage Values([\s\S]*?)(?:\n\s*###|$)/i);
  if (baseSection) {
    const rows = baseSection[1].match(/^\|[^\n]+$/gm) || [];
    rows.forEach((r) => {
      // Match table row with two columns: | Weapon | Base |
      const m = r.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
      if (m) {
        const weapon = m[1].trim().toLowerCase();
        const value = parseFloat(m[2].trim());
        if (!Number.isNaN(value)) result.baseDamage[weapon] = value;
      }
    });
  }

  // Extract the Damage Multipliers section
  const multSection = contractText.match(/### Damage Multipliers([\s\S]*?)(?:\n\s*###|$)/i);
  if (multSection) {
    const rows = multSection[1].match(/^\|[^\n]+$/gm) || [];
    rows.forEach((r) => {
      // Row format: | Attacker | Defender | Multiplier | ... |
      const m = r.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
      if (m) {
        const attacker = m[1].trim().toLowerCase();
        const defender = m[2].trim().toLowerCase();
        // Multiplier may include an 'x' suffix
        const multiplierText = m[3].trim().replace(/x$/i, '');
        const multiplier = parseFloat(multiplierText);
        if (!Number.isNaN(multiplier)) {
          result.multipliers[attacker] = result.multipliers[attacker] || {};
          result.multipliers[attacker][defender] = multiplier;
        }
      }
    });
  }

  return result;
}

describe('Contract ↔ Code constants sync', () => {
  it('runtime BASE_DAMAGE should match values in scoring-contract.md', () => {
    const contractPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'specs',
      '001-3d-team-vs',
      'contracts',
      'scoring-contract.md'
    );
    const contractText = fs.readFileSync(contractPath, 'utf8');
    const parsed = parseContract(contractText);

    // Ensure we found entries in the contract
    expect(Object.keys(parsed.baseDamage).length).toBeGreaterThan(0);

    // Compare each weapon in code against the contract
    Object.keys(BASE_DAMAGE).forEach((weapon) => {
      const w = weapon as WeaponType;
      const codeValue = BASE_DAMAGE[w];
      const contractValue = parsed.baseDamage[w];
      expect(contractValue, `contract missing base damage for ${weapon}`).toBeDefined();
      expect(codeValue).toBe(contractValue);
    });
  });

  it('runtime MULTIPLIERS should match scoring-contract.md', () => {
    const contractPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'specs',
      '001-3d-team-vs',
      'contracts',
      'scoring-contract.md'
    );
    const contractText = fs.readFileSync(contractPath, 'utf8');
    const parsed = parseContract(contractText);

    // Ensure multipliers were parsed
    expect(Object.keys(parsed.multipliers).length).toBeGreaterThan(0);

    // For each attacker/defender pair in code, assert closeness to contract
    Object.keys(CODE_MULTIPLIERS).forEach((attacker) => {
      const a = attacker as WeaponType;
      Object.keys(CODE_MULTIPLIERS[a]).forEach((defender) => {
        const d = defender as WeaponType;
        const codeMult = CODE_MULTIPLIERS[a][d];
        const contractMult = parsed.multipliers[a]?.[d];
        expect(contractMult, `contract missing multiplier for ${a} vs ${d}`).toBeDefined();
        // Use toBeCloseTo for floating point comparisons (0.67)
        expect(codeMult).toBeCloseTo(contractMult as number, 2);
      });
    });
  });
});