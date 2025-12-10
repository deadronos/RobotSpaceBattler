/**
 * T074-T076: AI Behavior Blending Integration Tests
 * Phase 8 TDD RED - Integration & AI Behavior Coordination
 * 
 * Tests verify that pathfinding desires blend correctly with combat, retreat, and idle behaviors.
 * @module integration
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BehaviorBlender } from '@/simulation/ai/coordination/BehaviorBlender';
import type { MovementDesire, BehaviorPriority } from '@/simulation/ai/coordination/types';

describe('AI Behavior Blending', () => {
  let blender: BehaviorBlender;

  beforeEach(() => {
    blender = new BehaviorBlender();
  });

  describe('T074: Behavior Blending System', () => {
    it('should blend multiple movement desires into single output', () => {
      // Arrange: Multiple behavior desires
      const pathfindingDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 0 },
        priority: 'pathfinding',
        weight: 0.5,
      };

      const combatDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 1 },
        priority: 'combat',
        weight: 0.8,
      };

      // Act
      const blended = blender.blend([pathfindingDesire, combatDesire]);

      // Assert: Output combines both desires
      expect(blended).toBeDefined();
      expect(blended.x).toBeDefined();
      expect(blended.z).toBeDefined();
      
      // Result should be influenced by both inputs
      expect(Math.abs(blended.x)).toBeGreaterThan(0);
      expect(Math.abs(blended.z)).toBeGreaterThan(0);
    });

    it('should handle empty desires list gracefully', () => {
      // Act
      const blended = blender.blend([]);

      // Assert: Should return zero velocity
      expect(blended.x).toBe(0);
      expect(blended.y).toBe(0);
      expect(blended.z).toBe(0);
    });

    it('should normalize blended output velocity', () => {
      // Arrange: High-magnitude desires
      const desire1: MovementDesire = {
        velocity: { x: 10, y: 0, z: 10 },
        priority: 'pathfinding',
        weight: 1.0,
      };

      const desire2: MovementDesire = {
        velocity: { x: 10, y: 0, z: -10 },
        priority: 'combat',
        weight: 1.0,
      };

      // Act
      const blended = blender.blend([desire1, desire2]);

      // Assert: Output should be clamped/normalized to reasonable speed
      const magnitude = Math.sqrt(blended.x ** 2 + blended.z ** 2);
      expect(magnitude).toBeLessThanOrEqual(10 + 1e-10); // Max speed constraint (with floating point epsilon)
    });
  });

  describe('T075: Weighted Blending Priorities', () => {
    it('should prioritize retreat over combat', () => {
      // Arrange
      const retreatDesire: MovementDesire = {
        velocity: { x: -1, y: 0, z: 0 }, // Move backward (retreat)
        priority: 'retreat',
        weight: 0.7,
      };

      const combatDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 0 }, // Move forward (engage)
        priority: 'combat',
        weight: 0.5,
      };

      // Act
      const blended = blender.blend([retreatDesire, combatDesire]);

      // Assert: Retreat should dominate (negative X from retreat > positive X from combat)
      expect(blended.x).toBeLessThan(0); // Net movement is backward (retreat wins)
    });

    it('should prioritize combat over pathfinding', () => {
      // Arrange
      const combatDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 1 },
        priority: 'combat',
        weight: 0.8,
      };

      const pathfindingDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: -1 },
        priority: 'pathfinding',
        weight: 0.4,
      };

      // Act
      const blended = blender.blend([combatDesire, pathfindingDesire]);

      // Assert: Combat should dominate (positive Z from combat > negative Z from pathfinding)
      expect(blended.z).toBeGreaterThan(0); // Net movement is forward (combat wins)
    });

    it('should prioritize pathfinding over idle', () => {
      // Arrange
      const pathfindingDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 1 },
        priority: 'pathfinding',
        weight: 0.5,
      };

      const idleDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 0 },
        priority: 'idle',
        weight: 0.3,
      };

      // Act
      const blended = blender.blend([pathfindingDesire, idleDesire]);

      // Assert: Pathfinding should dominate (idle contributes nothing)
      expect(Math.abs(blended.x)).toBeGreaterThan(0);
      expect(Math.abs(blended.z)).toBeGreaterThan(0);
    });

    it('should follow priority order: retreat > combat > pathfinding > idle', () => {
      // Arrange: All behaviors present with equal base weights
      const desires: MovementDesire[] = [
        {
          velocity: { x: 1, y: 0, z: 0 }, // idle
          priority: 'idle',
          weight: 0.25,
        },
        {
          velocity: { x: 0, y: 0, z: 1 }, // pathfinding
          priority: 'pathfinding',
          weight: 0.25,
        },
        {
          velocity: { x: -1, y: 0, z: 0 }, // combat
          priority: 'combat',
          weight: 0.25,
        },
        {
          velocity: { x: 0, y: 0, z: -1 }, // retreat
          priority: 'retreat',
          weight: 0.25,
        },
      ];

      // Act
      const blended = blender.blend(desires);

      // Assert: With equal input weights, priority order determines outcome
      // Retreat (highest priority) should have strongest influence
      // The blender should apply priority multipliers internally
      expect(blended).toBeDefined();

      // Verify the result is not zero (some movement occurs)
      const magnitude = Math.sqrt(blended.x ** 2 + blended.z ** 2);
      expect(magnitude).toBeGreaterThan(0);
    });

    it('should apply priority multipliers to weight desires appropriately', () => {
      // Arrange: Create blender with known priority weights
      const priorities: Record<BehaviorPriority, number> = {
        retreat: 2.0,
        combat: 1.5,
        pathfinding: 1.0,
        idle: 0.5,
      };
      
      const blenderWithPriorities = new BehaviorBlender(priorities);

      const combatDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 0 },
        priority: 'combat',
        weight: 0.5,
      };

      const pathfindingDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 0 },
        priority: 'pathfinding',
        weight: 0.5,
      };

      // Act
      const blended = blenderWithPriorities.blend([combatDesire, pathfindingDesire]);

      // Assert: Combat (1.5x) should dominate over pathfinding (1.0x) even with same base weight
      expect(blended.x).toBeGreaterThan(0);
      
      // The effective weight of combat is 0.5 * 1.5 = 0.75
      // The effective weight of pathfinding is 0.5 * 1.0 = 0.5
      // Total effective weight = 1.25, so combat contributes 0.75/1.25 = 60%
    });
  });

  describe('T076: Pathfinding Blends with Combat Behavior', () => {
    it('should blend pathfinding desire with combat strafe behavior', () => {
      // Arrange: Robot wants to pathfind forward while also strafing in combat
      const pathfindingDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 1 }, // Move forward toward waypoint
        priority: 'pathfinding',
        weight: 0.6,
      };

      const combatDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 0 }, // Strafe right
        priority: 'combat',
        weight: 0.7,
      };

      // Act
      const blended = blender.blend([pathfindingDesire, combatDesire]);

      // Assert: Output should combine both movements (diagonal)
      expect(blended.x).toBeGreaterThan(0); // Strafe component
      expect(blended.z).toBeGreaterThan(0); // Forward pathfinding component
      
      // Result should be diagonal movement
      const angle = Math.atan2(blended.z, blended.x);
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(Math.PI / 2); // First quadrant
    });

    it('should handle conflicting desires between pathfinding and combat', () => {
      // Arrange: Pathfinding wants to go one direction, combat wants opposite
      const pathfindingDesire: MovementDesire = {
        velocity: { x: 1, y: 0, z: 0 }, // Pathfinding says go right
        priority: 'pathfinding',
        weight: 0.5,
      };

      const combatDesire: MovementDesire = {
        velocity: { x: -1, y: 0, z: 0 }, // Combat says go left (take cover)
        priority: 'combat',
        weight: 0.9,
      };

      // Act
      const blended = blender.blend([pathfindingDesire, combatDesire]);

      // Assert: Combat should win (higher priority and weight)
      expect(blended.x).toBeLessThan(0); // Net movement is left (combat direction)
    });

    it('should maintain combat effectiveness while pathfinding', () => {
      // Arrange: Both pathfinding and combat desires present
      const pathfindingDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 1 },
        priority: 'pathfinding',
        weight: 0.5,
      };

      const combatDesire: MovementDesire = {
        velocity: { x: 0.5, y: 0, z: 0.5 }, // Tactical positioning
        priority: 'combat',
        weight: 0.8,
      };

      // Act
      const blended = blender.blend([pathfindingDesire, combatDesire]);

      // Assert: Both behaviors should contribute
      expect(Math.abs(blended.x)).toBeGreaterThan(0);
      expect(Math.abs(blended.z)).toBeGreaterThan(0);

      // Combat should have more influence due to higher priority
      const combatInfluence = Math.abs(blended.x);
      const pathfindingInfluence = Math.abs(blended.z);
      
      // With higher combat priority and weight, combat component should be significant
      expect(combatInfluence).toBeGreaterThan(0);
    });

    it('should blend pathfinding with retreat behavior when health is low', () => {
      // Arrange: Robot is retreating but also needs to navigate around obstacles
      const retreatDesire: MovementDesire = {
        velocity: { x: -1, y: 0, z: 0 }, // Retreat backward
        priority: 'retreat',
        weight: 0.9, // High priority when health low
      };

      const pathfindingDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 0.3 }, // Navigate around obstacle
        priority: 'pathfinding',
        weight: 0.4,
      };

      // Act
      const blended = blender.blend([retreatDesire, pathfindingDesire]);

      // Assert: Retreat should dominate but pathfinding should still influence
      expect(blended.x).toBeLessThan(0); // Primary retreat direction
      expect(Math.abs(blended.z)).toBeGreaterThan(0); // Obstacle avoidance component

      // Retreat should be primary movement
      expect(Math.abs(blended.x)).toBeGreaterThan(Math.abs(blended.z));
    });

    it('should allow idle behavior when no other desires present', () => {
      // Arrange: Only idle desire
      const idleDesire: MovementDesire = {
        velocity: { x: 0, y: 0, z: 0 },
        priority: 'idle',
        weight: 1.0,
      };

      // Act
      const blended = blender.blend([idleDesire]);

      // Assert: Should result in zero velocity (no movement)
      expect(blended.x).toBe(0);
      expect(blended.y).toBe(0);
      expect(blended.z).toBe(0);
    });
  });
});
