# Space Station Auto-Battler (Prototype)

This repository is a starter/skeleton for a 3D team-vs-team auto-battler:

- 10 vs 10 humanoid robots (red vs blue)
- Procedurally-generated robot meshes (replaceable with glTF later via gltfjsx)
- Rapier physics via @react-three/rapier
- React + TypeScript + react-three-fiber
- miniplex ECS, zustand for UI/game state
- Vite, Vitest, Playwright, ESLint, Prettier

Quick start:

1. Install
   - npm install
2. Development
   - npm run dev
3. Unit tests
   - npm run test
4. E2E Playwright smoke test
   - npx playwright test

What this skeleton includes:

- Basic scene with directional + ambient light and shadows
- Physics playground and robot spawner (10 red / 10 blue)
- Simple steer-to-target AI, per-frame updates
- Basic ECS pattern with miniplex
- Test scaffolding (Vitest + Playwright)

Notes:

- Replace procedural robots with gltfjsx-generated components from Blender exports for richer visuals.
- See SPEC.md for architecture, systems, pitfalls, and recommendations.

## Maintenance

Update dependency documentation (docs/DEPENDENCIES.md):

```powershell
npm run docs:deps
```

This regenerates the dependency catalog from package.json and installed package metadata.

### Assets & art pipeline (local dev)

This project includes a small assets pipeline to validate and optimize glTF assets used during development.

- Validate example assets:

```powershell
npm ci
npm run assets:validate
```

- Optimize example assets (writes to `public/assets/optimized/`):

```powershell
npm run assets:optimize
# Optional (Draco compression via gltf-transform if installed):
npm run assets:compress
```

See `docs/assets.md` for authoring guidelines and naming conventions.
\n
