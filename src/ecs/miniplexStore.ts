// Minimal example store export for possible later use
import { World } from "miniplex";

// Export a single World instance used by the simulation. Using a shared
// World makes it easier to reason about entities and to add systems that
// operate on the same store instance.
export const store = new World<any>();
export default store;
