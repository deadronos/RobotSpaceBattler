import { describe, it, expect } from 'vitest';
import {
  CollisionGroup,
  interactionGroups,
} from '../../src/lib/physics/collisionGroups';

describe('CollisionGroup', () => {
  describe('bitmask values', () => {
    it('WALL should be bit 0 (0x0001)', () => {
      expect(CollisionGroup.WALL).toBe(0x0001);
    });

    it('PILLAR should be bit 1 (0x0002)', () => {
      expect(CollisionGroup.PILLAR).toBe(0x0002);
    });

    it('ROBOT should be bit 2 (0x0004)', () => {
      expect(CollisionGroup.ROBOT).toBe(0x0004);
    });

    it('PROJECTILE should be bit 3 (0x0008)', () => {
      expect(CollisionGroup.PROJECTILE).toBe(0x0008);
    });

    it('STATIC_GEOMETRY should be WALL | PILLAR', () => {
      expect(CollisionGroup.STATIC_GEOMETRY).toBe(
        CollisionGroup.WALL | CollisionGroup.PILLAR
      );
      expect(CollisionGroup.STATIC_GEOMETRY).toBe(0x0003);
    });
  });
});

describe('interactionGroups', () => {
  it('packs membership in upper 16 bits and filter in lower 16 bits', () => {
    // membership = 0x0001, filter = 0x0002
    // result should be (0x0001 << 16) | 0x0002 = 0x00010002
    const result = interactionGroups(0x0001, 0x0002);
    expect(result).toBe(0x00010002);
  });

  it('handles membership and filter with same value', () => {
    // membership = filter = WALL (0x0001)
    // result should be (0x0001 << 16) | 0x0001 = 0x00010001
    const result = interactionGroups(
      CollisionGroup.WALL,
      CollisionGroup.WALL
    );
    expect(result).toBe(0x00010001);
  });

  it('handles combined groups', () => {
    // Robot that interacts with static geometry
    // membership = ROBOT (0x0004), filter = STATIC_GEOMETRY (0x0003)
    // result should be (0x0004 << 16) | 0x0003 = 0x00040003
    const result = interactionGroups(
      CollisionGroup.ROBOT,
      CollisionGroup.STATIC_GEOMETRY
    );
    expect(result).toBe(0x00040003);
  });

  it('handles multiple membership groups', () => {
    // Something that belongs to both WALL and PILLAR groups
    // membership = WALL | PILLAR (0x0003), filter = ROBOT (0x0004)
    // result should be (0x0003 << 16) | 0x0004 = 0x00030004
    const result = interactionGroups(
      CollisionGroup.WALL | CollisionGroup.PILLAR,
      CollisionGroup.ROBOT
    );
    expect(result).toBe(0x00030004);
  });

  it('handles zero membership (belongs to no group)', () => {
    const result = interactionGroups(0, CollisionGroup.WALL);
    expect(result).toBe(0x00000001);
  });

  it('handles zero filter (interacts with nothing)', () => {
    const result = interactionGroups(CollisionGroup.ROBOT, 0);
    expect(result).toBe(0x00040000);
  });

  it('handles all groups in membership and filter', () => {
    const allGroups =
      CollisionGroup.WALL |
      CollisionGroup.PILLAR |
      CollisionGroup.ROBOT |
      CollisionGroup.PROJECTILE;
    // all groups = 0x000F
    // result should be (0x000F << 16) | 0x000F = 0x000F000F
    const result = interactionGroups(allGroups, allGroups);
    expect(result).toBe(0x000f000f);
  });
});
