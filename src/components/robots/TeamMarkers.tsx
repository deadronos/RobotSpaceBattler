import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, MeshBasicMaterial, Object3D } from "three";

import type { RobotEntity, Store } from "../../ecs/worldTypes";
import { teamColor } from "../../lib/teamPalette";
import type { TeamId } from "../../lib/teamConfig";
import {
  applyHiddenInstance,
  hideAllInstances,
} from "../../visuals/instanceColorUtils";
import {
  collectTeamMarkerRobots,
  createTeamMarkerGeometry,
  MAX_ROBOTS_PER_TEAM,
  TEAM_MARKER_Y,
} from "../../visuals/robots/teamMarkers";

const TEAMS: readonly TeamId[] = ["red", "blue"];

interface TeamMarkersProps {
  /** Live robots; `.entities` is re-read every frame. */
  robots: Store<RobotEntity>;
  /** Use the colour-blind-safe team palette. */
  colorBlindPalette?: boolean;
}

/**
 * A per-team shape badge above every health bar (#166).
 *
 * Red robots get a pyramid, blue robots a ring, so team identity does not rely
 * on hue. Both meshes are billboarded from the camera and drawn over the
 * scene like the health bars. Rendering only.
 */
export function TeamMarkers({
  robots,
  colorBlindPalette = false,
}: TeamMarkersProps) {
  const meshes = useRef<Partial<Record<TeamId, InstancedMesh | null>>>({});
  const previousCounts = useRef<Record<TeamId, number>>({ red: 0, blue: 0 });
  const dummy = useMemo(() => new Object3D(), []);
  const hiddenColor = useMemo(() => new Color("#000000"), []);
  const geometries = useMemo(
    () => ({
      red: createTeamMarkerGeometry("red"),
      blue: createTeamMarkerGeometry("blue"),
    }),
    [],
  );
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const teamColors = useMemo(
    () => ({
      red: new Color(teamColor("red", colorBlindPalette)),
      blue: new Color(teamColor("blue", colorBlindPalette)),
    }),
    [colorBlindPalette],
  );
  const slots = useMemo(
    () => ({
      red: new Array<RobotEntity | undefined>(MAX_ROBOTS_PER_TEAM),
      blue: new Array<RobotEntity | undefined>(MAX_ROBOTS_PER_TEAM),
    }),
    [],
  );

  useLayoutEffect(() => {
    for (const team of TEAMS) {
      const mesh = meshes.current[team];
      if (mesh) {
        hideAllInstances(mesh, MAX_ROBOTS_PER_TEAM);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const team of TEAMS) {
        geometries[team].dispose();
      }
      material.dispose();
    };
  }, [geometries, material]);

  useFrame(({ camera }) => {
    const counts = collectTeamMarkerRobots(robots.entities, slots);
    const quaternion = camera.quaternion;

    for (const team of TEAMS) {
      const mesh = meshes.current[team];
      if (!mesh) {
        continue;
      }
      const teamSlots = slots[team];
      const count = counts[team];
      const previous = previousCounts.current[team];

      for (let i = 0; i < count; i += 1) {
        const robot = teamSlots[i] as RobotEntity;
        dummy.position.set(robot.position.x, TEAM_MARKER_Y, robot.position.z);
        dummy.quaternion.copy(quaternion);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, teamColors[team]);
      }

      for (let i = count; i < previous; i += 1) {
        applyHiddenInstance(mesh, i, dummy, hiddenColor);
      }

      previousCounts.current[team] = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {TEAMS.map((team) => (
        <instancedMesh
          key={team}
          ref={(mesh) => {
            meshes.current[team] = mesh;
          }}
          name={`team-marker-${team}`}
          args={[geometries[team], material, MAX_ROBOTS_PER_TEAM]}
          frustumCulled={false}
          renderOrder={12}
        />
      ))}
    </>
  );
}
