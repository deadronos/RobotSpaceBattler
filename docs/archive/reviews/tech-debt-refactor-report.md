# Tech Debt Refactor Report

This report identifies five code paths in the RobotSpaceBattler project that could be simplified, refactored, and split into different modules to improve code quality, maintainability, and scalability.

## 1. `App.tsx`: Monolithic Layout Component

- **Description:** The `App` component is responsible for the entire application layout, including the main grid, sidebar, header, and scene wrapper. It also fetches initial data and manages the HUD's visibility.
- **Reason for refactoring:** This component mixes layout, state management, and component composition. The inline styles make it hard to read and maintain. It should be broken down into smaller, reusable layout components. The styling should be extracted into a separate CSS file or a CSS-in-JS solution.
- **Simplification Rating:** 80%
- **Effort Estimation:** Medium

## 2. `Simulation.tsx`: God Component

- **Description:** The `Simulation` component is a "god component" that does too much. It manages the game loop, sets up the ECS world, handles game state transitions (paused, victory, restart), and renders the main Three.js scene with physics.
- **Reason for refactoring:** This component is violating the single-responsibility principle. The game loop logic, world setup, and state management should be extracted into separate hooks or modules. The rendering part should be a more "dumb" component that just receives data and renders it.
- **Simplification Rating:** 90%
- **Effort Estimation:** High

## 3. `aiSystem.ts`: Complex AI Logic

- **Description:** The `updateAiSystem` function contains complex AI logic for target selection (`findClosestEnemy`, `pickCaptainTarget`) and behavior switching (seek, retreat, engage).
- **Reason for refactoring:** The AI logic is tangled. The target selection and behavior logic should be separated into smaller, more focused functions. The state machine for the AI (`mode`) could be made more explicit and manageable. This would make it easier to add new behaviors or tweak existing ones.
- **Simplification Rating:** 70%
- **Effort Estimation:** Medium

## 4. `weaponSystem.ts`: Multiple Responsibilities

- **Description:** This file contains two systems: `updateWeaponSystem` and `updateProjectileSystem`. The first one handles firing projectiles, and the second one handles projectile movement and collision.
- **Reason for refactoring:** These are two distinct responsibilities and should be in separate files. `updateProjectileSystem` also has a nested loop for collision detection which can be inefficient. The collision detection logic could be optimized and extracted into a separate module.
- **Simplification Rating:** 60%
- **Effort Estimation:** Medium

## 5. `Robots.tsx`: Bloated Rendering Component

- **Description:** The `Robots` component is responsible for rendering all the robots in the scene. The `RobotActor` component contains a lot of hardcoded `three.js` object creation and material setup. It also has its own `useFrame` for animations.
- **Reason for refactoring:** The `RobotActor` component is not very reusable and is tightly coupled to the `RobotEntity` data structure. The `three.js` geometry and material creation could be extracted into separate components or helper functions. The animation logic could be moved to a separate system or hook to decouple it from the rendering component. The `useEffect` with `setInterval` in the `Robots` component is not an efficient way to update the entities. It should be integrated with the main game loop.
- **Simplification Rating:** 85%
- **Effort Estimation:** High
