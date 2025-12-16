import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '@/App';
import * as worldModule from '@/ecs/world';
import * as machineModule from '@/runtime/state/matchStateMachine';
import * as telemetryModule from '@/runtime/simulation/telemetryAdapter';

// Hoist the mock function so it can be used in the mock factory
const { mockRunnerReset } = vi.hoisted(() => ({
  mockRunnerReset: vi.fn(),
}));

// Mock Simulation component as it uses Canvas
vi.mock('@/components/Simulation', () => ({
  Simulation: ({ onRunnerReady }: { onRunnerReady: (runner: any) => void }) => {
    // Simulate the runner being ready immediately
    onRunnerReady({ reset: mockRunnerReset });
    return <div data-testid="simulation-mock" />;
  },
}));

// Mock other sub-components to avoid complexity
vi.mock('@/components/debug/ObstacleEditor', () => ({ ObstacleEditor: () => null }));
vi.mock('@/components/debug/ObstacleSpawner', () => ({ ObstacleSpawner: () => null }));
vi.mock('@/components/debug/PerfToggles', () => ({ PerfToggles: () => null }));
vi.mock('@/components/ui/SettingsModal', () => ({
  SettingsModal: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div data-testid="settings-modal" /> : null
  ),
}));

describe('App Keyboard Shortcuts', () => {
  let mockPause: ReturnType<typeof vi.fn>;
  let mockResume: ReturnType<typeof vi.fn>;
  let mockReset: ReturnType<typeof vi.fn>;
  let mockGetSnapshot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset the hoisted mock
    mockRunnerReset.mockClear();

    // Mock createBattleWorld
    vi.spyOn(worldModule, 'createBattleWorld').mockReturnValue({
      robots: { entities: [] },
      world: { add: vi.fn(), remove: vi.fn() },
      obstacles: { entities: [] },
    } as any);

    // Mock createTelemetryPort
    vi.spyOn(telemetryModule, 'createTelemetryPort').mockReturnValue({} as any);

    // Mock createMatchStateMachine
    mockPause = vi.fn();
    mockResume = vi.fn();
    mockReset = vi.fn(); // This is the machine reset, which might not be called directly
    mockGetSnapshot = vi.fn().mockReturnValue({
      phase: 'running',
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
    });

    vi.spyOn(machineModule, 'createMatchStateMachine').mockReturnValue({
      start: vi.fn(),
      pause: mockPause as any,
      resume: mockResume as any,
      reset: mockReset as any,
      declareVictory: vi.fn(),
      tick: vi.fn(),
      getSnapshot: mockGetSnapshot as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers pause when Space is pressed while running', () => {
    mockGetSnapshot.mockReturnValue({ phase: 'running', elapsedMs: 0, restartTimerMs: null, winner: null });
    render(<App />);

    fireEvent.keyDown(window, { key: ' ' });

    expect(mockPause).toHaveBeenCalled();
  });

  it('triggers resume when Space is pressed while paused', () => {
    mockGetSnapshot.mockReturnValue({ phase: 'paused', elapsedMs: 0, restartTimerMs: null, winner: null });
    render(<App />);

    fireEvent.keyDown(window, { key: ' ' });

    expect(mockResume).toHaveBeenCalled();
  });

  it('triggers reset when R is pressed', () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'r' });

    expect(mockRunnerReset).toHaveBeenCalled();
  });

  it('triggers reset when R is pressed (upper case)', () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'R' });

    expect(mockRunnerReset).toHaveBeenCalled();
  });

  it('ignores repeated keydown events (key hold)', () => {
    mockGetSnapshot.mockReturnValue({
      phase: 'running',
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
    });
    render(<App />);

    fireEvent.keyDown(window, { key: ' ', repeat: true });

    expect(mockPause).not.toHaveBeenCalled();
  });

  it('does not trigger shortcuts when typing in an input', () => {
    mockGetSnapshot.mockReturnValue({
      phase: 'running',
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
    });
    render(
      <div>
        <App />
        <input data-testid="test-input" />
      </div>
    );

    const input = screen.getByTestId('test-input');
    input.focus();

    // Fire event on the input, which bubbles to window
    fireEvent.keyDown(input, { key: ' ', bubbles: true });

    expect(mockPause).not.toHaveBeenCalled();
  });

  it('does not trigger shortcuts when SettingsModal is open', () => {
    render(<App />);

    // Open settings
    const settingsButton = screen.getByLabelText('Open settings');
    fireEvent.click(settingsButton);

    // Check if modal is open (mocked component)
    expect(screen.getByTestId('settings-modal')).toBeDefined();

    // Try shortcuts
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'r' });

    expect(mockPause).not.toHaveBeenCalled();
    expect(mockRunnerReset).not.toHaveBeenCalled();
  });
});
