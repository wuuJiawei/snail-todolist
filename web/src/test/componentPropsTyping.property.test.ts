/**
 * Property-Based Tests for Component Props Typing
 * Feature: web-code-optimization
 * 
 * **Validates: Requirements 1.2, 2.2**
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// File System Utilities
// ============================================

interface ComponentAnalysisResult {
  filePath: string;
  components: Array<{
    name: string;
    lineNumber: number;
    hasExplicitPropsType: boolean;
    propsPattern: string;
    propsTypeName?: string;
  }>;
}

/**
 * Recursively get all TypeScript/TSX files in a directory
 */
function getAllComponentFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getAllComponentFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      // Skip test files and declaration files
      if (!file.endsWith('.test.ts') && !file.endsWith('.test.tsx') && !file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Collect all Props interface and type definitions in a file
 */
function collectPropsDefinitions(content: string): Set<string> {
  const propsTypes = new Set<string>();
  
  // Patterns to match Props interfaces and types
  // Updated to handle extends, implements, and multi-line definitions
  const patterns = [
    /(?:export\s+)?interface\s+([A-Z][a-zA-Z0-9]*Props)\s*(?:[{<\s]|extends|implements)/g,
    /(?:export\s+)?type\s+([A-Z][a-zA-Z0-9]*Props)\s*=/g,
    /(?:export\s+)?interface\s+(I[A-Z][a-zA-Z0-9]*Props)\s*(?:[{<\s]|extends|implements)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      propsTypes.add(match[1]);
    }
  }

  return propsTypes;
}

/**
 * Check if component uses explicit Props type
 */
function hasExplicitPropsType(
  componentName: string,
  propsPattern: string,
  availablePropsTypes: Set<string>
): { hasType: boolean; typeName?: string } {
  // Possible Props type names for this component
  const possibleTypeNames = [
    `${componentName}Props`,
    `${componentName}Properties`,
    `I${componentName}Props`,
  ];

  // Check if the props pattern uses any of the expected type names
  for (const typeName of possibleTypeNames) {
    if (propsPattern.includes(typeName) && availablePropsTypes.has(typeName)) {
      return { hasType: true, typeName };
    }
  }

  return { hasType: false };
}

/**
 * Extract props pattern from function signature
 */
function extractPropsFromFunctionSignature(
  lines: string[],
  startIndex: number
): string | null {
  let fullSignature = '';
  let currentIndex = startIndex;
  let parenCount = 0;
  let foundOpenParen = false;

  // Collect lines until we find the complete function signature
  while (currentIndex < lines.length && currentIndex < startIndex + 10) {
    const currentLine = lines[currentIndex];

    for (const char of currentLine) {
      if (char === '(') {
        foundOpenParen = true;
        parenCount++;
      } else if (char === ')') {
        parenCount--;
        if (foundOpenParen && parenCount === 0) {
          break;
        }
      }
    }

    fullSignature += ' ' + currentLine;

    if (foundOpenParen && parenCount === 0) {
      break;
    }

    currentIndex++;
  }

  // Extract props parameter
  const propsMatch = fullSignature.match(/function\s+[A-Z][a-zA-Z0-9]*\s*(?:<[^>]*>)?\s*\(([^)]*)\)/);
  if (propsMatch) {
    return propsMatch[1].trim();
  }

  return null;
}

/**
 * Analyze a file for React components and their Props typing
 */
function analyzeComponentPropsTyping(filePath: string): ComponentAnalysisResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // First pass: collect all Props type definitions in the file
  const availablePropsTypes = collectPropsDefinitions(content);

  const components: Array<{
    name: string;
    lineNumber: number;
    hasExplicitPropsType: boolean;
    propsPattern: string;
    propsTypeName?: string;
  }> = [];

  // Patterns to match React components
  const functionComponentPattern = /^(?:export\s+(?:default\s+)?)?function\s+([A-Z][a-zA-Z0-9]*)\s*[<(]/;
  const arrowComponentPattern = /^(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\(/;
  const reactFCPattern = /^(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*:\s*React\.FC/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return;
    }

    // Check for function component
    let match = trimmedLine.match(functionComponentPattern);
    if (match) {
      const componentName = match[1];
      const propsPattern = extractPropsFromFunctionSignature(lines, index);

      // Only analyze components that have props
      if (propsPattern && propsPattern !== '') {
        const typeCheck = hasExplicitPropsType(componentName, propsPattern, availablePropsTypes);

        components.push({
          name: componentName,
          lineNumber: index + 1,
          hasExplicitPropsType: typeCheck.hasType,
          propsPattern,
          propsTypeName: typeCheck.typeName,
        });
      }

      return;
    }

    // Check for arrow function component
    match = trimmedLine.match(arrowComponentPattern);
    if (match) {
      const componentName = match[1];

      // Extract props from arrow function (single line only for simplicity)
      const propsMatch = line.match(/=\s*\(([^)]*)\)\s*=>/);

      if (propsMatch) {
        const propsPattern = propsMatch[1].trim();

        // Only analyze components that have props
        if (propsPattern && propsPattern !== '') {
          const typeCheck = hasExplicitPropsType(componentName, propsPattern, availablePropsTypes);

          components.push({
            name: componentName,
            lineNumber: index + 1,
            hasExplicitPropsType: typeCheck.hasType,
            propsPattern,
            propsTypeName: typeCheck.typeName,
          });
        }
      }

      return;
    }

    // Check for React.FC pattern
    match = trimmedLine.match(reactFCPattern);
    if (match) {
      const componentName = match[1];

      // React.FC components have props in the generic
      const genericMatch = trimmedLine.match(/React\.FC<([^>]+)>/);

      if (genericMatch) {
        const propsTypeName = genericMatch[1].trim();

        // Only analyze if props are specified (not empty generic)
        if (propsTypeName && propsTypeName !== '') {
          // For React.FC, check if the generic type exists in available types
          const hasType = availablePropsTypes.has(propsTypeName);

          components.push({
            name: componentName,
            lineNumber: index + 1,
            hasExplicitPropsType: hasType,
            propsPattern: `React.FC<${propsTypeName}>`,
            propsTypeName: hasType ? propsTypeName : undefined,
          });
        }
      }
    }
  });

  return {
    filePath,
    components,
  };
}

// ============================================
// Property 2: Component Props Typing
// For all React components, an explicit Props interface or type should be
// defined and used in the component signature.
// **Validates: Requirements 1.2, 2.2**
// ============================================

describe('Property 2: Component Props Typing', () => {
  const componentsDir = path.join(process.cwd(), 'src', 'components');
  const allFiles = getAllComponentFiles(componentsDir);

  it('should scan at least 50 component files', () => {
    expect(allFiles.length).toBeGreaterThanOrEqual(50);
  });

  it('should have explicit Props interface or type for all components', () => {
    const componentsWithoutExplicitProps: Array<{
      file: string;
      component: string;
      line: number;
      propsPattern: string;
    }> = [];

    allFiles.forEach((filePath) => {
      const result = analyzeComponentPropsTyping(filePath);

      result.components.forEach((component) => {
        if (!component.hasExplicitPropsType) {
          const relativePath = path.relative(componentsDir, filePath);
          componentsWithoutExplicitProps.push({
            file: relativePath,
            component: component.name,
            line: component.lineNumber,
            propsPattern: component.propsPattern,
          });
        }
      });
    });

    if (componentsWithoutExplicitProps.length > 0) {
      const errorMessage = [
        '\n❌ Found components without explicit Props interface or type:\n',
        ...componentsWithoutExplicitProps.map((item) => {
          return [
            `  📄 ${item.file}`,
            `     Component: ${item.component} (line ${item.line})`,
            `     Current props: ${item.propsPattern}`,
            `     Expected: interface ${item.component}Props { ... }`,
          ].join('\n');
        }),
        '\n💡 To fix: Define an explicit Props interface or type before the component.',
        '   Example:',
        '   interface ComponentNameProps {',
        '     prop1: string;',
        '     prop2?: number;',
        '   }',
        '   function ComponentName(props: ComponentNameProps): JSX.Element { ... }',
      ].join('\n');

      expect(componentsWithoutExplicitProps).toEqual([]);
      throw new Error(errorMessage);
    }

    expect(componentsWithoutExplicitProps).toEqual([]);
  });

  it('should report statistics on component Props typing', () => {
    const stats = {
      totalFiles: allFiles.length,
      totalComponents: 0,
      componentsWithExplicitProps: 0,
      componentsWithoutExplicitProps: 0,
    };

    allFiles.forEach((filePath) => {
      const result = analyzeComponentPropsTyping(filePath);

      stats.totalComponents += result.components.length;

      result.components.forEach((component) => {
        if (component.hasExplicitPropsType) {
          stats.componentsWithExplicitProps++;
        } else {
          stats.componentsWithoutExplicitProps++;
        }
      });
    });

    console.log('\n📊 Component Props Typing Statistics:');
    console.log(`   Total component files scanned: ${stats.totalFiles}`);
    console.log(`   Total components analyzed: ${stats.totalComponents}`);
    console.log(`   Components with explicit Props type: ${stats.componentsWithExplicitProps}`);
    console.log(`   Components without explicit Props type: ${stats.componentsWithoutExplicitProps}`);

    // This test always passes but provides useful statistics
    expect(stats.totalFiles).toBeGreaterThan(0);
  });
});
