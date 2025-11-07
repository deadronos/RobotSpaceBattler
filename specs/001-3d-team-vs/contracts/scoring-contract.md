# Scoring Contract: Weapon Rock-Paper-Scissors Balance

**Feature**: 001-3d-team-vs  
**Validates**: FR-003 (Weapon balance system)  
**Date**: 2025-10-06

## Contract Description

This contract defines the damage calculation behavior for the rock-paper-scissors weapon balance system. Each weapon type has an advantage against one type and a disadvantage against another.

## Rules

### Base Damage Values

| Weapon Type | Base Damage |
|-------------|-------------|
| Laser       | 15          |
| Gun         | 20          |
| Rocket      | 30          |

### Damage Multipliers

| Attacker Weapon | Defender Weapon | Multiplier | Result Damage |
|-----------------|-----------------|------------|---------------|
| Laser           | Gun             | 1.5x       | 22.5 (Laser wins) |
| Laser           | Rocket          | 0.67x      | 10.05 (Laser loses) |
| Laser           | Laser           | 1.0x       | 15 (Neutral) |
| Gun             | Rocket          | 1.5x       | 30 (Gun wins) |
| Gun             | Laser           | 0.67x      | 13.4 (Gun loses) |
| Gun             | Gun             | 1.0x       | 20 (Neutral) |
| Rocket          | Laser           | 1.5x       | 45 (Rocket wins) |
| Rocket          | Gun             | 0.67x      | 20.1 (Rocket loses) |
| Rocket          | Rocket          | 1.0x       | 30 (Neutral) |

### Contract Rules

1. **Advantage Rule**: Laser beats Gun, Gun beats Rocket, Rocket beats Laser (1.5x multiplier)
2. **Disadvantage Rule**: Opposite matchups receive 0.67x multiplier
3. **Neutral Rule**: Same weapon types receive 1.0x multiplier
4. **Damage Floor**: All damage calculations must result in > 0 damage (no immunity)
5. **Calculation Formula**: `finalDamage = baseDamage * multiplier(attackerWeapon, defenderWeapon)`

## Expected Behavior

### Test Case 1: Laser vs Gun (Advantage)

```typescript
// Input
attacker.weaponType = "laser"
defender.weaponType = "gun"
baseDamage = 15

// Expected Output
finalDamage = 15 * 1.5 = 22.5
```

### Test Case 2: Gun vs Laser (Disadvantage)

```typescript
// Input
attacker.weaponType = "gun"
defender.weaponType = "laser"
baseDamage = 20

// Expected Output
finalDamage = 20 * 0.67 = 13.4
```

### Test Case 3: Rocket vs Rocket (Neutral)

```typescript
// Input
attacker.weaponType = "rocket"
defender.weaponType = "rocket"
baseDamage = 30

// Expected Output
finalDamage = 30 * 1.0 = 30.0
```

## Test Implementation Requirement

Contract test must validate ALL 9 weapon matchup scenarios (3 weapon types × 3 defender types) with correct multipliers applied.

**Test File**: `tests/contracts/weapon-balance.test.ts`

**Acceptance Criteria**:
- ✅ All 9 matchups return correct damage values
- ✅ Advantage matchups always do more damage than neutral
- ✅ Disadvantage matchups always do less damage than neutral
- ✅ No damage calculation results in 0 or negative damage
- ✅ Multipliers are exactly 1.5x, 0.67x, or 1.0x (no other values)

---

**Status**: ✅ Contract defined, ready for test implementation (TDD)
