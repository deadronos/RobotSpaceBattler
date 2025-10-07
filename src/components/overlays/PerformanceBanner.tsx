export interface PerformanceBannerProps {
  visible: boolean;
  fps: number;
  targetFps: number;
  qualityScalingActive: boolean;
  autoScalingEnabled: boolean;
  message: string;
  onDismiss: () => void;
  onToggleAutoScaling: (enabled: boolean) => void;
}

export function PerformanceBanner({
  visible,
  fps,
  targetFps,
  qualityScalingActive,
  autoScalingEnabled,
  message,
  onDismiss,
  onToggleAutoScaling,
}: PerformanceBannerProps) {
  if (!visible) {
    return null;
  }

  const handleToggle = () => {
    onToggleAutoScaling(!autoScalingEnabled);
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Performance warning"
      className="performance-banner"
    >
      <div className="performance-banner__content">
        <strong>{Math.round(fps)} FPS</strong>
        <span className="performance-banner__target">Target {targetFps} FPS</span>
        {qualityScalingActive ? (
          <span className="performance-banner__scaling">
            Quality scaling status: active
          </span>
        ) : null}
        <p>{message}</p>
      </div>

      <div className="performance-banner__controls">
        <label>
          <input
            type="checkbox"
            aria-label="Auto quality scaling"
            checked={autoScalingEnabled}
            onChange={handleToggle}
          />
          Auto quality scaling
        </label>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}

export default PerformanceBanner;
