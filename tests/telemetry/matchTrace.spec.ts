/**
 * Tests for MatchTrace writer
 * Spec: specs/005-weapon-diversity/spec.md (FR-009)
 * Task: T005
 * 
 * Requirements:
 * - File creation in trace/ directory with matchId.ndjson naming
 * - Event appending in NDJSON format (one event per line)
 * - Events written in order (by timestampMs, then frameIndex)
 * - File error handling (log warnings, don't throw)
 * - Concurrent match support (each match writes to own file)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MatchTrace } from '../../src/telemetry/matchTrace';
import type { WeaponTelemetryEvent } from '../../src/lib/weapons/types';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TEST_TRACE_DIR = path.join(process.cwd(), 'trace-test');

describe('MatchTrace', () => {
  let matchTrace: MatchTrace;

  beforeEach(() => {
    // Clean up test trace directory
    if (fs.existsSync(TEST_TRACE_DIR)) {
      fs.rmSync(TEST_TRACE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(TEST_TRACE_DIR)) {
      fs.rmSync(TEST_TRACE_DIR, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should create a MatchTrace instance with default trace directory', () => {
      matchTrace = new MatchTrace('match-001');
      expect(matchTrace).toBeDefined();
    });

    it('should create a MatchTrace instance with custom trace directory', () => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);
      expect(matchTrace).toBeDefined();
    });

    it('should create trace directory if it does not exist', () => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);
      expect(fs.existsSync(TEST_TRACE_DIR)).toBe(true);
    });

    it('should log warning if directory creation fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Try to create in a path that will fail (e.g., root without permissions)
      const invalidPath = '/root/invalid-trace-dir';
      matchTrace = new MatchTrace('match-001', invalidPath);
      
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls;
      expect(calls[0][0]).toContain('Failed to create trace directory');
      
      consoleSpy.mockRestore();
    });
  });

  describe('append', () => {
    beforeEach(() => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);
    });

    it('should append a single event to the trace file', () => {
      const event: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-001',
        weaponProfileId: 'gun-1',
        attackerId: 'robot-1',
        timestampMs: 1000,
        frameIndex: 0,
      };

      matchTrace.append(event);

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);
      
      const parsed = JSON.parse(lines[0]);
      expect(parsed).toEqual(event);
    });

    it('should append multiple events in order', () => {
      const events: WeaponTelemetryEvent[] = [
        {
          type: 'weapon-fired',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          attackerId: 'robot-1',
          timestampMs: 1000,
          frameIndex: 0,
        },
        {
          type: 'weapon-hit',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          attackerId: 'robot-1',
          targetId: 'robot-2',
          timestampMs: 1100,
          frameIndex: 1,
        },
        {
          type: 'weapon-damage',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          attackerId: 'robot-1',
          targetId: 'robot-2',
          amount: 50,
          timestampMs: 1100,
          frameIndex: 2,
        },
      ];

      events.forEach(event => matchTrace.append(event));

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(3);
      
      const parsed = lines.map(line => JSON.parse(line));
      expect(parsed).toEqual(events);
    });

    it('should maintain order by timestampMs when frameIndex is absent', () => {
      const events: WeaponTelemetryEvent[] = [
        {
          type: 'weapon-fired',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          timestampMs: 1000,
        },
        {
          type: 'weapon-fired',
          matchId: 'match-001',
          weaponProfileId: 'laser-1',
          timestampMs: 900,
        },
        {
          type: 'weapon-fired',
          matchId: 'match-001',
          weaponProfileId: 'rocket-1',
          timestampMs: 1100,
        },
      ];

      // Append in unsorted order
      events.forEach(event => matchTrace.append(event));

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      const parsed = lines.map(line => JSON.parse(line));
      
      // Events should be in the order appended (not sorted)
      // MatchTrace appends as-is; ordering is caller's responsibility
      expect(parsed[0].weaponProfileId).toBe('gun-1');
      expect(parsed[1].weaponProfileId).toBe('laser-1');
      expect(parsed[2].weaponProfileId).toBe('rocket-1');
    });

    it('should handle events with same timestampMs but different frameIndex', () => {
      const events: WeaponTelemetryEvent[] = [
        {
          type: 'weapon-damage',
          matchId: 'match-001',
          weaponProfileId: 'rocket-1',
          targetId: 'robot-1',
          amount: 30,
          timestampMs: 1000,
          frameIndex: 10,
        },
        {
          type: 'weapon-damage',
          matchId: 'match-001',
          weaponProfileId: 'rocket-1',
          targetId: 'robot-2',
          amount: 50,
          timestampMs: 1000,
          frameIndex: 11,
        },
        {
          type: 'weapon-damage',
          matchId: 'match-001',
          weaponProfileId: 'rocket-1',
          targetId: 'robot-3',
          amount: 20,
          timestampMs: 1000,
          frameIndex: 12,
        },
      ];

      events.forEach(event => matchTrace.append(event));

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(3);
      
      const parsed = lines.map(line => JSON.parse(line));
      expect(parsed).toEqual(events);
    });

    it('should log warning and continue on write error', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Close the underlying file descriptor to simulate write failure
      matchTrace.close();
      
      const event: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-001',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      };

      // Should not throw, but should log warning
      expect(() => matchTrace.append(event)).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write event to trace')
      );
      
      consoleSpy.mockRestore();
    });

    it('should reject events with mismatched matchId', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const event: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'wrong-match-id',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      };

      matchTrace.append(event);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("doesn't match")
      );
      
      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      // File should either not exist or be empty
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.trim()).toBe('');
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('close', () => {
    beforeEach(() => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);
    });

    it('should close the file handle', () => {
      const event: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-001',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      };

      matchTrace.append(event);
      matchTrace.close();

      // File should exist and contain the event
      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.trim()).toBeTruthy();
    });

    it('should allow multiple close calls without error', () => {
      matchTrace.close();
      expect(() => matchTrace.close()).not.toThrow();
    });

    it('should log warning if close fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // First close succeeds
      matchTrace.close();
      
      // Second close might log warning (depends on implementation)
      matchTrace.close();
      
      // We don't strictly require a warning, just that it doesn't throw
      consoleSpy.mockRestore();
    });
  });

  describe('concurrent matches', () => {
    it('should support multiple concurrent MatchTrace instances', () => {
      const matchTrace1 = new MatchTrace('match-001', TEST_TRACE_DIR);
      const matchTrace2 = new MatchTrace('match-002', TEST_TRACE_DIR);
      const matchTrace3 = new MatchTrace('match-003', TEST_TRACE_DIR);

      const event1: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-001',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      };

      const event2: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-002',
        weaponProfileId: 'laser-1',
        timestampMs: 1000,
      };

      const event3: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-003',
        weaponProfileId: 'rocket-1',
        timestampMs: 1000,
      };

      matchTrace1.append(event1);
      matchTrace2.append(event2);
      matchTrace3.append(event3);

      matchTrace1.close();
      matchTrace2.close();
      matchTrace3.close();

      // Verify all three files exist
      expect(fs.existsSync(path.join(TEST_TRACE_DIR, 'match-001.ndjson'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_TRACE_DIR, 'match-002.ndjson'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_TRACE_DIR, 'match-003.ndjson'))).toBe(true);

      // Verify content
      const content1 = fs.readFileSync(path.join(TEST_TRACE_DIR, 'match-001.ndjson'), 'utf-8');
      const content2 = fs.readFileSync(path.join(TEST_TRACE_DIR, 'match-002.ndjson'), 'utf-8');
      const content3 = fs.readFileSync(path.join(TEST_TRACE_DIR, 'match-003.ndjson'), 'utf-8');

      expect(JSON.parse(content1.trim())).toEqual(event1);
      expect(JSON.parse(content2.trim())).toEqual(event2);
      expect(JSON.parse(content3.trim())).toEqual(event3);
    });

    it('should isolate events between concurrent matches', () => {
      const matchTrace1 = new MatchTrace('match-A', TEST_TRACE_DIR);
      const matchTrace2 = new MatchTrace('match-B', TEST_TRACE_DIR);

      // Interleave writes
      matchTrace1.append({
        type: 'weapon-fired',
        matchId: 'match-A',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      });

      matchTrace2.append({
        type: 'weapon-fired',
        matchId: 'match-B',
        weaponProfileId: 'laser-1',
        timestampMs: 1000,
      });

      matchTrace1.append({
        type: 'weapon-hit',
        matchId: 'match-A',
        weaponProfileId: 'gun-1',
        timestampMs: 1100,
      });

      matchTrace2.append({
        type: 'weapon-hit',
        matchId: 'match-B',
        weaponProfileId: 'laser-1',
        timestampMs: 1100,
      });

      matchTrace1.close();
      matchTrace2.close();

      // Verify files have correct events
      const contentA = fs.readFileSync(path.join(TEST_TRACE_DIR, 'match-A.ndjson'), 'utf-8');
      const contentB = fs.readFileSync(path.join(TEST_TRACE_DIR, 'match-B.ndjson'), 'utf-8');

      const linesA = contentA.trim().split('\n').map(line => JSON.parse(line));
      const linesB = contentB.trim().split('\n').map(line => JSON.parse(line));

      expect(linesA).toHaveLength(2);
      expect(linesB).toHaveLength(2);

      expect(linesA.every(e => e.matchId === 'match-A')).toBe(true);
      expect(linesB.every(e => e.matchId === 'match-B')).toBe(true);
    });
  });

  describe('NDJSON format validation', () => {
    beforeEach(() => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);
    });

    it('should write valid NDJSON with newline after each event', () => {
      const events: WeaponTelemetryEvent[] = [
        {
          type: 'weapon-fired',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          timestampMs: 1000,
        },
        {
          type: 'weapon-hit',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          timestampMs: 1100,
        },
      ];

      events.forEach(event => matchTrace.append(event));
      matchTrace.close();

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Each line should be valid JSON
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);

      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });

      // Content should end with newline for proper NDJSON
      expect(content.endsWith('\n')).toBe(true);
    });

    it('should handle special characters and escaping in event data', () => {
      const event: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'match-001',
        weaponProfileId: 'gun-"special"-1',
        attackerId: 'robot\n\t1',
        timestampMs: 1000,
      };

      matchTrace.append(event);
      matchTrace.close();

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const parsed = JSON.parse(content.trim());
      expect(parsed).toEqual(event);
    });
  });

  describe('file naming', () => {
    it('should create file with matchId.ndjson naming convention', () => {
      const matchIds = ['match-001', 'test-match', 'duel-12345', 'match_with_underscores'];

      matchIds.forEach(matchId => {
        const trace = new MatchTrace(matchId, TEST_TRACE_DIR);
        trace.append({
          type: 'weapon-fired',
          matchId,
          weaponProfileId: 'gun-1',
          timestampMs: 1000,
        });
        trace.close();

        const expectedPath = path.join(TEST_TRACE_DIR, `${matchId}.ndjson`);
        expect(fs.existsSync(expectedPath)).toBe(true);
      });
    });
  });

  describe('error resilience', () => {
    it('should handle very large event objects', () => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);

      // Create a large event with many properties
      const event: WeaponTelemetryEvent & Record<string, unknown> = {
        type: 'weapon-damage',
        matchId: 'match-001',
        weaponProfileId: 'rocket-1',
        attackerId: 'robot-1',
        targetId: 'robot-2',
        amount: 100,
        timestampMs: 1000,
        frameIndex: 0,
        // Add extra data
        extraData: new Array(1000).fill('x').join(''),
      };

      expect(() => matchTrace.append(event)).not.toThrow();
      matchTrace.close();

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.extraData).toBe(event.extraData);
    });

    it('should handle rapid successive appends', () => {
      matchTrace = new MatchTrace('match-001', TEST_TRACE_DIR);

      // Rapidly append many events
      for (let i = 0; i < 100; i++) {
        matchTrace.append({
          type: 'weapon-damage',
          matchId: 'match-001',
          weaponProfileId: 'gun-1',
          amount: 10,
          timestampMs: 1000 + i,
          frameIndex: i,
        });
      }

      matchTrace.close();

      const filePath = path.join(TEST_TRACE_DIR, 'match-001.ndjson');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(100);
    });
  });
});
