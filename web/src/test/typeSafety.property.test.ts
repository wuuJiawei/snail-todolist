/**
 * Property-Based Tests for TypeScript Type Safety
 * Feature: web-code-optimization
 * 
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// File System Utilities
// ============================================

interface FileAnalysisResult {
  filePath: string;
  hasAnyType: boolean;
  anyTypeLocations: Array<{
    line: number;
    content: string;
    hasJustification: boolean;
  }>;
}

/**
 * Recursively get all TypeScript files in a directory
 */
function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getAllTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Skip declaration files
      if (!file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Check if a line has justification for using `any`
 * Justification can be:
 * 1. ESLint disable comment on the same or previous line
 * 2. A comment explaining why `any` is necessary
 */
function hasJustificationComment(lines: string[], lineIndex: number): boolean {
  const currentLine = lines[lineIndex];
  const previousLine = lineIndex > 0 ? lines[lineIndex - 1] : '';

  // Check for ESLint disable comments
  const eslintDisablePatterns = [
    /eslint-disable-next-line.*@typescript-eslint\/no-explicit-any/,
    /eslint-disable.*@typescript-eslint\/no-explicit-any/,
    /@ts-expect-error/,
    /@ts-ignore/,
  ];

  for (const pattern of eslintDisablePatterns) {
    if (pattern.test(previousLine) || pattern.test(currentLine)) {
      return true;
    }
  }

  // Check for justification keywords in comments
  const justificationKeywords = [
    'justified',
    'necessary',
    'required for',
    'needed for',
    'third-party',
    'external library',
    'legacy code',
  ];

  const commentPattern = /\/\/.*|\/\*[\s\S]*?\*\//;
  const previousLineComment = previousLine.match(commentPattern)?.[0] || '';
  const currentLineComment = currentLine.match(commentPattern)?.[0] || '';

  const combinedComments = (previousLineComment + ' ' + currentLineComment).toLowerCase();

  return justificationKeywords.some((keyword) =>
    combinedComments.includes(keyword.toLowerCase())
  );
}

/**
 * Analyze a TypeScript file for `any` type usage
 */
function analyzeFileForAnyTypes(filePath: string): FileAnalysisResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const anyTypeLocations: Array<{
    line: number;
    content: string;
    hasJustification: boolean;
  }> = [];

  // Patterns to detect `any` type usage
  // We need to be careful to avoid false positives like "company", "many", etc.
  const anyTypePatterns = [
    /:\s*any\b/,           // : any
    /:\s*any\s*\|/,        // : any |
    /:\s*any\s*\[/,        // : any[
    /:\s*any\s*>/,         // : any>
    /<any>/,               // <any>
    /<any,/,               // <any,
    /,\s*any>/,            // , any>
    /Array<any>/,          // Array<any>
    /Promise<any>/,        // Promise<any>
    /Record<.*,\s*any>/,   // Record<..., any>
    /\bas\s+any\b/,        // as any
  ];

  lines.forEach((line, index) => {
    // Skip comments and strings
    const lineWithoutStrings = line.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '');
    const lineWithoutComments = lineWithoutStrings.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Skip regex patterns (they might contain 'any' as part of the pattern)
    const lineWithoutRegex = lineWithoutComments.replace(/\/[^/]+\//g, '');

    // Check if line contains `any` type
    const hasAny = anyTypePatterns.some((pattern) => pattern.test(lineWithoutRegex));

    if (hasAny) {
      const hasJustification = hasJustificationComment(lines, index);
      anyTypeLocations.push({
        line: index + 1,
        content: line.trim(),
        hasJustification,
      });
    }
  });

  return {
    filePath,
    hasAnyType: anyTypeLocations.length > 0,
    anyTypeLocations,
  };
}

// ============================================
// Property 1: TypeScript Type Safety
// For all TypeScript files in the codebase, no `any` types should exist
// except where explicitly justified with a comment explaining why.
// **Validates: Requirements 1.1**
// ============================================

describe('Property 1: TypeScript Type Safety', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const allFiles = getAllTypeScriptFiles(srcDir);

  it('should scan at least 100 TypeScript files', () => {
    expect(allFiles.length).toBeGreaterThanOrEqual(100);
  });

  it('should not have unjustified `any` types in any file', () => {
    const filesWithUnjustifiedAny: Array<{
      file: string;
      violations: Array<{ line: number; content: string }>;
    }> = [];

    allFiles.forEach((filePath) => {
      const result = analyzeFileForAnyTypes(filePath);

      const unjustifiedAny = result.anyTypeLocations.filter(
        (location) => !location.hasJustification
      );

      if (unjustifiedAny.length > 0) {
        const relativePath = path.relative(srcDir, filePath);
        filesWithUnjustifiedAny.push({
          file: relativePath,
          violations: unjustifiedAny.map((loc) => ({
            line: loc.line,
            content: loc.content,
          })),
        });
      }
    });

    if (filesWithUnjustifiedAny.length > 0) {
      const errorMessage = [
        '\n❌ Found unjustified `any` types in the following files:\n',
        ...filesWithUnjustifiedAny.map((file) => {
          const violations = file.violations
            .map((v) => `    Line ${v.line}: ${v.content}`)
            .join('\n');
          return `  📄 ${file.file}\n${violations}`;
        }),
        '\n💡 To fix: Either replace `any` with proper types, or add a justification comment.',
        '   Example: // eslint-disable-next-line @typescript-eslint/no-explicit-any',
      ].join('\n');

      expect(filesWithUnjustifiedAny).toEqual([]);
      throw new Error(errorMessage);
    }

    expect(filesWithUnjustifiedAny).toEqual([]);
  });

  it('should report statistics on type safety', () => {
    const stats = {
      totalFiles: allFiles.length,
      filesWithAny: 0,
      totalAnyUsages: 0,
      justifiedAnyUsages: 0,
      unjustifiedAnyUsages: 0,
    };

    allFiles.forEach((filePath) => {
      const result = analyzeFileForAnyTypes(filePath);

      if (result.hasAnyType) {
        stats.filesWithAny++;
        stats.totalAnyUsages += result.anyTypeLocations.length;

        result.anyTypeLocations.forEach((location) => {
          if (location.hasJustification) {
            stats.justifiedAnyUsages++;
          } else {
            stats.unjustifiedAnyUsages++;
          }
        });
      }
    });

    console.log('\n📊 Type Safety Statistics:');
    console.log(`   Total TypeScript files scanned: ${stats.totalFiles}`);
    console.log(`   Files with \`any\` types: ${stats.filesWithAny}`);
    console.log(`   Total \`any\` usages: ${stats.totalAnyUsages}`);
    console.log(`   Justified \`any\` usages: ${stats.justifiedAnyUsages}`);
    console.log(`   Unjustified \`any\` usages: ${stats.unjustifiedAnyUsages}`);

    // This test always passes but provides useful statistics
    expect(stats.totalFiles).toBeGreaterThan(0);
  });
});
