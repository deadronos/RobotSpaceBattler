Assets & glTF Export Guidelines
===============================

This document gives concrete, reproducible guidance for exporting glTF/GLB assets that work well with RobotSpaceBattler's runtime.

Naming conventions
------------------
- Use kebab-case for filenames: `robot-light-tank-v01.glb`.
- Prefix type where helpful: `robot-`, `env-`, `prop-`.
- Versioning: append `-vNN` (e.g., `-v01`) for tracked exports.
- LODs: `modelname_lod0.glb`, `modelname_lod1.glb` (0 = highest detail).

Units & transforms
-------------------
- Use meters as unit. In Blender use scale 1.0, and apply transforms (Ctrl-A -> Apply All Transforms) before export.
- Set object origin/pivot where gameplay logic expects it (usually model base or center of mass).

Up-axis and orientation
------------------------
- Export with +Y up by default unless the engine uses +Z up. Check `SPEC.md` if unsure. When exporting from Blender, set the Up axis accordingly in the glTF exporter.

Materials & textures
--------------------
- Use PBR metallic-roughness workflow (baseColor, metallicRoughness, normal).
- Textures: PNG for sRGB color textures, PNG or KTX2 for normal/ORM where appropriate.
- Normal maps: exported as linear (non-color data).

glTF/GLB specifics
------------------
- Prefer binary GLB for runtime (single file). Use .gltf + external textures for authoring if you need separate textures.
- Include tangents if your materials use normal maps (Blender exporter option).
- Embed images where practical for small textures; keep large textures external to make iterative updates easier.

Metadata checklist (required fields)
-----------------------------------
- Add `asset.extras` metadata in the glTF root with keys: `author`, `source` (filename or repo), `version`.
- Example (in glTF JSON):

  "asset": {
    "version": "2.0",
    "generator": "Blender 3.5 glTF2 Exporter",
    "extras": { "author": "Artist Name", "source": "robot.blend", "version": "v01" }
  }

Pre-export checklist
--------------------
1. Apply transforms.
2. Remove unused nodes, materials, images.
3. Pack textures or export with external images per team preference.
4. Ensure mesh scale is correct and pivot/origin is set.
5. Add `asset.extras` metadata.

Blender export settings (recommended)
------------------------------------
- File > Export > glTF 2.0
- Format: glb (Binary)
- Include: Selected Objects (if exporting a single model)
- Transform: +Y Up (or +Z Up if repo uses Z-up), Forward -Z
- Geometry: Apply Modifiers, Include Normals, Include UVs, Include Tangents
- Animation: (disable unless exporting animations)

Where to put exports
---------------------
- Authoring exports: `assets/exports/` (not required to commit large sources).
- Committed runtime assets: `public/assets/examples/` (small example files only). Production assets should be put into a proper asset server or CDN; `public/` is for local dev and small examples.

Further reading
---------------
- glTF specification: https://www.khronos.org/gltf/
- Blender glTF exporter docs: https://docs.blender.org/manual/en/latest/addons/io_scene_gltf2.html
