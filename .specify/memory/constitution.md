<!--
SYNC IMPACT REPORT
- Version change: 1.0.1 → 1.1.0
- Modified principles:
  - Principle III (Size & Separation Limits): Added explicit path to issue tracking for violations
  - Principle II (Test-First TDD): Expanded with test organization and coverage guidance
  - Principle V (Observability): Updated target platform baselines to reflect current tooling
- Added sections:
  - New "Test Organization & Coverage" subsection under Principle II
  - Enhanced "Refactor plan guidance" with exemption marker examples
  - Added explicit "Target Platform Baselines" table in Principle V
  - New "LOC Violation Tracking" subsection for active exemptions
- Removed sections: none
- Repo references updated:
  - README.md → references updated to constitution v1.1.0
  - AGENTS.md → test coverage expectations aligned with expanded Principle II
  - .github/workflows/constitution_checks.yml → validated enforcement alignment
  - scripts/check_source_size.js → exemption marker validation confirmed
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ reviewed (structure validated)
  - .specify/templates/spec-template.md ✅ reviewed (test scenarios align)
  - .specify/templates/tasks-template.md ✅ reviewed (task structure validated)
  - .github/PULL_REQUEST_TEMPLATE/feature.md ✅ reviewed (CONSTITUTION-CHECK section complete)
- Follow-up TODOs:
  - ✅ Most large-file refactors completed (e.g., `world`, obstacle editor/spawner/inspector files have been split or reduced)
  - ⚠ Remaining: `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` (333 LOC)
    needs exemption or refactor per Principle III
  - ✅ Validate CI checks enforce updated principles
- Active LOC Exemptions & Refactor Backlog:
  - src/simulation/ai/pathfinding/integration/PathfindingSystem.ts (333 LOC) - NEEDS EXEMPTION or refactor
-->

# RobotSpaceBattler Constitution

## Core Principles

### I. Component & Library-First
Every new feature or game subsystem MUST be organized as a small, well-scoped component
or library. Components/libraries MUST be self-contained, expose a clear API, and include
unit and integration tests. Reuse is preferred over duplication; prefer composition over
inheritance. Libraries intended for sharing across features MUST include a short CLI or
scriptable interface for automation and testing where appropriate.

Rationale: Small, testable units improve reviewability, make incremental refactors safe,
and enable feature-level reuse across the project and pipelines.

### II. Test-First (TDD) — NON-NEGOTIABLE
All production-facing behavior MUST be driven by tests. The red-green-refactor cycle is
MANDATORY: write failing tests to lock expected behavior, implement to make tests pass,
then refactor. Tests MUST include unit tests for pure logic, component tests for UI, and
contract/integration tests for cross-system guarantees.

**Test Organization & Coverage Requirements**:

- Test files MUST be co-located or clearly mapped to source files:
  - Unit tests: `tests/` directory mirroring `src/` structure
  - Integration tests: `tests/integration/` for cross-system scenarios
  - E2E tests: `playwright/tests/` for user journey validation
  
- Test naming convention: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`

- Coverage expectations:
  - Core systems (ECS, AI, physics): ≥80% line coverage
  - UI components: ≥70% with meaningful interaction tests
  - Utility libraries: ≥90% for pure functions
  - Critical paths (combat, scoring, pathfinding): 100% branch coverage

- Test independence: Tests MUST NOT depend on execution order or shared mutable state.
  Use setup/teardown hooks and fixtures appropriately.

- Performance tests: Systems with defined performance targets (e.g., <16ms execution time)
  MUST include automated performance regression tests.

Rationale: TDD enforces clear requirements, prevents regressions, and keeps the codebase
maintainable as the project scales. Explicit coverage targets and organization standards
ensure tests remain valuable and maintainable.

### III. Size & Separation Limits
Source files MUST be easy to review. Individual source files MUST be kept under or equal
to 300 lines of code (LOC). If a file grows beyond 300 LOC a mandatory refactor workflow
must be followed. When an immediate refactor isn't possible (hotfix, experimental POC),
the author MUST open a short-term exemption issue that includes a migration plan and
target release for the refactor.

**LOC Violation Tracking**: The following files currently exceed 300 LOC and require
either refactor or exemption documentation (updated: 2025-12-22):

- `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` (333 LOC) - Pathfinding integration

Each file above MUST either: (a) receive a formal exemption with `CONSTITUTION-EXEMPT`
header and rationale within 1 release cycle, or (b) be refactored per guidance below.

Rationale: Limiting file size reduces cognitive load during code review, improves
reusability, and encourages small, focused changes. Tracking violations explicitly
ensures accountability and prevents accumulation of technical debt.

Enforcement steps when a file exceeds 300 LOC

1. The author MUST create a short PR or issue that includes:
   - The path(s) of the oversized file(s).
   - A one-paragraph explanation why the file exceeded 300 LOC.
   - A concrete refactor plan listing proposed modules/files to extract and the
     intended public API for each extraction.
   - At least one small test demonstrating the extracted boundary (pure function or
     behaviour) where feasible.
   - Reference to the GitHub issue tracking this refactor work.

2. The PR/issue MUST include one or more actionable tasks (2–4 hour chunks) tracked in
   the repo's task/spec system (for example under `specs/<n>/tasks`) with at least the
   first step marked as `in_progress` when work begins.

3. Reviewers MUST verify the `CONSTITUTION-CHECK` and the refactor plan. If the plan
   is not actionable or the file remains >300 LOC after review, the reviewer should
   request the file be converted into a refactor epic with a clear schedule.

Refactor plan guidance

- Split by responsibility: separate pure utilities, I/O, rendering, state, and
  orchestration into distinct modules.
- Preserve public API where possible by using internal modules and adding thin
  re-exporting facades during migration.
- Add unit tests for the extracted pure logic first, then integration tests for the
  composed behaviour.
- Keep commits small and reviewable: extract one cohesive part per PR.

**Exemption marker format**: Add to file header within first 30 lines:

```typescript
// CONSTITUTION-EXEMPT: [Brief justification]
// Exemption granted: [DATE] | Target refactor: [DATE or VERSION]
// Issue: #[ISSUE_NUMBER]
```

Example:
```typescript
// CONSTITUTION-EXEMPT: ECS world definitions require comprehensive entity types
// Exemption granted: 2025-12-21 | Target refactor: v0.2.0 or 2026-03-01
// Issue: #123
```

### IV. React & react-three-fiber (r3f) Best Practices
Front-end React code MUST follow modern React and r3f best practices:

- Use functional components and hooks; TypeScript is STRONGLY RECOMMENDED for all
  new modules.

- Separate rendering from simulation/physics: rendering components (r3f) SHOULD be pure
  renderers that consume state provided by hooks or systems; physics and authoritative
  state updates SHOULD live in dedicated systems or hooks and be tested separately.

- Keep the r3f render loop light: avoid heavy computations inside useFrame; prefer
  batched updates, instancing, or worker-based offloading for expensive tasks.

- Use memoization (React.memo, useMemo, useCallback) judiciously and document why a
  memoization prevents a performance regression.

- Prefer Drei utilities and stable, well-maintained helpers for common 3D patterns.

- Use Suspense and a loader abstraction for asset loading; ensure loader fallbacks are
  accessible and tested.

- For scenes with many repeated objects prefer GPU instancing and geometry/texture
  atlasing where appropriate.

Rationale: r3f allows powerful 3D rendering inside React; following these rules keeps
render performance predictable, tests isolated, and the codebase maintainable.

### V. Observability, Performance & Target Platforms

- Performance: Define and measure performance goals for interactive parts of the app
  (target 60 fps for critical gameplay paths where applicable). Use profiling tools to
  track regressions.

- Observability: Instrument critical systems with structured logs and expose metrics or
  traces for long-running simulations. Logging in hot loops MUST be rate-limited or
  guarded behind debug flags.

- Target Platforms & Baseline Configuration:

**Target Platform Baselines** (updated: 2025-12-21):

| Component   | Baseline        | Version | Rationale                                           |
| ----------- | --------------- | ------- | --------------------------------------------------- |
| Browser     | Chrome/Edge     | 120+    | Modern WebGL 2.0, ES2022, Web Workers support       |
| Node.js     | Active LTS      | 18+     | ESM support, native fetch, performance improvements |
| TypeScript  | Latest stable   | 5.9+    | Incremental compilation, decorator support          |
| React       | Latest stable   | 19.2+   | Concurrent features, Server Components ready        |
| Three.js    | Latest stable   | 0.182+  | WebGL 2.0 optimizations, r3f compatibility          |

  Front-end code MUST target modern Chromium-based browsers (Chrome and Edge) current
  stable releases as specified in the baseline table above. Update this baseline
  annually or when platform features used require newer releases. Polyfills or
  transpilation for legacy browsers MUST be justified in a spec and added as explicit
  build steps.

  All TypeScript code MUST compile with `strict: true` and target `esnext` module
  resolution with bundler-compatible output.

Rationale: Defining explicit target platforms and tool baselines reduces accidental
compatibility work, allows use of modern JS/DOM/WebGL features safely, and ensures
consistent development environments across the team.

### VI. Deprecation, Redundancy & Dependency Hygiene

- Deprecation policy: Mark deprecated files or APIs with a clear `DEPRECATED:` header in
  the file and add a matching issue/PR that documents the migration path. Deprecated
  items SHOULD be removed after one release cycle or a documented timeframe agreed by
  maintainers.

- Redundancy removal: Propose removal of outdated or duplicate code via a small PR that
  includes tests demonstrating equivalence or a migration guide for removed behavior.

- Dependency hygiene: Do not introduce transitive dependencies without review. Run
  dependency audits (`npm audit`, `pnpm audit`, or similar) regularly and patch or
  upgrade vulnerable packages promptly.

Rationale: A clear deprecation/removal workflow keeps the codebase healthy as features
and patterns evolve.

## Implementation Constraints & Standards

- Source files MUST be split into dedicated domains: `components/`, `hooks/`, `systems/`,
  `utils/`, `assets/`, and `scenes/` for 3D content. Keep rendering components small and
  delegate business logic, physics, and I/O to services or systems.

- UI and simulation MUST be tested under the same assumptions they run in production
  (e.g., WebGL contexts mocked or run headless in CI where feasible).

- All code that performs network I/O or file system operations MUST read secrets from
  environment variables or a secret store — never commit secrets to the repo.

## Development Workflow & Review Gates

- Every PR MUST include:

  - Tests that demonstrate the change (unit/integration/contract as appropriate).

  - A short changelog entry in the PR description when the change is user visible.

  - A `CONSTITUTION-CHECK` section listing how the change complies with the
    constitution principles (e.g., file size, TDD evidence, r3f rules followed).

- Code reviewers MUST verify `CONSTITUTION-CHECK` items and may request refactors to
  align with principles.

- Major architectural changes that relax or reinterpret a principle MUST be submitted
  as a constitution amendment (see Governance) rather than silently accepted.

## Agentic AI Usage Guidance

- Whenever an agent is granted automation privileges that can modify repository code,
  create PRs, or run deploys (for example: automated code-writing agents, CI bots with
  merge permissions, or task-executing agents), the constitution MUST be reviewed and
  amended if any gaps are found. Typical triggers that REQUIRE a constitution review:

  1. Granting agents commit or merge permissions.

  2. Agents beginning to create or approve PRs without human-in-the-loop by default.

  3. Agents having access to deploy or modify infrastructure.

  4. Integrating new agent platforms or tools that change the scope of automation.

- Review cadence: perform a governance review every 6 months, and immediately after
  any of the triggers above. The review should evaluate safety, authorization, auditing,
  and rollback controls for agentic operations.

Rationale: Agentic capabilities change risk and trust models — they must be explicitly
approved and governed.

## Governance

- Constitution supersedes other informal conventions. Amendments require a PR that:

  1. Describes the proposed textual change and rationale.

  2. Lists all impacted contracts/templates and a migration plan.

  3. Includes tests or validation scripts where applicable.

  4. Receives approval from at least two maintainers (or the maintainer group defined
     in `MAINTAINERS.md`).

- Versioning policy (semantic):

  - MAJOR: Backward-incompatible governance changes (removing or substantially
    redefining a principle). Requires migration plan and broader team approval.

  - MINOR: Addition of a principle or material expansion of guidance (e.g., new
    mandatory check). Requires at least two maintainer approvals.

  - PATCH: Wording clarifications, typos, or non-behavioral clarifications.

- Compliance: The `Constitution Check` in plan/spec/tasks templates MUST be updated to
  reflect changes in this document. CI or pre-merge checks SHOULD include a linter
  that validates new PRs for the `CONSTITUTION-CHECK` section and fails if absent.

**Active Constitution Enforcement**:

- `scripts/check_source_size.js` validates 300 LOC limit and exemption markers
- `.github/workflows/constitution_checks.yml` enforces checks on all PRs
- `scripts/check_pr_constitution_check.js` validates PR template compliance
- Constitution checks run on every push and pull request

**Version**: 1.1.0 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-12-22
