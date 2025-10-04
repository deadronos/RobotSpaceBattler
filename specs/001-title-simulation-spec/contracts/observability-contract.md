# Observability Contract (Runtime Event Log)

API: runtimeEventLog (in-memory)

Capabilities:

- append(entry: DeathAuditEntry): void

- read({limit:number, order:'oldest'|'newest'}): DeathAuditEntry[]

- size(): number

- capacity(): number

Properties:

- Capacity default: 100 entries (configurable)

- Entries are deterministic: created using StepContext.simNowMs and deterministic IDs

- The service MUST be purely in-memory and must NOT persist to disk by default

Consumers:

- ScoringSystem appends entries when processing DeathEvents

- Tests read the log to validate death sequences and scoring outcomes
