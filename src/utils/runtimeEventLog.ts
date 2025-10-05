/**
 * Runtime event log ring buffer implementation.
 */

export type DeathClassification = "opponent" | "friendly-fire" | "suicide";

export interface DeathAuditEntry {
  id: string;
  simNowMs: number;
  frameCount: number;
  victimId: string;
  killerId?: string;
  victimTeam: string | number;
  killerTeam?: string | number;
  classification: DeathClassification;
  scoreDelta: number;
}

export interface RuntimeEventLog {
  append(entry: DeathAuditEntry): void;
  read(options?: { order?: "oldest-first" | "newest-first" }): DeathAuditEntry[];
  size(): number;
  capacity(): number;
  clear(): void;
}

export function createRuntimeEventLog(
  config: { capacity?: number } = {},
): RuntimeEventLog {
  const capacity = Math.max(1, config.capacity ?? 100);
  const buffer: Array<DeathAuditEntry | undefined> = new Array(capacity);
  let head = 0; // points to next slot to write
  let count = 0;

  function append(entry: DeathAuditEntry) {
    buffer[head] = entry;
    head = (head + 1) % capacity;
    if (count < capacity) {
      count++;
    }
  }

  function read(options?: {
    order?: "oldest-first" | "newest-first";
  }): DeathAuditEntry[] {
    if (count === 0) return [];
    const order = options?.order ?? "oldest-first";
    const entries: DeathAuditEntry[] = [];

    if (order === "oldest-first") {
      const start = count === capacity ? head : 0;
      for (let i = 0; i < count; i++) {
        const index = (start + i) % capacity;
        const entry = buffer[index];
        if (entry) entries.push(entry);
      }
    } else {
      // newest-first
      for (let i = 0; i < count; i++) {
        const index = (head - 1 - i + capacity) % capacity;
        const entry = buffer[index];
        if (entry) entries.push(entry);
      }
    }

    return entries;
  }

  function clear() {
    head = 0;
    count = 0;
    buffer.fill(undefined);
  }

  return {
    append,
    read,
    size: () => count,
    capacity: () => capacity,
    clear,
  };
}
