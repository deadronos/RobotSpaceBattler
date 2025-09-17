import fs from 'fs';
import path from 'path';

type ValidationResult = { ok: boolean; messages: string[] };

function validateGltf(filePath: string): ValidationResult {
  const messages: string[] = [];
  if (!fs.existsSync(filePath)) {
    return { ok: false, messages: [`Missing file: ${filePath}`] };
  }
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { ok: false, messages: [`Failed to read ${filePath}: ${String(e)}`] };
  }
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, messages: [`Invalid JSON glTF: ${filePath}: ${String(e)}`] };
  }

  if (!json.asset) messages.push('Missing asset block');
  if (!json.scenes || !Array.isArray(json.scenes) || json.scenes.length === 0) messages.push('No scenes defined');
  if (!json.nodes || !Array.isArray(json.nodes) || json.nodes.length === 0) messages.push('No nodes defined');

  // metadata check
  if (!json.asset || !json.asset.extras) messages.push('Missing asset.extras metadata (author/source/version)');
  else {
    const extras = json.asset.extras;
    if (!extras.author) messages.push('Missing asset.extras.author');
    if (!extras.source) messages.push('Missing asset.extras.source');
    if (!extras.version) messages.push('Missing asset.extras.version');
  }

  const ok = messages.length === 0;
  return { ok, messages };
}

if (require.main === module) {
  const base = path.join(__dirname, '..', 'public', 'assets', 'examples');
  const required = ['robot-placeholder.gltf'];
  let failed = false;
  for (const r of required) {
    const p = path.join(base, r);
    const res = validateGltf(p);
    if (!res.ok) {
      failed = true;
      console.error('Validation failed for', r);
      for (const m of res.messages) console.error(' -', m);
    } else {
      console.log('Validated', r);
    }
  }
  process.exit(failed ? 2 : 0);
}

export { validateGltf };
