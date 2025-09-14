// Minimal example store export for possible later use
import { World } from "miniplex";

import type { Entity } from "./types";

// Export a single World instance used by the simulation. Use the Entity type
// so consumers get properly typed entries instead of unknown.
export const store = new World<Entity>();
export default store;
