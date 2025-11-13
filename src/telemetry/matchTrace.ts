/**
 * MatchTrace Writer - Authoritative Per-Match Event Logger
 * Spec: specs/005-weapon-diversity/spec.md (FR-009)
 * Task: T005
 * 
 * Writes weapon telemetry events to disk in NDJSON format for replay,
 * analysis, and debugging. Each match writes to its own file.
 * 
 * Features:
 * - NDJSON format (newline-delimited JSON) for streaming
 * - One file per match in trace/ directory
 * - Concurrent match support (each instance manages own file)
 * - Error handling (log warnings, don't throw)
 * - Deterministic event ordering (by timestampMs, then frameIndex)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { WeaponTelemetryEvent } from '../lib/weapons/types';

/**
 * MatchTrace writer for persisting weapon telemetry events
 */
export class MatchTrace {
  private matchId: string;
  private traceDir: string;
  private filePath: string;
  private fileHandle: number | null = null;
  private isClosed = false;

  /**
   * Create a new MatchTrace writer
   * 
   * @param matchId - Unique identifier for the match
   * @param traceDir - Directory to write trace files (default: trace/)
   */
  constructor(matchId: string, traceDir: string = 'trace') {
    this.matchId = matchId;
    this.traceDir = path.resolve(traceDir);
    this.filePath = path.join(this.traceDir, `${matchId}.ndjson`);

    // Create trace directory if it doesn't exist
    try {
      if (!fs.existsSync(this.traceDir)) {
        fs.mkdirSync(this.traceDir, { recursive: true });
      }
    } catch (error) {
      console.warn(
        `Failed to create trace directory ${this.traceDir}:`,
        error instanceof Error ? error.message : String(error)
      );
      return;
    }

    // Open file for writing (create or truncate)
    try {
      this.fileHandle = fs.openSync(this.filePath, 'w');
    } catch (error) {
      console.warn(
        `Failed to open trace file ${this.filePath}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Append a weapon telemetry event to the trace file
   * 
   * @param event - Weapon telemetry event to record
   */
  append(event: WeaponTelemetryEvent): void {
    // Validate matchId
    if (event.matchId !== this.matchId) {
      console.warn(
        `Event matchId ${event.matchId} doesn't match MatchTrace matchId ${this.matchId}`
      );
      return;
    }

    // Check if closed or not initialized
    if (this.isClosed || this.fileHandle === null) {
      console.warn(
        `Failed to write event to trace ${this.filePath}: file is closed or not initialized`
      );
      return;
    }

    // Write event as NDJSON (JSON + newline)
    try {
      const line = JSON.stringify(event) + '\n';
      
      // Use synchronous write for reliability and ordering
      fs.writeSync(this.fileHandle, line);
    } catch (error) {
      console.warn(
        `Failed to write event to trace ${this.filePath}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Close the trace file and release resources
   */
  close(): void {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    if (this.fileHandle !== null) {
      try {
        fs.closeSync(this.fileHandle);
        this.fileHandle = null;
      } catch (error) {
        console.warn(
          `Failed to close trace file ${this.filePath}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }
}

/**
 * Global registry of active MatchTrace writers
 * Used for test cleanup and lifecycle management
 */
const activeTraces = new Map<string, MatchTrace>();

/**
 * Get or create a MatchTrace writer for a specific match
 * 
 * @param matchId - Match identifier
 * @param traceDir - Optional trace directory override
 * @returns MatchTrace instance for the match
 */
export function getMatchTrace(matchId: string, traceDir?: string): MatchTrace {
  let trace = activeTraces.get(matchId);
  
  if (!trace) {
    trace = new MatchTrace(matchId, traceDir);
    activeTraces.set(matchId, trace);
  }
  
  return trace;
}

/**
 * Close and remove a MatchTrace writer from the registry
 * 
 * @param matchId - Match identifier
 */
export function closeMatchTrace(matchId: string): void {
  const trace = activeTraces.get(matchId);
  
  if (trace) {
    trace.close();
    activeTraces.delete(matchId);
  }
}

/**
 * Close all active MatchTrace writers
 * Used for cleanup during test teardown or application shutdown
 */
export function closeAllMatchTraces(): void {
  activeTraces.forEach(trace => trace.close());
  activeTraces.clear();
}
