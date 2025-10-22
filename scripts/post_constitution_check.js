#!/usr/bin/env node
// Generate an auto-drafted CONSTITUTION-CHECK for a PR and post or update a comment
// Usage in CI: set envs
//  - GITHUB_TOKEN (required)
//  - PR_NUMBER (required)
//  - GITHUB_REPOSITORY (owner/repo)
//  - CHANGED_FILES_LIST (newline-separated list of changed file paths) -- if empty, script scans default dirs

import { promises as fs } from 'fs';
import path from 'path';

const THRESHOLD = 300;
const EXT_RE = /\.(js|jsx|ts|tsx)$/i;
const ALLOWED_DIRS = ['src', 'scripts', 'tests', 'playwright'];

function splitLines(s) {
  return s.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch (e) { return false; }
}

async function gatherAllFiles() {
  const files = [];
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && EXT_RE.test(entry.name)) {
        files.push(full.replace(/\\/g, '/'));
      }
    }
  }
  for (const d of ALLOWED_DIRS) {
    if (await fileExists(d)) await walk(d);
  }
  return files;
}

async function getFilesFromEnvList(envList) {
  if (!envList) return [];
  const parts = splitLines(envList);
  return parts.map(p => p.replace(/\\/g, '/'));
}

function baseNameSuggest(filename) {
  const base = path.basename(filename).replace(/\.[^.]+$/, '');
  // Remove dots and non-word chars
  const clean = base.replace(/[^a-zA-Z0-9_$]/g, '');
  const pascal = clean.charAt(0).toUpperCase() + clean.slice(1);
  return { hook: `hooks/use${pascal}.ts`, component: `components/${pascal}Body.tsx` };
}

async function analyzeFiles(files) {
  const results = [];
  for (const f of files) {
    if (!EXT_RE.test(f)) continue;
    let stat;
    try { stat = await fs.stat(f); } catch (e) { continue; }
    if (!stat.isFile()) continue;
    const content = await fs.readFile(f, 'utf8');
    const lines = splitLines(content);
    const loc = lines.length;
    const head = lines.slice(0, Math.min(20, lines.length)).join('\n');
    const isExempt = /CONSTITUTION-EXEMPT|CONSTITUTION-EXCEPTION/i.test(head);
    const hasUseFrame = /useFrame\(/.test(content);
    const r3fIndicators = /(@react-three|useFrame|useThree|mesh\b|scene\b|instancedMesh|<mesh\b)/i.test(content);
    const suggestions = loc > THRESHOLD ? baseNameSuggest(f) : null;
    results.push({ path: f, loc, isExempt, r3fIndicators, hasUseFrame, suggestions });
  }
  return results;
}

function generateMarkdown(analysis, changedTests) {
  const header = '## CONSTITUTION-CHECK (auto-generated)\n\n';
  const lines = [header];
  lines.push('> This draft was auto-generated. Please edit your PR body `CONSTITUTION-CHECK` section to adopt or refine this draft.');
  lines.push('');
  lines.push('### File-size & decomposition:');
  lines.push('');
  if (analysis.length === 0) {
    lines.push('- No changed source files detected in monitored directories.');
  } else {
    lines.push('- Modified files (paths + LOC):');
    lines.push('');
    for (const a of analysis) {
      if (a.isExempt) {
        lines.push(`  - \`${a.path}\`: ${a.loc} LOC — EXEMPT (CONSTITUTION-EXEMPT present)`);
      } else if (a.loc > THRESHOLD) {
        lines.push(`  - \`${a.path}\`: ${a.loc} LOC — VIOLATION (\`${THRESHOLD} LOC\` limit). Suggested extraction: \`${a.suggestions.hook}\` and \`${a.suggestions.component}\`.`);
      } else {
        lines.push(`  - \`${a.path}\`: ${a.loc} LOC — OK`);
      }
    }
    lines.push('');
    lines.push('- LOC summary or decomposition plan (if any file > 300 LOC):');
    const viol = analysis.filter(a => !a.isExempt && a.loc > THRESHOLD);
    if (viol.length === 0) {
      lines.push('  - No files exceed the LOC threshold.');
    } else {
      for (const v of viol) {
        lines.push(`  - For \`${v.path}\`: consider extracting hook(s) and smaller rendering components. Example: \`${v.suggestions.hook}\`, \`${v.suggestions.component}\`. Provide a short plan or add a \`CONSTITUTION-EXEMPT\` header with justification.`);
      }
    }
  }
  lines.push('');
  lines.push('### Tests (TDD evidence):');
  lines.push('');
  if (changedTests.length === 0) {
    lines.push('- No test files modified in this PR — ensure tests were added and failing prior to implementation as per TDD.');
  } else {
    lines.push('- Tests modified/added (paths):');
    for (const t of changedTests) lines.push(`  - \`${t}\``);
    lines.push('');
    lines.push('- TDD notes / evidence:');
    lines.push('  - Describe the TDD steps and reference commits or CI runs where failing tests were created.');
  }
  lines.push('');
  lines.push('### React / r3f guidance (if change affects rendering or simulation):');
  lines.push('');
  lines.push('- Rendering vs simulation separation maintained: yes / no — explain.');
  lines.push('- `useFrame` usage justified: yes / no — if yes, explain where heavy work is offloaded.');
  lines.push('- Asset loading uses Suspense/loader abstraction: yes / no — loader paths.');
  lines.push('');
  lines.push('### Observability & Performance:');
  lines.push('');
  lines.push('- Logging in hot loops rate-limited: yes / no — explain.');
  lines.push('- Performance targets affected (e.g., 60 FPS): provide profiling notes or links to results.');
  lines.push('');
  lines.push('### Deprecation & redundancy:');
  lines.push('');
  lines.push('- This PR deprecates or removes files/APIs: list and link to migration plan.');
  lines.push('');
  lines.push('### Agentic AI triggers:');
  lines.push('');
  lines.push('- Does this change grant agents automation privileges or add agents that can create/merge PRs or deploy? yes / no — if yes, include maintainer approvals.');
  lines.push('');
  lines.push('### Target platforms & compatibility:');
  lines.push('');
  lines.push('- Target browser baseline: Chrome 120+ / Edge 120+');
  lines.push('- Required polyfills or build steps (if any):');
  lines.push('');
  lines.push('---\n');
  lines.push('*This comment is auto-generated by the repository constitution bot. Edit the PR body `CONSTITUTION-CHECK` section to adopt or refine this draft.*');

  return lines.join('\n');
}

async function postComment(owner, repo, prNumber, body, token) {
  const apiBase = 'https://api.github.com';
  // List existing comments
  const listUrl = `${apiBase}/repos/${owner}/${repo}/issues/${prNumber}/comments`;
  const headers = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'robotspacebattler-constitution-bot' };
  const resList = await fetch(listUrl, { headers });
  if (!resList.ok) throw new Error(`Failed to list comments: ${resList.status} ${resList.statusText}`);
  const comments = await resList.json();
  const marker = 'CONSTITUTION-CHECK (auto-generated)';
  const existing = comments.find(c => c.body && c.body.includes(marker));
  if (existing) {
    const updateUrl = `${apiBase}/repos/${owner}/${repo}/issues/comments/${existing.id}`;
    const res = await fetch(updateUrl, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
    if (!res.ok) throw new Error(`Failed to update comment: ${res.status} ${res.statusText}`);
    console.log('Updated existing constitution draft comment.');
  } else {
    const createUrl = `${apiBase}/repos/${owner}/${repo}/issues/${prNumber}/comments`;
    const res = await fetch(createUrl, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
    if (!res.ok) throw new Error(`Failed to create comment: ${res.status} ${res.statusText}`);
    console.log('Created constitution draft comment.');
  }
}

(async function main() {
  try {
    const repo = process.env.GITHUB_REPOSITORY;
    const prNumber = process.env.PR_NUMBER || (process.env.GITHUB_REF && process.env.GITHUB_REF.split('/').pop());
    const token = process.env.GITHUB_TOKEN;
    if (!repo) throw new Error('GITHUB_REPOSITORY not set');
    if (!prNumber) throw new Error('PR_NUMBER not set');
    if (!token) throw new Error('GITHUB_TOKEN not set');
    const [owner, repoName] = repo.split('/');

    const envList = process.env.CHANGED_FILES_LIST || process.env.CHANGED_FILES || '';
    let files = await getFilesFromEnvList(envList);
    if (files.length === 0) files = await gatherAllFiles();

    // Normalize to relative paths
    files = files.map(f => f.replace(/\\/g, '/'));

    const analysis = await analyzeFiles(files);
    const changedTests = files.filter(p => /^tests\//.test(p) || /test\.(js|ts)x?$/.test(p));

    const md = generateMarkdown(analysis, changedTests);

    await postComment(owner, repoName, prNumber, md, token);
  } catch (err) {
    console.error('Error in post_constitution_check:', err);
    process.exitCode = 2;
  }
})();
