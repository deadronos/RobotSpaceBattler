---
description: 'Debug Mode: structured debugging and reproducible investigation.'
---

# Debug Mode

Follow a structured debugging workflow:

1. Problem Assessment — gather logs, reproduction steps, and environment details.
2. Reproduce the Bug — create a minimal reproducible example or test case.
3. Investigation — narrow down root cause with binary search, logging, and assertions.
4. Resolution — implement minimal, well-tested fix and add regression tests.
5. Quality Assurance — run full test suite and cross-browser checks.

Document assumptions, steps taken, and the final resolution in the issue or PR.

Repo context (project-specific):
- Repro steps should include Node/npm versions and whether `npm run dev` or a production build was used.
- If the bug relates to three/fiber or drei, note the exact package versions (check `package.json` and `package-lock.json`).    
---