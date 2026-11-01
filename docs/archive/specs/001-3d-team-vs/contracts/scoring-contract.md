# Scoring Contract: Weapon Damage Balance (As Implemented)

**Feature**: 001-3d-team-vs  
**Validates**: FR-003 (Weapon balance system)

This contract documents the current damage model used by the repository.

## Base Damage Values

Base damage is determined by the attacker weapon profile.

| Weapon Type | Base Damage |
| --- | ---: |
| Laser | 14 |
| Gun | 16 |
| Rocket | 24 |

## Damage Multipliers

The multiplier is based on `(attackerWeapon, defenderWeapon)`.

- Advantage: `1.25`
- Disadvantage: `0.85`
- Neutral (same weapon): `1.0`

| Attacker Weapon | Defender Weapon | Multiplier |
| --- | --- | ---: |
| Laser | Laser | 1.0 |
| Laser | Gun | 1.25 |
| Laser | Rocket | 0.85 |
| Gun | Laser | 0.85 |
| Gun | Gun | 1.0 |
| Gun | Rocket | 1.25 |
| Rocket | Laser | 1.25 |
| Rocket | Gun | 0.85 |
| Rocket | Rocket | 1.0 |

## Formula

`finalDamage = baseDamage(attackerWeapon) * multiplier(attackerWeapon, defenderWeapon)`

## References

- Weapon profiles (base damage) and multiplier matrix: `src/simulation/combat/weapons.ts`
- Damage application: `src/ecs/systems/projectileSystem.ts`
