#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from 'playwright';

const PREVIEW_PORT = Number(process.env.VFX_PREVIEW_PORT ?? 4173);
const PREVIEW_HOST = process.env.VFX_PREVIEW_HOST ?? '127.0.0.1';
const BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Swallow and retry.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function captureStats(page, mode) {
  const query = mode === 'instanced' ? '?instancing=1' : '?instancing=0';
  await page.goto(`${BASE_URL}/${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window !== 'undefined' && window.__rendererStats, null, {
    timeout: 15000,
  });
  await page.waitForTimeout(2500);
  const stats = await page.evaluate(() => {
    const snapshot = window.__rendererStats ?? {};
    const telemetry = Array.isArray(snapshot.instancingTelemetry)
      ? [...snapshot.instancingTelemetry]
      : [];
    return {
      drawCalls: snapshot.drawCalls ?? 0,
      triangles: snapshot.triangles ?? 0,
      lines: snapshot.lines ?? 0,
      points: snapshot.points ?? 0,
      frameTimeMs: snapshot.frameTimeMs ?? 0,
      telemetry,
    };
  });
  return { mode, stats };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const skipBuild = args.has('--skip-build');

  if (!skipBuild) {
    await runCommand('npm', ['run', 'build']);
  }

  const preview = spawn('npm', ['run', 'preview', '--', '--host', PREVIEW_HOST, '--port', String(PREVIEW_PORT)], {
    stdio: 'pipe',
    env: process.env,
  });

  preview.stdout?.on('data', (data) => {
    process.stdout.write(data);
  });
  preview.stderr?.on('data', (data) => {
    process.stderr.write(data);
  });

  try {
    await waitForServer(`${BASE_URL}/`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const baseline = await captureStats(page, 'baseline');
    const instanced = await captureStats(page, 'instanced');

    console.log('\nVFX Instancing Draw Call Comparison');
    console.table(
      [baseline, instanced].map(({ mode, stats }) => ({
        Mode: mode,
        DrawCalls: stats.drawCalls,
        Triangles: stats.triangles,
        Lines: stats.lines,
        Points: stats.points,
        FrameMs: stats.frameTimeMs.toFixed(2),
      })),
    );

    console.log('\nRecent Instancing Telemetry Events (instanced run):');
    instanced.stats.telemetry.slice(-10).forEach((event) => {
      console.log(` - ${event.type} [${event.category}] entity=${event.entityId} index=${event.index ?? 'n/a'}`);
    });

    await browser.close();
  } finally {
    preview.kill('SIGINT');
  }
}

main().catch((error) => {
  console.error('[perf] Measurement failed:', error);
  process.exitCode = 1;
});
