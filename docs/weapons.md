# Weapons ECS Design

This document outlines the unified weapons entity-component-system (ECS) used in **RobotSpaceBattler**. The goal is to support guns, lasers, and rockets with shared components and modular systems.

## Goals
- Handle hitscan, projectile, and beam weapons with a common data model.
- Share cooldown, ammo, and owner/team information across weapon types.
- Allow deterministic behaviour via a seeded random number generator.

## Components
- **WeaponComponent** – defines weapon type, damage profile, cooldown, and metadata.
- **CooldownComponent** – tracks remaining cooldown time after firing.
- **AmmoComponent** – clip and reserve ammunition bookkeeping.
- **ProjectileComponent** – state for active projectiles.
- **BeamComponent** – state for continuous beam effects.
- **WeaponStateComponent** – flags for firing, reloading, or charging.

## Systems
- **weaponSystem** – manages cooldowns and ammo, delegates to specialised systems when firing.
- **hitscanSystem** – resolves instantaneous hits using raycasts.
- **projectileSystem** – updates projectile entities and handles expiration.
- **beamSystem** – updates continuous beams and removes them when finished.

## Next Steps
- Flesh out system logic and integrate with `Simulation`.
- Add unit tests for firing logic, cooldowns, and projectile lifecycle.
- Profile projectile pooling for performance.
