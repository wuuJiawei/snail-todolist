/**
 * Property-Based Tests for Exported Function Return Types
 * Feature: web-code-optimization
 * 
 * **Validates: Requirements 1.3**
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// File System Utilities
// ============================================

interface FunctionAnalysisResult {
  filePath: string;
  functions: Array<{
    name: string;
    lineNumber: number;
    hasExplicitReturnType: boolean;
    signature: string;
    isAsync: boolean;
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
  // Updated to handle:
  // - Regular types: ): string
  // - Object types: ): { ... }
  // - Function types: ): () => void or ): (...args) => void
  const returnTypePattern = /\)\s*:\s*(?:[A-Za-z_$][\w$<>[\]|&,\s.]*|{|\()/;

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
  let angleCount = 0; // Track angle brackets for generics
  let foundOpenParen = false;
  let foundCloseParen = false;
  let foundReturnType = false;

  // Collect lines until we find the complete function signature (up to opening brace or arrow)
  while (currentIndex < lines.length && currentIndex < startIndex + 20) {
    const currentLine = lines[currentIndex];
    signature += (currentIndex > startIndex ? ' ' : '') + currentLine;

    for (let i = 0; i < currentLine.length; i++) {
      const char = currentLine[i];
      
      if (char === '<') {
        angleCount++;
      } else if (char === '>') {
        angleCount--;
      } else if (char === '(') {
        foundOpenParen = true;
        parenCount++;
      } else if (char === ')') {
        parenCount--;
        if (foundOpenParen && parenCount === 0 && angleCount === 0) {
          foundCloseParen = true;
          // Check if next non-whitespace char is ':' indicating return type
          const remaining = currentLine.substring(i + 1).trim();
          if (remaining.startsWith(':')) {
            foundReturnType = true;
          }
        }
      } else if (char === '{') {
        braceCount++;
        // Only stop at opening brace if we've closed all parens/angles and it's the function body
        if (foundCloseParen && braceCount === 1 && parenCount === 0 && angleCount === 0) {
          // Found the opening brace of function body
          return { signature: signature.trim(), endIndex: currentIndex };
        }
      }
    }

    // Check for arrow function - but only if we're not in a return type or generic
    if (foundCloseParen && !foundReturnType && angleCount === 0 && currentLine.includes('=>')) {
      return { signature: signature.trim(), endIndex: currentIndex };
    }
    
    // If we found return type and now see => at the end, it's likely the function body starting
    if (foundReturnType && angleCount === 0 && currentLine.trim().endsWith('=>')) {
      // Continue to next line to get the opening brace
      currentIndex++;
      if (currentIndex < lines.length) {
        signature += ' ' + lines[currentIndex];
      }
      return { signature: signature.trim(), endIndex: currentIndex };
    }

    currentIndex++;
  }

  return { signature: signature.trim(), endIndex: currentIndex };
}

/**
 * Analyze a TypeScript file for exported functions and their return types
 */
function analyzeExportedFunctionReturnTypes(filePath: string): FunctionAnalysisResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const functions: Array<{
    name: string;
    lineNumber: number;
    hasExplicitReturnType: boolean;
    signature: string;
    isAsync: boolean;
  }> = [];

  // Patterns to match exported functions
  // 1. export function functionName
  // 2. export const functionName = function
  // 3. export const functionName = () =>
  // 4. export default function functionName
  // 5. export { functionName }

  const exportedFunctionNames = new Set<string>();

  // First pass: collect function names from export statements
  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Match: export { functionName, anotherFunction }
    const namedExportMatch = trimmedLine.match(/export\s*{([^}]+)}/);
    if (namedExportMatch) {
      const names = namedExportMatch[1].split(',');
      names.forEach((name) => {
        const cleanName = name.trim().split(/\s+as\s+/)[0].trim();
        exportedFunctionNames.add(cleanName);
      });
    }
  });

  // Second pass: analyze function declarations
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Pattern 1: export function functionName or export default function functionName
    const exportFunctionMatch = trimmedLine.match(
      /^export\s+(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*[<(]/
    );

    if (exportFunctionMatch) {
      const functionName = exportFunctionMatch[1];
      const isAsync = /async\s+function/.test(trimmedLine);
      const { signature } = extractFunctionSignature(lines, index);

      functions.push({
        name: functionName,
        lineNumber: index + 1,
        hasExplicitReturnType: hasExplicitReturnType(signature),
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        isAsync,
      });

      return;
    }

    // Pattern 2 & 3: export const functionName = function or export const functionName = () =>
    const exportConstMatch = trimmedLine.match(
      /^export\s+const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function|\()/
    );

    if (exportConstMatch) {
      const functionName = exportConstMatch[1];
      const isAsync = /async\s+(?:function|\()/.test(trimmedLine);
      const { signature } = extractFunctionSignature(lines, index);

      functions.push({
        name: functionName,
        lineNumber: index + 1,
        hasExplicitReturnType: hasExplicitReturnType(signature),
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        isAsync,
      });

      return;
    }

    // Pattern 4: Regular function that is exported via export { functionName }
    const functionMatch = trimmedLine.match(
      /^(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*[<(]/
    );

    if (functionMatch) {
      const functionName = functionMatch[1];

      // Check if this function is in the exported names set
      if (exportedFunctionNames.has(functionName)) {
        const isAsync = /^async\s+function/.test(trimmedLine);
        const { signature } = extractFunctionSignature(lines, index);

        functions.push({
          name: functionName,
          lineNumber: index + 1,
          hasExplicitReturnType: hasExplicitReturnType(signature),
          signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
          isAsync,
        });
      }

      return;
    }

    // Pattern 5: const functionName = () => that is exported via export { functionName }
    const constFunctionMatch = trimmedLine.match(
      /^const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function|\()/
    );

    if (constFunctionMatch) {
      const functionName = constFunctionMatch[1];

      // Check if this function is in the exported names set
      if (exportedFunctionNames.has(functionName)) {
        const isAsync = /async\s+(?:function|\()/.test(trimmedLine);
        const { signature } = extractFunctionSignature(lines, index);

        functions.push({
          name: functionName,
          lineNumber: index + 1,
          hasExplicitReturnType: hasExplicitReturnType(signature),
          signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
          isAsync,
        });
      }
    }
  });

  return {
    filePath,
    functions,
  };
}

// ============================================
// Property 3: Exported Function Return Types
// For all exported functions, explicit return type annotations should be present.
// **Validates: Requirements 1.3**
// ============================================

describe('Property 3: Exported Function Return Types', () => {
  const srcDir = path.join(process.cwd(), 'src');
  const allFiles = getAllTypeScriptFiles(srcDir);

  it('should scan at least 100 TypeScript files', () => {
    expect(allFiles.length).toBeGreaterThanOrEqual(100);
  });

  it('should have explicit return type annotations for all exported functions', () => {
    const functionsWithoutReturnType: Array<{
      file: string;
      function: string;
      line: number;
      signature: string;
      isAsync: boolean;
    }> = [];

    allFiles.forEach((filePath) => {
      const result = analyzeExportedFunctionReturnTypes(filePath);

      result.functions.forEach((func) => {
        if (!func.hasExplicitReturnType) {
          const relativePath = path.relative(srcDir, filePath);
          functionsWithoutReturnType.push({
            file: relativePath,
            function: func.name,
            line: func.lineNumber,
            signature: func.signature,
            isAsync: func.isAsync,
          });
        }
      });
    });

    if (functionsWithoutReturnType.length > 0) {
      const errorMessage = [
        '\n❌ Found exported functions without explicit return type annotations:\n',
        ...functionsWithoutReturnType.map((item) => {
          const suggestedReturnType = item.isAsync ? 'Promise<ReturnType>' : 'ReturnType';
          return [
            `  📄 ${item.file}`,
            `     Function: ${item.function} (line ${item.line})`,
            `     Current: ${item.signature}`,
            `     Expected: Add ": ${suggestedReturnType}" before the function body`,
          ].join('\n');
        }),
        '\n💡 To fix: Add explicit return type annotation to the function signature.',
        '   Example:',
        '   export function myFunction(param: string): ReturnType {',
        '     // function body',
        '   }',
        '   ',
        '   For async functions:',
        '   export async function myAsyncFunction(param: string): Promise<ReturnType> {',
        '     // function body',
        '   }',
      ].join('\n');

      expect(functionsWithoutReturnType).toEqual([]);
      throw new Error(errorMessage);
    }

    expect(functionsWithoutReturnType).toEqual([]);
  });

  it('should report statistics on exported function return types', () => {
    const stats = {
      totalFiles: allFiles.length,
      totalExportedFunctions: 0,
      functionsWithReturnType: 0,
      functionsWithoutReturnType: 0,
      asyncFunctions: 0,
    };

    allFiles.forEach((filePath) => {
      const result = analyzeExportedFunctionReturnTypes(filePath);

      stats.totalExportedFunctions += result.functions.length;

      result.functions.forEach((func) => {
        if (func.hasExplicitReturnType) {
          stats.functionsWithReturnType++;
        } else {
          stats.functionsWithoutReturnType++;
        }

        if (func.isAsync) {
          stats.asyncFunctions++;
        }
      });
    });

    console.log('\n📊 Exported Function Return Types Statistics:');
    console.log(`   Total TypeScript files scanned: ${stats.totalFiles}`);
    console.log(`   Total exported functions analyzed: ${stats.totalExportedFunctions}`);
    console.log(`   Functions with explicit return type: ${stats.functionsWithReturnType}`);
    console.log(`   Functions without explicit return type: ${stats.functionsWithoutReturnType}`);
    console.log(`   Async functions: ${stats.asyncFunctions}`);

    // This test always passes but provides useful statistics
    expect(stats.totalFiles).toBeGreaterThan(0);
  });
});
