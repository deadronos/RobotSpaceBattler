import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) files.push(...walk(p));
    else if (st.isFile() && (extname(p) === '.ts' || extname(p) === '.tsx')) files.push(p);
  }
  return files;
}

describe('no Date.now/Math.random in src/systems', () => {
  it('finds no usages of Date.now or Math.random in systems', () => {
    const systemsDir = join(process.cwd(), 'src', 'systems');
    const files = walk(systemsDir);
    const bad: string[] = [];
    const reDate = /Date\.now\s*\(/;
    const reMath = /Math\.random\s*\(/;
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      if (reDate.test(content) || reMath.test(content)) bad.push(f);
    }

    expect(bad).toEqual([]);
  });
});
