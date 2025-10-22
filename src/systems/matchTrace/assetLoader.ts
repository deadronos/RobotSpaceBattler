/**
 * Asset Loader — 3D Model & Asset Loading with Fallbacks (T019, US1)
 *
 * Provides a singleton asset loader with fallback strategies for missing 3D models.
 * Falls back to procedural geometries when models fail to load.
 *
 * Strategy:
 * 1. Try to load from cache
 * 2. Try to load model file
 * 3. Fall back to procedural geometry
 * 4. Cache result for reuse
 */

import { BoxGeometry, CylinderGeometry, SphereGeometry } from "three";

// ============================================================================
// Asset Types
// ============================================================================

export type AssetType = "robot" | "projectile" | "effect" | "environment";

export interface LoadedAsset {
  id: string;
  type: AssetType;
  geometry: BoxGeometry | SphereGeometry | CylinderGeometry;
  isFallback: boolean;
  loadTime: number;
}

// ============================================================================
// Asset Loader Singleton
// ============================================================================

class AssetLoader {
  private cache = new Map<string, LoadedAsset>();
  private loadTimes = new Map<string, number>();

  /**
   * Load an asset by ID, with fallback to procedural geometry.
   * Returns either a loaded model or fallback geometry.
   */
  async loadAsset(id: string, type: AssetType): Promise<LoadedAsset> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const startTime = performance.now();

    // Try to load from asset bundle (placeholder for now)
    const asset = await this.tryLoadModel(id).catch(() =>
      this.getFallbackAsset(id, type),
    );

    const loadTime = performance.now() - startTime;
    asset.loadTime = loadTime;

    // Cache for reuse
    this.cache.set(id, asset);
    this.loadTimes.set(id, loadTime);

    return asset;
  }

  /**
   * Try to load a 3D model from an external source.
   * For now, this is a placeholder that logs and rejects.
   */
  private async tryLoadModel(id: string): Promise<LoadedAsset> {
    return new Promise((_, reject) => {
      // Placeholder: In production, would load from CDN or bundled assets
      console.warn(`Asset loader: Model ${id} not available, using fallback`);
      reject(new Error(`Model ${id} not found`));
    });
  }

  /**
   * Get a procedural fallback asset based on type.
   * Used when model loading fails.
   */
  private getFallbackAsset(id: string, type: AssetType): LoadedAsset {
    let geometry: BoxGeometry | SphereGeometry | CylinderGeometry;

    switch (type) {
      case "robot":
        // Simple box for robot
        geometry = new BoxGeometry(0.5, 1.0, 0.5);
        break;

      case "projectile":
        // Sphere for projectile
        geometry = new SphereGeometry(0.1, 8, 8);
        break;

      case "effect":
        // Octahedron-like effect (using sphere simplified)
        geometry = new SphereGeometry(0.3, 4, 4);
        break;

      case "environment":
        // Default plane/box for environment
        geometry = new BoxGeometry(10, 1, 10);
        break;

      default:
        geometry = new BoxGeometry(1, 1, 1);
    }

    return {
      id,
      type,
      geometry,
      isFallback: true,
      loadTime: 0,
    };
  }

  /**
   * Pre-load a set of assets synchronously.
   */
  preloadAssets(assetIds: Array<{ id: string; type: AssetType }>): void {
    assetIds.forEach(({ id, type }) => {
      if (!this.cache.has(id)) {
        const asset = this.getFallbackAsset(id, type);
        this.cache.set(id, asset);
      }
    });
  }

  /**
   * Clear the cache to free memory.
   */
  clearCache(): void {
    this.cache.clear();
    this.loadTimes.clear();
  }

  /**
   * Get cache statistics for debugging.
   */
  getStats(): {
    cacheSize: number;
    assets: Array<{ id: string; loadTime: number; isFallback: boolean }>;
  } {
    const assets = Array.from(this.cache.values()).map((asset) => ({
      id: asset.id,
      loadTime: asset.loadTime,
      isFallback: asset.isFallback,
    }));

    return {
      cacheSize: this.cache.size,
      assets,
    };
  }
}

// ============================================================================
// Singleton Instance & Exports
// ============================================================================

let instance: AssetLoader | null = null;

export function getAssetLoader(): AssetLoader {
  if (!instance) {
    instance = new AssetLoader();
  }
  return instance;
}

/**
 * React hook for accessing asset loader
 */
export function useAssetLoader() {
  return getAssetLoader();
}
