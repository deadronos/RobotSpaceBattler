/**
 * EventIndex unit tests — Efficient event lookup functionality
 * Ensures O(1) timestamp queries and fast frame index searches
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EventIndex } from "../../../src/systems/matchTrace/eventIndex";
import type { MatchTraceEvent } from "../../../src/systems/matchTrace/types";
import { sampleEvents } from "./eventIndex.test.helpers";

describe("EventIndex", () => {
  let events: MatchTraceEvent[];
  let index: EventIndex;

  beforeEach(() => {
    // Use shared sample events from helper
    events = [...sampleEvents];
    index = new EventIndex(events);
  });

  describe("Construction and initialization", () => {
    it("should create index from events", () => {
      expect(index).toBeDefined();
    });

    it("should handle empty event array", () => {
      const emptyIndex = new EventIndex([]);
      expect(emptyIndex.getEventCount()).toBe(0);
      expect(emptyIndex.getMaxTimestamp()).toBe(0);
    });

    it("should build index for single event", () => {
      const singleEvent = [events[0]];
      const singleIndex = new EventIndex(singleEvent);
      expect(singleIndex.getEventCount()).toBe(1);
      expect(singleIndex.getMaxTimestamp()).toBe(0);
    });
  });

  describe("getEventsAtTimestamp", () => {
    it("should return events at exact timestamp", () => {
      const eventsAt100 = index.getEventsAtTimestamp(100);
      expect(eventsAt100).toHaveLength(2);
      expect(eventsAt100[0].type).toBe("move");
      expect(eventsAt100[1].type).toBe("fire");
    });

    it("should return single event at timestamp with one event", () => {
      const eventsAt0 = index.getEventsAtTimestamp(0);
      expect(eventsAt0).toHaveLength(1);
      expect(eventsAt0[0].type).toBe("spawn");
    });

    it("should return empty array for timestamp with no events", () => {
      const eventsAt150 = index.getEventsAtTimestamp(150);
      expect(eventsAt150).toHaveLength(0);
    });

    it("should return empty array for timestamp after all events", () => {
      const eventsAt999 = index.getEventsAtTimestamp(999);
      expect(eventsAt999).toHaveLength(0);
    });

    it("should return empty array for negative timestamp", () => {
      const eventsAtNegative = index.getEventsAtTimestamp(-100);
      expect(eventsAtNegative).toHaveLength(0);
    });
  });

  describe("findFrameIndexAtTimestamp", () => {
    it("should find index at exact event timestamp", () => {
      const frameAt0 = index.findFrameIndexAtTimestamp(0);
      expect(frameAt0).toBe(0);

      const frameAt100 = index.findFrameIndexAtTimestamp(100);
      expect(frameAt100).toBe(2); // Last event at timestamp 100

      const frameAt300 = index.findFrameIndexAtTimestamp(300);
      expect(frameAt300).toBe(4);
    });

    it("should find index between event timestamps", () => {
      const frameAt50 = index.findFrameIndexAtTimestamp(50);
      expect(frameAt50).toBe(0); // Still points to first event

      const frameAt150 = index.findFrameIndexAtTimestamp(150);
      expect(frameAt150).toBe(2); // Last event before 150

      const frameAt250 = index.findFrameIndexAtTimestamp(250);
      expect(frameAt250).toBe(3); // Last event before 250
    });

    it("should find index at start (timestamp 0)", () => {
      const frame = index.findFrameIndexAtTimestamp(0);
      expect(frame).toBe(0);
      expect(index.getAllEvents()[frame].type).toBe("spawn");
    });

    it("should handle timestamp after all events", () => {
      const frame = index.findFrameIndexAtTimestamp(1000);
      expect(frame).toBe(4); // Points to last event
    });

    it("should handle negative timestamp", () => {
      const frame = index.findFrameIndexAtTimestamp(-100);
      expect(frame).toBe(0); // Should still point to first valid index
    });

    it("should handle empty event list", () => {
      const emptyIndex = new EventIndex([]);
      const frame = emptyIndex.findFrameIndexAtTimestamp(100);
      expect(frame).toBe(0); // No events, returns 0
    });
  });

  describe("getMaxTimestamp", () => {
    it("should return last event timestamp", () => {
      const max = index.getMaxTimestamp();
      expect(max).toBe(300);
    });

    it("should return 0 for empty index", () => {
      const emptyIndex = new EventIndex([]);
      expect(emptyIndex.getMaxTimestamp()).toBe(0);
    });

    it("should return correct max for single event", () => {
      const singleIndex = new EventIndex([events[2]]);
      expect(singleIndex.getMaxTimestamp()).toBe(100);
    });
  });

  describe("getEventCount", () => {
    it("should return total event count", () => {
      expect(index.getEventCount()).toBe(5);
    });

    it("should return 0 for empty index", () => {
      const emptyIndex = new EventIndex([]);
      expect(emptyIndex.getEventCount()).toBe(0);
    });
  });

  describe("getAllEvents", () => {
    it("should return all events", () => {
      const allEvents = index.getAllEvents();
      expect(allEvents).toHaveLength(5);
      expect(allEvents[0].type).toBe("spawn");
      expect(allEvents[4].type).toBe("death");
    });

    it("should return events in order", () => {
      const allEvents = index.getAllEvents();
      for (let i = 0; i < allEvents.length - 1; i++) {
        expect(allEvents[i].timestampMs).toBeLessThanOrEqual(
          allEvents[i + 1].timestampMs,
        );
      }
    });
  });

  describe("rebuildIndex", () => {
    it("should rebuild index without affecting functionality", () => {
      // Verify initial state
      const eventsBefore = index.getEventsAtTimestamp(100);
      expect(eventsBefore).toHaveLength(2);

      // Rebuild
      index.rebuildIndex();

      // Verify same state after rebuild
      const eventsAfter = index.getEventsAtTimestamp(100);
      expect(eventsAfter).toHaveLength(2);
      expect(eventsAfter[0].type).toBe("move");
      expect(eventsAfter[1].type).toBe("fire");
    });

    it("should handle rebuild on empty index", () => {
      const emptyIndex = new EventIndex([]);
      expect(() => emptyIndex.rebuildIndex()).not.toThrow();
      expect(emptyIndex.getEventCount()).toBe(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle typical playback progression", () => {
      // Simulate playback: 0ms → 50ms → 100ms → 150ms → 300ms
      const frame0 = index.findFrameIndexAtTimestamp(0);
      expect(frame0).toBe(0);

      const frame50 = index.findFrameIndexAtTimestamp(50);
      expect(frame50).toBe(0); // Still at spawn

      const frame100 = index.findFrameIndexAtTimestamp(100);
      expect(frame100).toBe(2); // After both move and fire

      const frame150 = index.findFrameIndexAtTimestamp(150);
      expect(frame150).toBe(2); // Still after fire

      const frame300 = index.findFrameIndexAtTimestamp(300);
      expect(frame300).toBe(4); // At death event
    });

    it("should support event triggering at exact timestamps", () => {
      // At 100ms, two events should trigger
      const events100 = index.getEventsAtTimestamp(100);
      expect(events100).toHaveLength(2);

      // Verify they're in sequence order
      expect(events100[0].sequenceId).toBe(1);
      expect(events100[1].sequenceId).toBe(2);
    });

    it("should handle query sequence typical of replay", () => {
      // Seek to 50ms
      let frameIdx = index.findFrameIndexAtTimestamp(50);
      let atTimestamp = index.getEventsAtTimestamp(50);
      expect(frameIdx).toBe(0);
      expect(atTimestamp).toHaveLength(0);

      // Advance to 100ms
      frameIdx = index.findFrameIndexAtTimestamp(100);
      atTimestamp = index.getEventsAtTimestamp(100);
      expect(frameIdx).toBe(2);
      expect(atTimestamp).toHaveLength(2);

      // Advance to 300ms (end)
      frameIdx = index.findFrameIndexAtTimestamp(300);
      atTimestamp = index.getEventsAtTimestamp(300);
      expect(frameIdx).toBe(4);
      expect(atTimestamp).toHaveLength(1);
    });
  });

  describe("getEventsBefore", () => {
    it("should return empty array for timestamp before first event", () => {
      const eventsBefore = index.getEventsBefore(-10);
      expect(eventsBefore).toHaveLength(0);
    });

    it("should return all events up to timestamp (exclusive)", () => {
      const eventsBefore = index.getEventsBefore(99);
      expect(eventsBefore).toHaveLength(1); // Only first event at 0ms
    });

    it("should include events at exact timestamp (inclusive)", () => {
      const eventsBefore = index.getEventsBefore(100);
      expect(eventsBefore).toHaveLength(3); // Events at 0ms and two at 100ms
    });

    it("should return all events up to max timestamp", () => {
      const eventsBefore = index.getEventsBefore(300);
      expect(eventsBefore).toHaveLength(5); // All events
    });

    it("should maintain event order", () => {
      const eventsBefore = index.getEventsBefore(100);
      expect(eventsBefore[0].timestampMs).toBe(0);
      expect(eventsBefore[1].timestampMs).toBe(100);
      expect(eventsBefore[2].timestampMs).toBe(100);
    });
  });
});
