#!/usr/bin/env tsx
/**
 * Code Health Check Script
 *
 * Detects duplicate modules and generates deprecation plan per constitution.
 * This script scans the codebase for potential duplicate functionality and
 * helps identify areas for consolidation.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModuleInfo {
  path: string;
  name: string;
  exports: string[];
  imports: string[];
  size: number;
}

interface DuplicateGroup {
  pattern: string;
  modules: ModuleInfo[];
  similarity: number;
}

/**
 * Scan directory for TypeScript/JavaScript files
 */
function scanDirectory(dir: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip node_modules, dist, and hidden directories
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.github'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Extract basic module information
 */
function analyzeModule(filePath: string): ModuleInfo {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Simple regex-based extraction (not perfect but good enough for health check)
  const exports: string[] = [];
  const imports: string[] = [];

  for (const line of lines) {
    // Match export statements
    const exportMatch = line.match(/export\s+(default\s+)?(class|function|const|let|var|interface|type)\s+(\w+)/);
    if (exportMatch) {
      exports.push(exportMatch[3]);
    }

    // Match import statements
    const importMatch = line.match(/import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      imports.push(importMatch[1]);
    }
  }

  return {
    path: filePath,
    name: path.basename(filePath),
    exports,
    imports,
    size: lines.length,
  };
}

/**
 * Find potential duplicate modules based on naming patterns
 */
function findDuplicates(modules: ModuleInfo[]): DuplicateGroup[] {
  const groups: Map<string, ModuleInfo[]> = new Map();

  // Group by similar base names (e.g., "Robot.ts" and "RobotEntity.ts")
  for (const module of modules) {
    const baseName = module.name
      .replace(/\.(ts|tsx|js|jsx)$/, '')
      .replace(/(Component|Entity|Service|System|Hook|Utils?)$/i, '');

    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }
    groups.get(baseName)!.push(module);
  }

  // Filter groups with potential duplicates
  const duplicates: DuplicateGroup[] = [];
  for (const [pattern, moduleList] of groups.entries()) {
    if (moduleList.length > 1) {
      duplicates.push({
        pattern,
        modules: moduleList,
        similarity: calculateSimilarity(moduleList),
      });
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate similarity score between modules (0-100)
 */
function calculateSimilarity(modules: ModuleInfo[]): number {
  if (modules.length < 2) return 0;

  // Simple heuristic: compare export counts and naming patterns
  const exportCounts = modules.map((m) => m.exports.length);
  const avgExports = exportCounts.reduce((a, b) => a + b, 0) / exportCounts.length;
  const variance = exportCounts.reduce((sum, count) => sum + Math.abs(count - avgExports), 0);

  // Lower variance = higher similarity
  return Math.max(0, 100 - variance * 10);
}

/**
 * Generate deprecation plan
 */
function generateDeprecationPlan(duplicates: DuplicateGroup[]): string {
  if (duplicates.length === 0) {
    return '✅ No duplicate modules detected. Code health is good.';
  }

  let report = '⚠️  Potential Duplicate Modules Detected\n\n';
  report += 'The following modules may have overlapping functionality:\n\n';

  for (const group of duplicates) {
    report += `## Pattern: "${group.pattern}" (Similarity: ${group.similarity.toFixed(0)}%)\n\n`;

    for (const module of group.modules) {
      report += `- **${module.name}** (${module.size} LOC)\n`;
      report += `  Path: ${module.path}\n`;
      report += `  Exports: ${module.exports.join(', ') || 'none'}\n`;
    }

    report += '\n**Recommended Action:**\n';
    if (group.similarity > 70) {
      report += '- High similarity detected. Consider consolidating into a single module.\n';
      report += '- Review exports to identify overlapping functionality.\n';
      report += '- Create migration plan with backward compatibility.\n';
    } else {
      report += '- Moderate similarity. Review to ensure no unintended duplication.\n';
      report += '- Consider extracting common functionality into shared utilities.\n';
    }
    report += '\n---\n\n';
  }

  return report;
}

/**
 * Main execution
 */
function main() {
  const projectRoot = process.cwd();
  const srcDir = path.join(projectRoot, 'src');

  if (!fs.existsSync(srcDir)) {
    console.log('ℹ️  No src/ directory found. Skipping code health check.');
    process.exit(0);
  }

  console.log('🔍 Scanning codebase for potential duplicates...\n');

  const files = scanDirectory(srcDir);
  const modules = files.map(analyzeModule);

  console.log(`📊 Analyzed ${modules.length} modules\n`);

  const duplicates = findDuplicates(modules);
  const report = generateDeprecationPlan(duplicates);

  console.log(report);

  // Create deprecation plan file if duplicates found
  if (duplicates.length > 0) {
    const planPath = path.join(projectRoot, 'DEPRECATION_PLAN.md');
    fs.writeFileSync(planPath, report);
    console.log(`\n📝 Deprecation plan saved to: ${planPath}`);
  }

  process.exit(0);
}

main();
