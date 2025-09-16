import { describe, expect, it } from 'vitest';

import type { WeaponType } from '../src/ecs/weapons';
import { robotPrefabs } from '../src/robots/prefabCatalog';
import { weaponProfiles } from '../src/robots/weaponProfiles';

describe('robot prefab catalog', () => {
  it('provides at least one prefab per weapon type', () => {
    const catalogTypes = new Set(robotPrefabs.map((prefab) => prefab.weaponType));
    (Object.keys(weaponProfiles) as WeaponType[]).forEach((type) => {
      expect(catalogTypes.has(type)).toBe(true);
    });
  });

  it('keeps stats in sync with weapon profiles', () => {
    robotPrefabs.forEach((prefab) => {
      const profile = weaponProfiles[prefab.weaponType];
      expect(prefab.stats.range).toBe(profile.range);
      expect(prefab.stats.cooldown).toBe(profile.cooldown);
      expect(prefab.stats.power).toBe(profile.power);
      if (profile.accuracy !== undefined) {
        expect(prefab.stats.accuracy).toBe(profile.accuracy);
      }
    });
  });
});
