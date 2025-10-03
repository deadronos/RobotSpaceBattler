# Spec & Concept — (Spec Kit authoritative)

---

This repository has moved to the Spec Kit workflow. The canonical, authoritative specification
and governance documents now live in the `.specify/` folder. Please consult the following files
first when making architecture or process changes:

- `.specify/memory/constitution.md` — the project Constitution (core principles, governance).
- `.specify/templates/` — spec, plan, and task templates used for Spec Kit processes.
- `.specify/` (other subfolders) — active specs, plans, and tasks maintained by the team.

The previous `SPEC.md` content has been archived in `legacy.spec.md` for historical reference.
If you need details that were present in the earlier spec (component shapes, system notes, design
guidance), consult `legacy.spec.md` which contains the full snapshot copied on 2025-10-03.

If you are updating system responsibilities, component contracts, or core simulation behavior, update
the relevant `.specify/` spec or plan and reference the Constitution for governance and acceptance
criteria. Follow the Constitution's amendment procedure for any governance-level changes.

---

Quick pointers

- For runtime conventions and system boundaries, see `SPEC.md` legacy copy at `legacy.spec.md`.
- For governance and required practices (TDD, physics-first authority, deterministic simulation),
  see `.specify/memory/constitution.md`.
- For templates and task flow, use files in `.specify/templates/` and create a spec/plan there to
  document any non-trivial changes.

---

**Version**: 1.1.0 | **Ratified**: 2025-10-03
