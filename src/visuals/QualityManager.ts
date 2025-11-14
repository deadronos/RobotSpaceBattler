export type QualityProfile = "high" | "medium" | "low";

export interface QualitySettings {
  showBeams: boolean;
  showTracers: boolean;
  showExplosions: boolean;
  particleDensity: number;
  beamLineWidth: number;
  tracerLineWidth: number;
}

const QUALITY_PRESETS: Record<QualityProfile, QualitySettings> = {
  high: {
    showBeams: true,
    showTracers: true,
    showExplosions: true,
    particleDensity: 1,
    beamLineWidth: 0.25,
    tracerLineWidth: 0.18,
  },
  medium: {
    showBeams: true,
    showTracers: true,
    showExplosions: true,
    particleDensity: 0.6,
    beamLineWidth: 0.18,
    tracerLineWidth: 0.12,
  },
  low: {
    showBeams: true,
    showTracers: false,
    showExplosions: true,
    particleDensity: 0.35,
    beamLineWidth: 0.1,
    tracerLineWidth: 0.08,
  },
};

export class QualityManager {
  private profile: QualityProfile = "high";
  private listeners = new Set<(settings: QualitySettings) => void>();

  getSettings(): QualitySettings {
    return { ...QUALITY_PRESETS[this.profile] };
  }

  setProfile(profile: QualityProfile): void {
    if (profile === this.profile) {
      return;
    }

    this.profile = profile;
    const settings = this.getSettings();
    this.listeners.forEach((listener) => listener(settings));
  }

  onChange(callback: (settings: QualitySettings) => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }
}
