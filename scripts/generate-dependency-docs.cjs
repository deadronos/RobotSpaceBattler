'use strict';

const fs = require('fs');
const path = require('path');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function tryResolvePackageJson(pkgName) {
  try {
    // Prefer Node's resolution to handle scoped packages and hoisting
    const resolved = require.resolve(path.posix.join(pkgName, 'package.json'), {
      paths: [process.cwd()],
    });
    return resolved;
  } catch (_) {
    // Fallback to naive path under node_modules
    const guess = path.join(process.cwd(), 'node_modules', ...pkgName.split('/'), 'package.json');
    if (fs.existsSync(guess)) return guess;
  }
  return null;
}

function cleanRepoUrl(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && raw.url) raw = raw.url;
  if (typeof raw !== 'string') return null;
  let url = raw.trim();
  // Strip git+ prefix and trailing .git
  url = url.replace(/^git\+/, '');
  url = url.replace(/\.git(#.*)?$/i, '$1' || '');
  // Convert SSH to https
  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }
  // Handle GitHub shorthand like github:user/repo
  const ghMatch = url.match(/^github:([^/]+)\/(.+)$/);
  if (ghMatch) {
    url = `https://github.com/${ghMatch[1]}/${ghMatch[2]}`;
  }
  // If still not http(s), bail
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function toLink(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const label = `${u.host}${u.pathname}`.replace(/\/$/, '');
    return { label, url };
  } catch {
    return { label: url, url };
  }
}

// Known docs overrides for better, friendlier links
const DOCS_OVERRIDES = {
  '@dimforge/rapier3d': 'https://rapier.rs/docs/user_guides/javascript',
  '@react-three/drei': 'https://docs.pmnd.rs/drei',
  '@react-three/fiber': 'https://docs.pmnd.rs/react-three-fiber',
  '@react-three/postprocessing': 'https://docs.pmnd.rs/react-postprocessing',
  '@react-three/rapier': 'https://docs.pmnd.rs/react-three-rapier',
  miniplex: 'https://github.com/hmans/miniplex#readme',
  react: 'https://react.dev',
  'react-dom': 'https://react.dev',
  three: 'https://threejs.org/docs',
  zustand: 'https://zustand.docs.pmnd.rs',
  '@playwright/test': 'https://playwright.dev',
  playwright: 'https://playwright.dev',
  '@testing-library/jest-dom': 'https://testing-library.com/docs/ecosystem-jest-dom/',
  '@testing-library/react': 'https://testing-library.com/docs/react-testing-library/intro/',
  '@types/react':
    'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react',
  '@types/react-dom':
    'https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom',
  '@vitejs/plugin-react-swc': 'https://vite.dev/guide/',
  eslint: 'https://eslint.org',
  'eslint-config-prettier': 'https://github.com/prettier/eslint-config-prettier#readme',
  'eslint-plugin-react': 'https://github.com/jsx-eslint/eslint-plugin-react#readme',
  jsdom: 'https://github.com/jsdom/jsdom#readme',
  prettier: 'https://prettier.io',
  typescript: 'https://www.typescriptlang.org',
  vite: 'https://vite.dev',
  vitest: 'https://vitest.dev',
};

function collectPackages(pkgJson, section) {
  const obj = pkgJson[section] || {};
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, range: obj[name] }));
}

function getPkgMeta(name) {
  const resolved = tryResolvePackageJson(name);
  if (!resolved) return { description: '', repo: null, homepage: null };
  try {
    const meta = readJSON(resolved);
    const description = typeof meta.description === 'string' ? meta.description.trim() : '';
    const repo = cleanRepoUrl(meta.repository);
    const homepage = typeof meta.homepage === 'string' ? meta.homepage.trim() : null;
    return { description, repo, homepage };
  } catch {
    return { description: '', repo: null, homepage: null };
  }
}

function buildSection(title, pkgs) {
  const lines = [];
  lines.push(`## ${title}`);
  lines.push('');
  for (const { name, range } of pkgs) {
    const { description, repo, homepage } = getPkgMeta(name);
    const docsUrl = DOCS_OVERRIDES[name] || homepage || repo || null;
    const repoLink = toLink(repo);
    const docsLink = toLink(docsUrl);
    const desc = description || '';
    lines.push(`- ${name} ${range} — ${desc}`.trim());
    if (repoLink) {
      lines.push(`  - Repo: [${repoLink.label}](${repoLink.url})`);
    }
    if (docsLink) {
      lines.push(`  - Docs: [${docsLink.label}](${docsLink.url})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const pkgJson = readJSON(pkgPath);

  const deps = collectPackages(pkgJson, 'dependencies');
  const devDeps = collectPackages(pkgJson, 'devDependencies');

  const out = [];
  out.push('# Third-party Libraries Overview');
  out.push('');
  out.push(
    'This document is generated from package.json and installed package metadata. It lists version ranges, repository links, official docs/homepages, and short descriptions.'
  );
  out.push('');
  if (deps.length) out.push(buildSection('Runtime dependencies', deps));
  if (devDeps.length) out.push(buildSection('Dev dependencies', devDeps));

  const output = out.join('\n').replace(/\n{3,}/g, '\n\n');
  const outFile = path.join(root, 'docs', 'DEPENDENCIES.md');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, output.trimEnd() + '\n', 'utf8');
  console.log(`Updated ${path.relative(root, outFile)}`);
}

main();
