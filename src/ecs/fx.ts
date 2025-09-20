export type FxType = "hitFlash" | "impactParticles" | "explosion";

export interface FxComponent {
  type: FxType;
  ttl: number; // total lifetime in seconds
  age: number; // accumulated lifetime in seconds
  color?: string; // hex or named color for simple visuals
  size?: number; // base size for visuals
  intensity?: number; // optional extra for shaders/effects
}
