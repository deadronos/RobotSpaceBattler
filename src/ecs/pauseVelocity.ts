export type Vec3 = [number, number, number];

export interface PauseVelocityComponent {
  pauseVel?: { lin?: Vec3; ang?: Vec3 };
}

export function setPauseVelocity<T extends PauseVelocityComponent>(
  entity: T,
  lin?: Vec3,
  ang?: Vec3,
) {
  entity.pauseVel = entity.pauseVel ?? {};
  if (lin) entity.pauseVel.lin = lin;
  if (ang) entity.pauseVel.ang = ang;
}

export function getPauseVelocity<T extends PauseVelocityComponent>(entity: T) {
  return entity.pauseVel;
}

export function clearPauseVelocity<T extends PauseVelocityComponent>(
  entity: T,
) {
  if (entity.pauseVel) {
    delete entity.pauseVel;
  }
}
