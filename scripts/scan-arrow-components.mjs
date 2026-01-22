#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Recursively find all .tsx files in a directory
function findTsxFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Check if a file contains arrow function component definitions
function hasArrowFunctionComponent(content) {
  // Pattern 1: const ComponentName = () => { or const ComponentName: React.FC = () => {
  const pattern1 = /^(export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*[:=]\s*(\(.*?\)\s*)?=>/m;
  
  // Pattern 2: export const ComponentName = () => {
  const pattern2 = /^export\s+const\s+([A-Z][a-zA-Z0-9]*)\s*:\s*React\.FC/m;
  
  return pattern1.test(content) || pattern2.test(content);
}

// Extract component name from arrow function
function extractComponentName(content) {
  const patterns = [
    /^(export\s+)?const\s+([A-Z][a-zA-Z0-9]*)\s*[:=]/m,
    /^export\s+const\s+([A-Z][a-zA-Z0-9]*)\s*:/m
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[2] || match[1];
    }
  }
  
  return null;
}

// Main execution
const componentsDir = join(rootDir, 'web', 'src', 'components');
const files = findTsxFiles(componentsDir);

console.log('Scanning for arrow function components...\n');

const arrowComponents = [];

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  
  if (hasArrowFunctionComponent(content)) {
    const relativePath = relative(join(rootDir, 'web', 'src'), file);
    const componentName = extractComponentName(content);
    arrowComponents.push({ path: relativePath, name: componentName });
  }
}

if (arrowComponents.length === 0) {
  console.log('✅ No arrow function components found!');
} else {
  console.log(`Found ${arrowComponents.length} components using arrow functions:\n`);
  
  for (const { path, name } of arrowComponents) {
    console.log(`  - ${path} (${name || 'unknown'})`);
  }
}

console.log(`\nTotal files scanned: ${files.length}`);
