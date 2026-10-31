import type { NavigationMesh, NavigationPath, Point3D } from "../types";

export interface WorkerPathRequest {
  type: "path_request";
  id: string; // Request ID
  start: Point3D;
  target: Point3D;
  enableSmoothing: boolean;
  enableNearestFallback: boolean;
}

export interface WorkerPathResult {
  id: string; // Request ID
  path: NavigationPath | null;
  status: "success" | "failed" | "no_path";
  error?: string;
  durationMs: number;
}

export type WorkerInbound =
  | { type: "init"; seq: number; mesh: NavigationMesh }
  | { type: "path"; seq: number; request: WorkerPathRequest };

export type WorkerOutbound =
  | { type: "init_ok"; seq: number }
  | { type: "init_error"; seq: number; error: string }
  | { type: "path_result"; seq: number; result: WorkerPathResult };
