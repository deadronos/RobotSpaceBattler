import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from "three";

import type { RobotEntity, Store } from "../../ecs/worldTypes";
import { ensureGeometryHasVertexColors } from "../../visuals/instanceColorUtils";
import {
  collectHealthBarRobots,
  healthBarColor,
  healthBarScale,
  healthFraction,
} from "../../visuals/robots/healthBarLogic";
import {
  HEALTH_BAR_BACK_COLOR,
  HEALTH_BAR_HEIGHT,
  HEALTH_BAR_WIDTH,
  HEALTH_BAR_Y,
  MAX_ROBOTS,
} from "../../visuals/robots/robotLayout";

/**
 * One billboarded health bar per living robot, as two instanced quads (#168).
 *
 * Two draw calls total (background + fill) regardless of roster size. Both are
 * re-projected every frame from ECS `health`/`maxHealth`; a robot is dropped
 * from the bar list when it dies, so bars disappear with their robots.
 */
export function RobotHealthBars({ robots }: { robots: Store<RobotEntity> }) {
  const backgroundRef = useRef<InstancedMesh | null>(null);
  const fillRef = useRef<InstancedMesh | null>(null);
  const living = useMemo(
    () => new Array<RobotEntity | undefined>(MAX_ROBOTS),
    [],
  );
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const backColor = useMemo(() => new Color(HEALTH_BAR_BACK_COLOR), []);
  const cameraRight = useMemo(() => new Vector3(), []);
  const cameraForward = useMemo(() => new Vector3(), []);

  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(1, 1);
    ensureGeometryHasVertexColors(plane);
    return plane;
  }, []);
  // Bars draw over walls and robots: a bar half-clipped by cover reads as a
  // stray sliver, and the HP value matters more than occlusion here.
  const backgroundMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const fillMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      backgroundMaterial.dispose();
      fillMaterial.dispose();
    };
  }, [geometry, backgroundMaterial, fillMaterial]);

  useFrame(({ camera }) => {
    const background = backgroundRef.current;
    const fill = fillRef.current;
    if (!background || !fill) {
      return;
    }

    const count = collectHealthBarRobots(robots.entities, living);
    const quaternion = camera.quaternion;
    cameraRight.set(1, 0, 0).applyQuaternion(quaternion);
    cameraForward.set(0, 0, 1).applyQuaternion(quaternion).multiplyScalar(0.02);

    for (let i = 0; i < count; i += 1) {
      const robot = living[i] as RobotEntity;
      const fraction = healthFraction(robot.health, robot.maxHealth);
      const x = robot.position.x;
      const z = robot.position.z;

      dummy.position.set(x, HEALTH_BAR_Y, z);
      dummy.quaternion.copy(quaternion);
      dummy.scale.set(HEALTH_BAR_WIDTH * 1.16, HEALTH_BAR_HEIGHT * 1.7, 1);
      dummy.updateMatrix();
      background.setMatrixAt(i, dummy.matrix);
      background.setColorAt(i, backColor);

      // The fill is anchored to the bar's left edge and shrinks with HP.
      const scale = healthBarScale(fraction);
      const offset = (HEALTH_BAR_WIDTH * (1 - scale)) / 2;
      dummy.position.set(
        x - cameraRight.x * offset + cameraForward.x,
        HEALTH_BAR_Y - cameraRight.y * offset + cameraForward.y,
        z - cameraRight.z * offset + cameraForward.z,
      );
      dummy.scale.set(HEALTH_BAR_WIDTH * scale, HEALTH_BAR_HEIGHT, 1);
      dummy.updateMatrix();
      fill.setMatrixAt(i, dummy.matrix);
      fill.setColorAt(i, healthBarColor(fraction, color));
    }

    background.count = count;
    fill.count = count;
    background.instanceMatrix.needsUpdate = true;
    fill.instanceMatrix.needsUpdate = true;
    if (background.instanceColor) {
      background.instanceColor.needsUpdate = true;
    }
    if (fill.instanceColor) {
      fill.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={backgroundRef}
        name="robot-health-bars-background"
        args={[geometry, backgroundMaterial, MAX_ROBOTS]}
        frustumCulled={false}
        renderOrder={10}
      />
      <instancedMesh
        ref={fillRef}
        name="robot-health-bars-fill"
        args={[geometry, fillMaterial, MAX_ROBOTS]}
        frustumCulled={false}
        renderOrder={11}
      />
    </>
  );
}
