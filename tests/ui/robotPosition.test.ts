import { readFileSync } from "node:fs";
import { Object3D, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { ROBOT_CENTER_Y } from "@/visuals/robots/robotLayout";
import { writeRobotMatrix } from "@/visuals/robots/robotTransform";

const ROBOT_VISUAL_SOURCES = [
  "src/components/robots/RobotInstances.tsx",
  "src/visuals/robots/robotTransform.ts",
  "src/visuals/robots/robotInstanceBuffer.ts",
];

describe("robot position ownership (#162, #168)", () => {
  it("projects the ECS position onto the instance matrix", () => {
    const dummy = new Object3D();
    const robot = {
      position: { x: 3.5, y: 0, z: -7 },
      orientation: 0,
    };
    writeRobotMatrix(dummy, robot);
    expect(dummy.position.toArray()).toEqual([3.5, ROBOT_CENTER_Y, -7]);

    robot.position.x = 10;
    writeRobotMatrix(dummy, robot);
    expect(dummy.position.x).toBe(10);
  });

  it("turns the robot towards its ECS orientation", () => {
    const dummy = new Object3D();
    writeRobotMatrix(dummy, {
      position: { x: 0, y: 0, z: 0 },
      orientation: Math.PI / 2,
    });
    // The local +Z axis must point along +X for orientation = atan2(x, z).
    const forward = new Vector3(0, 0, 1).applyQuaternion(dummy.quaternion);
    expect(forward.x).toBeCloseTo(1, 6);
    expect(forward.z).toBeCloseTo(0, 6);
  });

  it("robots own no physics body: the ECS is the only position owner", () => {
    for (const file of ROBOT_VISUAL_SOURCES) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/from "@react-three\/rapier"/);
      expect(source).not.toMatch(/<RigidBody|<CapsuleCollider/);
    }
  });
});
