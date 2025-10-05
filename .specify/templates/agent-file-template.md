# [PROJECT NAME] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies
[EXTRACTED FROM ALL PLAN.MD FILES]

## Project Structure
```
[ACTUAL STRUCTURE FROM PLANS]
```

## Commands
[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

## Code Style
[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]

## Agentic AI Usage & Governance
When agents are used to automate development tasks, include a short section describing
what the agent is allowed to do and the human-in-the-loop controls in place. At minimum
record:

- Agent name and version.
- Privileges granted (read-only, can open PRs, can merge with approvals, can deploy).
- Audit/approval workflow (who receives notifications, how to revoke privileges).

Trigger events requiring a constitution review are described in the main constitution
(see `.specify/memory/constitution.md`). Agents that will create/merge PRs or change
infrastructure MUST be explicitly approved by maintainers and documented here.

## Recent Changes
[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->