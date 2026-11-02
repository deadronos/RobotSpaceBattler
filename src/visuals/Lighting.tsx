import { SCENE_LIGHTS, type SceneLightConfig } from "./lightRig";

/**
 * Props for the Lighting component.
 */
interface LightingProps {
  shadowsEnabled: boolean;
  shadowMapSize: number;
}

/**
 * Renders the scene light rig (#230).
 *
 * The rig itself is data in `lightRig.ts` (at most 6 lights, one shadow
 * caster); this component only projects it into react-three-fiber elements.
 *
 * @param props - Component props.
 * @returns The lighting elements.
 */
export function Lighting({ shadowsEnabled, shadowMapSize }: LightingProps) {
  return (
    <>
      {SCENE_LIGHTS.map((light, index) =>
        renderLight(light, index, shadowsEnabled, shadowMapSize),
      )}
    </>
  );
}

function renderLight(
  light: SceneLightConfig,
  index: number,
  shadowsEnabled: boolean,
  shadowMapSize: number,
) {
  const key = `${light.kind}-${index}`;
  switch (light.kind) {
    case "ambient":
      return (
        <ambientLight
          key={key}
          color={light.color}
          intensity={light.intensity}
        />
      );
    case "hemisphere":
      return (
        <hemisphereLight
          key={key}
          groundColor={light.groundColor}
          color={light.color}
          intensity={light.intensity}
          position={[light.position[0], light.position[1], light.position[2]]}
        />
      );
    case "directional": {
      const shadowProps = light.castShadow
        ? {
            castShadow: shadowsEnabled,
            "shadow-mapSize-width": shadowMapSize,
            "shadow-mapSize-height": shadowMapSize,
            "shadow-camera-near": 1,
            "shadow-camera-far": 120,
            "shadow-camera-left": -60,
            "shadow-camera-right": 60,
            "shadow-camera-top": 60,
            "shadow-camera-bottom": -60,
            "shadow-bias": -0.0008,
          }
        : { castShadow: false };
      return (
        <directionalLight
          key={key}
          position={[light.position[0], light.position[1], light.position[2]]}
          color={light.color}
          intensity={light.intensity}
          {...shadowProps}
        />
      );
    }
    case "spot":
      return (
        <spotLight
          key={key}
          position={[light.position[0], light.position[1], light.position[2]]}
          angle={light.angle}
          penumbra={light.penumbra}
          intensity={light.intensity}
          color={light.color}
          distance={light.distance}
          castShadow={false}
        />
      );
  }
}
