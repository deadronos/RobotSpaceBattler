I sketched a complete spec and created a minimal, runnable skeleton for a 10v10 3D team-vs-team autobattler using TypeScript, React + react-three-fiber, @react-three/rapier for physics, miniplex ECS, zustand for state, and tooling (Vite, Vitest, Playwright, ESLint, Prettier). The code is intentionally small and focused: a Canvas with lighting, shadows, a Rapier Physics world, procedural robot meshes, a simple AI steering system and a test harness. This gives you a working foundation you can iterate on and replace meshes with gltfjsx exports later.

What I placed here

A project spec + architecture (SPEC.md) explaining components, ECS design, systems, AI, rendering, performance tips and pitfalls.
A README with setup & commands.
A package.json with latest dependencies (caret ranges, you can lock to specific versions if you prefer).
Vite + TS + ESLint + Prettier configs.
A small TypeScript + React Three Fiber app that spawns 10 red and 10 blue robots, gives them physics bodies, and a simple steering AI that pushes them toward the nearest enemy.
Vitest unit test and Playwright smoke test to verify core functionality (page loads, canvas exists, simulation UI text).
Notes and recommendations for future extensions: gltf model replacement with @react-three/gltfjsx, GPU instancing, LOD, deterministic simulation, networking, replay & server-authoritative designs.
I started with the minimal, runnable pieces so you can npm install && npm run dev right away. Below are the files I created. After this you can:

Replace procedural robot meshes with Blender GLTF exports and gltfjsx components.
Extend AI behaviors, add rockets / projectiles, particle effects, and scoring.
Profile & optimize for many entities (instancing, batching, worker threads for physics/AI).
Now the actual files I prepared:


README.md
# Space Station Auto-Battler (Prototype)

This repository is a starter/skeleton for a 3D team-vs-team auto-battler:
- 10 vs 10 humanoid robots (red vs blue)
- Procedurally-generated robot meshes (replaceable with glTF later via gltfjsx)
- Rapier physics via @react-three/rapier

SPEC.md
# Spec & Concept — Space Station Auto-Battler (10v10 prototype)

Overview
- Objective: A deterministic-feeling 3D auto-battler with two AI teams (red vs blue) fighting inside a space-station-like environment with shadows, lighting, lasers/guns/rockets and humanoid robots.
- Tech: TypeScript, React, react-three-fiber, @react-three/rapier, @react-three/drei, miniplex (ECS), zustand (state), vite, vitest, playwright, eslint, prettier.


package.json
{
  "name": "space-station-autobattler",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",

vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {

tsconfig.json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "Node",

.eslintrc.cjs
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true

.prettierrc
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100

src/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(

src/index.css
html, body, #root {
  height: 100%;
  margin: 0;
  background: #0b0f1a;
  color: #e6eef8;
  font-family: Inter, Arial, sans-serif;

src/App.tsx
import React from 'react'
import Scene from './components/Scene'
import useUI from './store/uiStore'

export default function App() {
  const { paused, togglePause } = useUI()

src/components/Scene.tsx
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import Simulation from './Simulation'


src/components/Simulation.tsx
import React, { useEffect } from 'react'
import { RigidBody, RigidBodyApi, RigidBodyProps } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createStore, createEntity } from 'miniplex'
import Robot from '../robots/RobotFactory'

src/robots/RobotFactory.tsx
import React, { useRef, useEffect } from 'react'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

type Props = {
  team: 'red' | 'blue'

src/store/uiStore.ts
import create from 'zustand'

type UIState = {
  paused: boolean
  togglePause: () => void
}

src/ecs/miniplexStore.ts
// Minimal example store export for possible later use
import { createStore } from 'miniplex'
export const store = createStore()
export default store


vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',

src/tests/setup.ts
// add any global test setup here


src/tests/Simulation.test.tsx
import { render, screen } from '@testing-library/react'
import App from '../App'
import React from 'react'

test('renders status text and button', () => {
  render(<App />)

playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'playwright/tests',
  webServer: {
    command: 'npm run dev',

playwright/tests/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('page loads and canvas exists', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('#status')).toContainText('Space Station')
Notes, next steps, and caveats

Replace procedural robots with gltf files and gltfjsx components when you have Blender exports. gltfjsx components will give you typed React components to drop into RobotFactory.
For rockets/projectiles: implement a projectile pool, spawn RigidBody with a high initial velocity and onCollision apply area damage. Use raycast checks for high-speed projectiles to avoid tunneling.
For more realistic visuals: use environment maps, SSAO, bloom (postprocessing) and a better HDRI lighting approach.
If you plan to scale beyond 50–100 dynamic entities, profile and consider instancing meshes and moving physics to a worker or server-authoritative simulation.
If you want, I can:

Push this skeleton to a GitHub repo for you (I can prepare a PR or commit if you give me repo details).
Replace the procedural robots with gltfjsx components from a provided GLB.
Add projectile system and basic firing visuals (laser beam hitscan + muzzle flash).
Harden the testing suite and add basic CI (GitHub Actions) to run Vitest and Playwright.
Which of the above would you like me to do next?