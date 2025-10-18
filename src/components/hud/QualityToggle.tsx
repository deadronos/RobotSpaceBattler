/**
 * QualityToggle Component — Visual Quality Selection UI (T029, US2)
 *
 * React component for toggling visual quality profiles during battle.
 * Displays radio buttons for High/Medium/Low quality selection.
 * Integrates with useVisualQuality hook for state management.
 *
 * Usage:
 *   <QualityToggle />
 */

import { useVisualQuality } from '../../hooks/useVisualQuality';
import { VisualQualityLevel } from '../../systems/matchTrace/types';

const QUALITY_OPTIONS: Array<{ level: VisualQualityLevel; label: string }> = [
  { level: VisualQualityLevel.High, label: 'High' },
  { level: VisualQualityLevel.Medium, label: 'Medium' },
  { level: VisualQualityLevel.Low, label: 'Low' },
];

export function QualityToggle() {
  const { qualityLevel, setQualityLevel } = useVisualQuality();

  const handleQualityChange = (newLevel: VisualQualityLevel) => {
    setQualityLevel(newLevel);
  };

  return (
    <fieldset className="quality-toggle">
      <legend className="quality-toggle__legend">Visual Quality</legend>
      <div className="quality-toggle__options">
        {QUALITY_OPTIONS.map(({ level, label }) => (
          <label
            key={level}
            className={`quality-toggle__option ${
              qualityLevel === level ? 'quality-toggle__option--active' : ''
            }`}
          >
            <input
              type="radio"
              name="quality"
              value={level}
              checked={qualityLevel === level}
              onChange={() => handleQualityChange(level)}
              className="quality-toggle__input"
              aria-label={`${label} quality`}
            />
            <span className="quality-toggle__label">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default QualityToggle;
