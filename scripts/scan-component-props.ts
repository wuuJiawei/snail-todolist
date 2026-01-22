#!/usr/bin/env ts-node

/**
 * Script to scan React components and identify which ones need explicit Props interfaces
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComponentInfo {
  filePath: string;
  componentName: string;
  hasPropsInterface: boolean;
  propsPattern: string;
  lineNumber: number;
}

const COMPONENTS_DIR = path.join(process.cwd(), 'web/src/components');

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function analyzeComponent(filePath: string): ComponentInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const components: ComponentInfo[] = [];
  
  // Patterns to match React components
  const functionComponentPattern = /^(?:export\s+(?:default\s+)?)?function\s+([A-Z][a-zA-Z0-9]*)\s*\(/;
  const arrowComponentPattern = /^(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*[:=]\s*(?:React\.FC|React\.FunctionComponent)?/;
  const reactFCPattern = /^(?:export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*:\s*React\.FC/;
  
  // Pattern to match Props interface
  const propsInterfacePattern = /^interface\s+([A-Z][a-zA-Z0-9]*)Props\s*\{/;
  
  // Track which Props interfaces exist
  const existingPropsInterfaces = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(propsInterfacePattern);
    if (match) {
      existingPropsInterfaces.add(match[1]);
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for function component
    let match = line.match(functionComponentPattern);
    if (match) {
      const componentName = match[1];
      const hasPropsInterface = existingPropsInterfaces.has(componentName);
      
      // Check if component has props parameter
      const fullLine = lines[i];
      const propsMatch = fullLine.match(/function\s+[A-Z][a-zA-Z0-9]*\s*\(([^)]*)\)/);
      const hasProps = propsMatch && propsMatch[1].trim().length > 0;
      
      if (hasProps) {
        components.push({
          filePath,
          componentName,
          hasPropsInterface,
          propsPattern: propsMatch[1].trim(),
          lineNumber: i + 1
        });
      }
      continue;
    }
    
    // Check for arrow function component
    match = line.match(arrowComponentPattern);
    if (match) {
      const componentName = match[1];
      const hasPropsInterface = existingPropsInterfaces.has(componentName);
      
      // Check if component has props parameter
      const fullLine = lines[i];
      const propsMatch = fullLine.match(/=\s*\(([^)]*)\)\s*=>/);
      const hasProps = propsMatch && propsMatch[1].trim().length > 0;
      
      if (hasProps) {
        components.push({
          filePath,
          componentName,
          hasPropsInterface,
          propsPattern: propsMatch[1].trim(),
          lineNumber: i + 1
        });
      }
      continue;
    }
    
    // Check for React.FC pattern
    match = line.match(reactFCPattern);
    if (match) {
      const componentName = match[1];
      const hasPropsInterface = existingPropsInterfaces.has(componentName);
      
      // React.FC components typically have props in the generic
      const genericMatch = line.match(/React\.FC<([^>]+)>/);
      const hasProps = genericMatch && genericMatch[1].trim().length > 0;
      
      if (hasProps) {
        components.push({
          filePath,
          componentName,
          hasPropsInterface,
          propsPattern: genericMatch[1].trim(),
          lineNumber: i + 1
        });
      }
    }
  }
  
  return components;
}

function main() {
  console.log('Scanning React components for Props interfaces...\n');
  
  const files = getAllTsxFiles(COMPONENTS_DIR);
  const allComponents: ComponentInfo[] = [];
  
  for (const file of files) {
    const components = analyzeComponent(file);
    allComponents.push(...components);
  }
  
  // Separate components with and without Props interfaces
  const withoutProps = allComponents.filter(c => !c.hasPropsInterface);
  const withProps = allComponents.filter(c => c.hasPropsInterface);
  
  console.log(`Total components analyzed: ${allComponents.length}`);
  console.log(`Components with explicit Props interface: ${withProps.length}`);
  console.log(`Components WITHOUT explicit Props interface: ${withoutProps.length}\n`);
  
  if (withoutProps.length > 0) {
    console.log('Components needing Props interfaces:\n');
    console.log('='.repeat(80));
    
    for (const component of withoutProps) {
      const relativePath = path.relative(process.cwd(), component.filePath);
      console.log(`\nFile: ${relativePath}`);
      console.log(`Component: ${component.componentName} (line ${component.lineNumber})`);
      console.log(`Current props: ${component.propsPattern}`);
      console.log('-'.repeat(80));
    }
  }
  
  // Write results to a file for reference
  const outputPath = path.join(process.cwd(), '.kiro/specs/web-code-optimization/components-props-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    totalComponents: allComponents.length,
    withPropsInterface: withProps.length,
    withoutPropsInterface: withoutProps.length,
    componentsNeedingProps: withoutProps.map(c => ({
      file: path.relative(process.cwd(), c.filePath),
      component: c.componentName,
      line: c.lineNumber,
      currentProps: c.propsPattern
    }))
  }, null, 2));
  
  console.log(`\n\nAnalysis saved to: ${path.relative(process.cwd(), outputPath)}`);
}

main();
