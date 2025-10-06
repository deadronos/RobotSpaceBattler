import { BASE_DAMAGE as CODE_BASE_DAMAGE, getDamageMultiplier } from '../../../src/ecs/constants/weaponConstants';
import { BASE_DAMAGE as CONTRACT_BASE_DAMAGE, MULTIPLIERS as CONTRACT_MULTIPLIERS } from '../../../src/contracts/loadScoringContract';
import type { WeaponType } from '../../../src/types';

describe('Contract ↔ Code constants sync', () => {
  it('runtime BASE_DAMAGE should match values in the canonical scoring contract module', () => {
    // Ensure the contract module exports entries
    expect(Object.keys(CONTRACT_BASE_DAMAGE).length).toBeGreaterThan(0);

    Object.keys(CODE_BASE_DAMAGE).forEach((weapon) => {
      const w = weapon as WeaponType;
      const codeValue = CODE_BASE_DAMAGE[w];
      const contractValue = CONTRACT_BASE_DAMAGE[w];
      expect(contractValue, `contract missing base damage for ${weapon}`).toBeDefined();
      expect(codeValue).toBe(contractValue);
    });
  });

  it('runtime MULTIPLIERS should match the canonical scoring contract module', () => {
    // Ensure multipliers are present in contract module
    expect(Object.keys(CONTRACT_MULTIPLIERS).length).toBeGreaterThan(0);

    const weapons: WeaponType[] = ['laser', 'gun', 'rocket'];
    weapons.forEach((attacker) => {
      weapons.forEach((defender) => {
        const codeMult = getDamageMultiplier(attacker, defender);
        const contractMult = CONTRACT_MULTIPLIERS[attacker]?.[defender];
        expect(contractMult, `contract missing multiplier for ${attacker} vs ${defender}`).toBeDefined();
        expect(codeMult).toBeCloseTo(contractMult as number, 2);
      });
    });
  });
});