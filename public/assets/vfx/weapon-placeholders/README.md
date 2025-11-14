# Weapon VFX Placeholders

This directory contains placeholder visual effects for the weapon diversity feature (spec 005).

## Placeholder Assets

### Rocket VFX
- `rocket-placeholder.png` - Simple orange/red circular sprite for rocket explosion
- Used for: Rocket projectile trails and AoE explosion effects

### Laser VFX
- `laser-placeholder.png` - Blue/cyan beam texture
- Used for: Laser beam tracers and sustained hit effects

### Gun VFX
- `gun-placeholder.png` - Yellow/white tracer dot
- Used for: Ballistic gun tracers and impact sparks

## Usage

These placeholders are simple geometric shapes that provide visual distinction between weapon types during development and testing. They should be replaced with production assets when available from the art team.

## Technical Notes

- All placeholders are simple PNG files with transparency
- Designed to be easy to recognize and distinguish during testing
- Integrated with QualityManager for performance scaling
- Will be loaded via the weapon visual refs system in WeaponProfile

## Production Asset Requirements

Final assets should include:
- High-resolution particle textures (512x512 or higher)
- Alpha channels for proper blending
- Multiple frames for animated effects
- Optimized file sizes for web delivery
- Matching the visual style guide from specs/002

## References

- Spec: `specs/005-weapon-diversity/spec.md`
- Data Model: `specs/005-weapon-diversity/data-model.md`
- Visual requirements: FR-005, FR-006, FR-007, FR-008 in spec
