import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { ReactNode } from "react";

export const POSTPROCESSING_PRESETS = {
  low: {
    multisampling: 8,
    bloomIntensity: 0.9,
    bloomRadius: 0.35,
    bloomThreshold: 1.35,
    bloomMipmapBlur: false,
    chromaticAberration: false,
    chromaticOffset: [0.001, 0.001] as [number, number],
  },
  high: {
    multisampling: 8,
    bloomIntensity: 1.2,
    bloomRadius: 0.5,
    bloomThreshold: 1.2,
    bloomMipmapBlur: false,
    chromaticAberration: true,
    chromaticOffset: [0.0012, 0.0012] as [number, number],
  },
} as const;

export type QualityPreset = keyof typeof POSTPROCESSING_PRESETS;

interface PostProcessingProps {
  enabled: boolean;
  quality: QualityPreset;
}

export function PostProcessing({ enabled, quality }: PostProcessingProps) {
  if (!enabled) {
    return null;
  }

  const preset = POSTPROCESSING_PRESETS[quality];

  return (
    <EffectComposer
      enableNormalPass={false}
      multisampling={preset.multisampling}
    >
      <Bloom
        key="bloom"
        luminanceThreshold={preset.bloomThreshold}
        mipmapBlur={preset.bloomMipmapBlur}
        intensity={preset.bloomIntensity}
        radius={preset.bloomRadius}
      />
      {preset.chromaticAberration ? (
        <ChromaticAberration
          key="chromatic"
          blendFunction={BlendFunction.NORMAL}
          offset={preset.chromaticOffset}
        />
      ) : null}
      <ToneMapping key="tonemap" />
    </EffectComposer>
  );
}
