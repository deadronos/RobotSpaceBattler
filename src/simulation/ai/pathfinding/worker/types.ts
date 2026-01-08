import type { NavigationMesh, NavigationPath, Point3D } from "../types";

export interface WorkerInitMessage {
  type: "init";
  mesh: NavigationMesh;
}

export interface WorkerPathRequest {
  type: "path_request";
  id: string; // Request ID
  start: Point3D;
  target: Point3D;
  enableSmoothing: boolean;
  enableNearestFallback: boolean;
}

export type WorkerMessage = WorkerInitMessage | WorkerPathRequest;

export interface WorkerPathResult {
  id: string; // Request ID
  path: NavigationPath | null;
  status: "success" | "failed" | "no_path";
  error?: string;
  durationMs: number;
}
