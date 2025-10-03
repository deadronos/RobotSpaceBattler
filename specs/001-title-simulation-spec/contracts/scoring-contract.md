# Scoring System Contract

Path: specs/001-title-simulation-spec/contracts/scoring-contract.md

Input: DeathEvent

- victimId: string
- killerId?: string
- victimTeam: string|number
- killerTeam?: string|number
- damageSource: string (weapon id)
- simNowMs: number
- frameCount: number

Behavior (ScoringSystem):

- Consume DeathEvent(s) in deterministic order.

- Classify each death as: 'opponent' | 'friendly-fire' | 'suicide'.

- Apply score updates:
  - opponent: +1 to victim's opponent team
  - friendly-fire: -1 to attacker/team of killer
  - suicide: -1 to killer's team

- Produce Audit Entry (DeathAuditEntry) and append to runtime event log.

- Output: ScoreUpdate events and appended AuditEntry.

Deterministic guarantees:

- Processing order documented and reproducible (for example, sorted by event.timestamp
  or ascending event.id).

- All timestamps must come from StepContext.simNowMs.

- Score deltas are deterministic and serializable.
