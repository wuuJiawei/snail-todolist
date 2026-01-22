/**
 * Property-Based Tests for Hook Return Types
 * Feature: web-code-optimization
 * 
 * **Validates: Requirements 1.4, 6.2**
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// File System Utilities
// ============================================

interface HookAnalysisResult {
  filePath: string;
  hooks: Array<{
    name: string;
    lineNumber: number;
    hasExplicitReturnType: boolean;
    signature: string;
    isExported: boolean;
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
      // Skip test files and declaration files
      if (!file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && !file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Check if a function has an explicit return type annotation
 */
function hasExplicitReturnType(signature: string): boolean {
  // Remove comments and strings to avoid false positives
  const cleanSignature = signature
    .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Pattern to match return type annotation
  // Matches: ): ReturnType or ): Promise<ReturnType> or ): void, etc.
  // Must come after the closing parenthesis of parameters
  const returnTypePattern = /\)\s*:\s*[A-Za-z_$][\w$<>[\]|&,\s.]*(?:\s*=>|\s*{|\s*;)/;

  return returnTypePattern.test(cleanSignature);
}

/**
 * Extract function signature from multiple lines
 */
function extractFunctionSignature(
  lines: string[],
  startIndex: number
): { signature: string; endIndex: number } {
  let signature = '';
  let currentIndex = startIndex;
  let braceCount = 0;
  let parenCount = 0;
  let foundOpenParen = false;
  let foundCloseParen = false;

  // Collect lines until we find the complete function signature (up to opening brace or arrow)
  while (currentIndex < lines.length && currentIndex < startIndex + 20) {
    const currentLine = lines[currentIndex];
    signature += (currentIndex > startIndex ? ' ' : '') + currentLine;

    for (const char of currentLine) {
      if (char === '(') {
        foundOpenParen = true;
        parenCount++;
      } else if (char === ')') {
        parenCount--;
        if (foundOpenParen && parenCount === 0) {
          foundCloseParen = true;
        }
      } else if (char === '{') {
        braceCount++;
        if (foundCloseParen && braceCount === 1) {
          // Found the opening brace of function body
          return { signature: signature.trim(), endIndex: currentIndex };
        }
      }
    }

    // Check for arrow function
    if (foundCloseParen && currentLine.includes('=>')) {
      return { signature: signature.trim(), endIndex: currentIndex };
    }

    currentIndex++;
  }

  return { signature: signature.trim(), endIndex: currentIndex };
}

/**
 * Analyze a TypeScript file for custom hooks and their return types
 */
function analyzeHookReturnTypes(filePath: string): HookAnalysisResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const hooks: Array<{
    name: string;
    lineNumber: number;
    hasExplicitReturnType: boolean;
    signature: string;
    isExported: boolean;
  }> = [];

  // Patterns to match custom hooks (functions starting with "use")
  // 1. export function useHookName
  // 2. export const useHookName = function
  // 3. export const useHookName = () =>
  // 4. function useHookName (non-exported)
  // 5. const useHookName = () => (non-exported)

  const exportedHookNames = new Set<string>();

  // First pass: collect hook names from export statements
  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Match: export { useHookName, useAnotherHook }
    const namedExportMatch = trimmedLine.match(/export\s*{([^}]+)}/);
    if (namedExportMatch) {
      const names = namedExportMatch[1].split(',');
      names.forEach((name) => {
        const cleanName = name.trim().split(/\s+as\s+/)[0].trim();
        if (cleanName.startsWith('use')) {
          exportedHookNames.add(cleanName);
        }
      });
    }
  });

  // Second pass: analyze hook declarations
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Pattern 1: export function useHookName
    const exportFunctionMatch = trimmedLine.match(
      /^export\s+(?:default\s+)?function\s+(use[a-zA-Z_$][\w$]*)\s*[<(]/
    );

    if (exportFunctionMatch) {
      const hookName = exportFunctionMatch[1];
      const { signature } = extractFunctionSignature(lines, index);

      hooks.push({
        name: hookName,
        lineNumber: index + 1,
        hasExplicitReturnType: hasExplicitReturnType(signature),
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        isExported: true,
      });

      return;
    }

    // Pattern 2 & 3: export const useHookName = function or export const useHookName = () =>
    const exportConstMatch = trimmedLine.match(
      /^export\s+const\s+(use[a-zA-Z_$][\w$]*)\s*=\s*(?:function|\()/
    );

    if (exportConstMatch) {
      const hookName = exportConstMatch[1];
      const { signature } = extractFunctionSignature(lines, index);

      hooks.push({
        name: hookName,
        lineNumber: index + 1,
        hasExplicitReturnType: hasExplicitReturnType(signature),
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        isExported: true,
      });

      return;
    }

    // Pattern 4: Regular function useHookName that might be exported via export { useHookName }
    const functionMatch = trimmedLine.match(
      /^(?:export\s+)?function\s+(use[a-zA-Z_$][\w$]*)\s*[<(]/
    );

    if (functionMatch) {
      const hookName = functionMatch[1];
      const isExported = trimmedLine.startsWith('export') || exportedHookNames.has(hookName);
      const { signature } = extractFunctionSignature(lines, index);

      hooks.push({
        name: hookName,
        lineNumber: index + 1,
        hasExplicitReturnType: hasExplicitReturnType(signature),
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        isExported,
      });

      return;
    }

    // Pattern 5: const useHookName = () => that might be exported via export { useHookName }
    const constFunctionMatch = trimmedLine.match(
      /^const\s+(use[a-zA-Z_$][\w$]*)\s*=\s*(?:function|\()/
    );

    if (constFunctionMatch) {
      const hookName = constFunctionMatch[1];
      const isExported = exportedHookNames.has(hookName);
      const { signature } = extractFunctionSignature(lines, index);

      hooks.push({
        name: hookName,
        lineNumber: index + 1,
        hasExplicitReturnType: hasExplicitReturnType(signature),
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        isExported,
      });
    }
  });

  return {
    filePath,
    hooks,
  };
}

// ============================================
// Property 4: Hook Return Types
// For all custom hooks (functions starting with "use"), explicit return type annotations should be present.
// **Validates: Requirements 1.4, 6.2**
// ============================================

describe('Property 4: Hook Return Types', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const allFiles = getAllTypeScriptFiles(srcDir);

  it('should scan at least 100 TypeScript files', () => {
    expect(allFiles.length).toBeGreaterThanOrEqual(100);
  });

  it('should have explicit return type annotations for all custom hooks', () => {
    const hooksWithoutReturnType: Array<{
      file: string;
      hook: string;
      line: number;
      signature: string;
      isExported: boolean;
    }> = [];

    allFiles.forEach((filePath) => {
      const result = analyzeHookReturnTypes(filePath);

      result.hooks.forEach((hook) => {
        if (!hook.hasExplicitReturnType) {
          const relativePath = path.relative(srcDir, filePath);
          hooksWithoutReturnType.push({
            file: relativePath,
            hook: hook.name,
            line: hook.lineNumber,
            signature: hook.signature,
            isExported: hook.isExported,
          });
        }
      });
    });

    if (hooksWithoutReturnType.length > 0) {
      const errorMessage = [
        '\n❌ Found custom hooks without explicit return type annotations:\n',
        ...hooksWithoutReturnType.map((item) => {
          return [
            `  📄 ${item.file}`,
            `     Hook: ${item.hook} (line ${item.line})`,
            `     Exported: ${item.isExported ? 'Yes' : 'No'}`,
            `     Current: ${item.signature}`,
            `     Expected: Add ": HookReturnType" before the function body`,
          ].join('\n');
        }),
        '\n💡 To fix: Add explicit return type annotation to the hook signature.',
        '   Example:',
        '   interface UseMyHookReturn {',
        '     value: string;',
        '     setValue: (newValue: string) => void;',
        '   }',
        '   ',
        '   export function useMyHook(): UseMyHookReturn {',
        '     // hook implementation',
        '     return { value, setValue };',
        '   }',
      ].join('\n');

      expect(hooksWithoutReturnType).toEqual([]);
      throw new Error(errorMessage);
    }

    expect(hooksWithoutReturnType).toEqual([]);
  });

  it('should report statistics on hook return types', () => {
    const stats = {
      totalFiles: allFiles.length,
      totalHooks: 0,
      hooksWithReturnType: 0,
      hooksWithoutReturnType: 0,
      exportedHooks: 0,
      nonExportedHooks: 0,
    };

    allFiles.forEach((filePath) => {
      const result = analyzeHookReturnTypes(filePath);

      stats.totalHooks += result.hooks.length;

      result.hooks.forEach((hook) => {
        if (hook.hasExplicitReturnType) {
          stats.hooksWithReturnType++;
        } else {
          stats.hooksWithoutReturnType++;
        }

        if (hook.isExported) {
          stats.exportedHooks++;
        } else {
          stats.nonExportedHooks++;
        }
      });
    });

    console.log('\n📊 Hook Return Types Statistics:');
    console.log(`   Total TypeScript files scanned: ${stats.totalFiles}`);
    console.log(`   Total custom hooks analyzed: ${stats.totalHooks}`);
    console.log(`   Hooks with explicit return type: ${stats.hooksWithReturnType}`);
    console.log(`   Hooks without explicit return type: ${stats.hooksWithoutReturnType}`);
    console.log(`   Exported hooks: ${stats.exportedHooks}`);
    console.log(`   Non-exported hooks: ${stats.nonExportedHooks}`);

    // This test always passes but provides useful statistics
    expect(stats.totalFiles).toBeGreaterThan(0);
  });
});
