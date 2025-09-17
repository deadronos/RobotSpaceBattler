declare module 'scripts/validate-assets.cjs' {
  export function validateGltf(filePath: string): { ok: boolean; messages: string[] };
}

// Also provide a local path declaration so imports using relative paths are typed
declare module '../scripts/validate-assets.cjs' {
  export function validateGltf(filePath: string): { ok: boolean; messages: string[] };
}

// For require() of the file path (node-style), declare the module by its resolved path
declare module '*validate-assets.cjs' {
  export function validateGltf(filePath: string): { ok: boolean; messages: string[] };
}
