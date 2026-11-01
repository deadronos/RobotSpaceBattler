import { readFileSync } from "node:fs";
import { Group } from "three";
import { describe, expect, it } from "vitest";

import {
  applyRobotTransform,
  ROBOT_CENTER_Y,
} from "@/components/RobotPlaceholder";

describe("robot position ownership (#162)", () => {
  it("projects the ECS position onto the scene object", () => {
    const group = new Group();
    const robot = { position: { x: 3.5, y: 0, z: -7 } };
    applyRobotTransform(group, robot);
    expect(group.position.toArray()).toEqual([3.5, ROBOT_CENTER_Y, -7]);

    robot.position.x = 10;
    applyRobotTransform(group, robot);
    expect(group.position.x).toBe(10);
  });

  it("robots own no Rapier body: the ECS is the only position owner", () => {
    const source = readFileSync("src/components/RobotPlaceholder.tsx", "utf8");
    expect(source).not.toMatch(/from "@react-three\/rapier"/);
    expect(source).not.toMatch(/<RigidBody|<CapsuleCollider/);
  });
});
