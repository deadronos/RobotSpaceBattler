import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { toNDJSON, canonicalJSONStringify } from './serialization';
import type { DeathAuditEntry } from './runtimeEventLog';

export type GoldenTraceParts = {
  events?: DeathAuditEntry[];
  projectilesNDJSON?: string; // already persisted NDJSON lines for projectiles
  entitySnapshots?: unknown[];
};

export function buildCombinedTrace(parts: GoldenTraceParts): string {
  const sections: string[] = [];

  if (parts.events && parts.events.length > 0) {
    sections.push(toNDJSON(parts.events as unknown[]));
  }

  if (typeof parts.projectilesNDJSON === 'string' && parts.projectilesNDJSON.length > 0) {
    // projectilesNDJSON is already NDJSON; ensure stable newline endings
    sections.push(parts.projectilesNDJSON.trim());
  }

  if (parts.entitySnapshots && parts.entitySnapshots.length > 0) {
    sections.push(toNDJSON(parts.entitySnapshots));
  }

  // Join with a canonical separator so consumers can split into sections
  return sections.join('\n---\n');
}

export function writeGoldenTrace(outputDir: string, name: string, combinedTrace: string) {
  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, `${name}.ndjson`);
  writeFileSync(outPath, combinedTrace, { encoding: 'utf8' });
  return outPath;
}

export function readGoldenTrace(filePath: string) {
  return readFileSync(filePath, { encoding: 'utf8' });
}

export function compareWithGolden(filePath: string, combinedTrace: string) {
  const golden = readGoldenTrace(filePath);
  return golden === combinedTrace;
}

export function canonicalizeForTracing(obj: unknown) {
  // Expose canonical stringify for convenience
  return canonicalJSONStringify(obj);
}
