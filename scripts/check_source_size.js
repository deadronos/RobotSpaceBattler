#!/usr/bin/env node
// Check source files for line count exceeding configured threshold.
// Usage:
//  - CHANGED_FILES_LIST env var: newline-separated list of files to check.
//  - If CHANGED_FILES_LIST is empty, the script scans the `src/`, `scripts/`,
//    `tests/`, and `playwright/` directories.

import { promises as fs } from 'fs';
import path from 'path';

const THRESHOLD = 300;
const EXT_RE = /\.(js|jsx|ts|tsx)$/i;
const ALLOWED_DIRS = ['src', 'scripts', 'tests', 'playwright'];

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

async function gatherAllFiles() {
  const files = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && EXT_RE.test(entry.name)) {
        files.push(full);
      }
    }
  }

  for (const d of ALLOWED_DIRS) {
    if (await fileExists(d)) {
      await walk(d);
    }
  }
  return files;
}

function splitLines(s) {
  return s.split(/\r\n|\r|\n/);
}

async function getFilesFromEnvList(envList) {
  if (!envList) return [];
  const parts = envList.split(/\r\n|\r|\n/).map(s => s.trim()).filter(Boolean);
  // Convert relative paths to workspace files
  return parts.map(p => path.normalize(p));
}

async function checkFiles(files) {
  const violations = [];
  for (const f of files) {
    if (!EXT_RE.test(f)) continue;
    let stat;
    try {
      stat = await fs.stat(f);
    } catch (e) {
      // file may not exist in this checkout; skip
      continue;
    }
    if (!stat.isFile()) continue;
    const content = await fs.readFile(f, 'utf8');
    const lines = splitLines(content);
    if (lines.length > THRESHOLD) {
      // Allow exemption marker in head comments
      const head = lines.slice(0, Math.min(30, lines.length)).join('\n');
      if (/CONSTITUTION-EXEMPT|CONSTITUTION-EXCEPTION/i.test(head)) {
        // explicit exemption present; skip
        continue;
      }
      violations.push({ path: f, lines: lines.length });
    }
  }
  return violations;
}

(async function main() {
  try {
    const envList = process.env.CHANGED_FILES_LIST || '';
    let filesToCheck = [];
    if (envList.trim()) {
      const candidates = await getFilesFromEnvList(envList);
      // Only keep files inside allowed dirs (or absolute matching)
      for (const f of candidates) {
        // normalize and handle paths without leading ./
        const normalized = path.normalize(f);
        const rel = normalized.replace(/\\/g, '/');
        if (ALLOWED_DIRS.some(d => rel.startsWith(d + '/')) || ALLOWED_DIRS.includes(rel)) {
          filesToCheck.push(normalized);
        }
      }
    }

    if (filesToCheck.length === 0) {
      // fallback: scan entire allowed dirs
      filesToCheck = await gatherAllFiles();
    }

    const violations = await checkFiles(filesToCheck);

    if (violations.length) {
      console.error('\nCONSTITUTION VIOLATION: Source files exceed allowed size (\u003e ' + THRESHOLD + ' lines)');
      console.error('Rule: Source files SHOULD be <= ' + THRESHOLD + ' lines. To exempt a file, add a');
      console.error("comment containing 'CONSTITUTION-EXEMPT: reason' in the file's header and create a short PR justification.\n");
      for (const v of violations) {
        console.error(` - ${v.path}: ${v.lines} lines`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('Source size check passed. No files exceed', THRESHOLD, 'lines (or exemptions found).');
    process.exitCode = 0;
  } catch (err) {
    console.error('Error running source-size check:', err);
    process.exitCode = 2;
  }
})();
