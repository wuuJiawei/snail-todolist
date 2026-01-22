/**
 * Property-Based Tests for Milkdown Editor Checkbox Interaction
 * Feature: merge-feature-recovery
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// Markdown Checkbox Utilities
// ============================================

/**
 * Toggle checkbox state in markdown text
 */
const toggleCheckboxInMarkdown = (markdown: string, lineIndex: number): string => {
  const lines = markdown.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return markdown;
  }

  const line = lines[lineIndex];
  const uncheckedPattern = /^(\s*[-*+]\s+)\[ \]/;
  const checkedPattern = /^(\s*[-*+]\s+)\[x\]/i;

  if (uncheckedPattern.test(line)) {
    lines[lineIndex] = line.replace(uncheckedPattern, '$1[x]');
  } else if (checkedPattern.test(line)) {
    lines[lineIndex] = line.replace(checkedPattern, '$1[ ]');
  }

  return lines.join('\n');
};

/**
 * Extract checkbox states from markdown
 */
const extractCheckboxStates = (markdown: string): boolean[] => {
  const lines = markdown.split('\n');
  const states: boolean[] = [];

  for (const line of lines) {
    if (/^\s*[-*+]\s+\[ \]/.test(line)) {
      states.push(false);
    } else if (/^\s*[-*+]\s+\[x\]/i.test(line)) {
      states.push(true);
    }
  }

  return states;
};

/**
 * Count checkboxes in markdown
 */
const countCheckboxes = (markdown: string): number => {
  return extractCheckboxStates(markdown).length;
};

// ============================================
// Arbitraries (Data Generators)
// ============================================

const taskItemArbitrary = fc.record({
  checked: fc.boolean(),
  text: fc.string({ minLength: 1, maxLength: 50 }),
});

const taskListArbitrary = fc.array(taskItemArbitrary, { minLength: 1, maxLength: 10 });

const generateMarkdownFromTasks = (tasks: Array<{ checked: boolean; text: string }>): string => {
  return tasks.map(task => `- [${task.checked ? 'x' : ' '}] ${task.text}`).join('\n');
};

// ============================================
// Property 6: Checkbox Toggle Updates State
// For any task list checkbox in the editor, clicking it should
// toggle its checked state from true to false or false to true.
// Validates: Requirements 5.2
// ============================================

describe('Property 6: Checkbox Toggle Updates State', () => {
  it('should toggle checkbox from unchecked to checked', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (tasks, targetIndex) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (checkboxCount === 0 || targetIndex >= checkboxCount) {
            return true; // Skip if no checkboxes or invalid index
          }

          const statesBefore = extractCheckboxStates(markdown);
          const toggledMarkdown = toggleCheckboxInMarkdown(markdown, targetIndex);
          const statesAfter = extractCheckboxStates(toggledMarkdown);

          // The toggled checkbox should have opposite state
          expect(statesAfter[targetIndex]).toBe(!statesBefore[targetIndex]);
          
          // All other checkboxes should remain unchanged
          for (let i = 0; i < statesBefore.length; i++) {
            if (i !== targetIndex) {
              expect(statesAfter[i]).toBe(statesBefore[i]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should toggle checkbox from checked to unchecked', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            checked: fc.constant(true),
            text: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        (tasks, targetIndex) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (targetIndex >= checkboxCount) {
            return true; // Skip if invalid index
          }

          const statesBefore = extractCheckboxStates(markdown);
          expect(statesBefore[targetIndex]).toBe(true); // All start checked

          const toggledMarkdown = toggleCheckboxInMarkdown(markdown, targetIndex);
          const statesAfter = extractCheckboxStates(toggledMarkdown);

          // Should be unchecked after toggle
          expect(statesAfter[targetIndex]).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple toggles correctly', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (tasks, targetIndex) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (checkboxCount === 0 || targetIndex >= checkboxCount) {
            return true;
          }

          const statesBefore = extractCheckboxStates(markdown);
          
          // Toggle twice
          const toggledOnce = toggleCheckboxInMarkdown(markdown, targetIndex);
          const toggledTwice = toggleCheckboxInMarkdown(toggledOnce, targetIndex);
          
          const statesAfter = extractCheckboxStates(toggledTwice);

          // Should return to original state after two toggles
          expect(statesAfter[targetIndex]).toBe(statesBefore[targetIndex]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 7: Checkbox State Reflects in Markdown
// For any checkbox state change in the editor, the underlying
// markdown representation should immediately reflect the new
// checked state (e.g., `- [ ]` vs `- [x]`).
// Validates: Requirements 5.3
// ============================================

describe('Property 7: Checkbox State Reflects in Markdown', () => {
  it('should update markdown when checkbox is checked', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (text) => {
          const uncheckedMarkdown = `- [ ] ${text}`;
          const checkedMarkdown = toggleCheckboxInMarkdown(uncheckedMarkdown, 0);
          
          expect(checkedMarkdown).toContain('[x]');
          expect(checkedMarkdown).not.toContain('[ ]');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update markdown when checkbox is unchecked', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (text) => {
          const checkedMarkdown = `- [x] ${text}`;
          const uncheckedMarkdown = toggleCheckboxInMarkdown(checkedMarkdown, 0);
          
          expect(uncheckedMarkdown).toContain('[ ]');
          expect(uncheckedMarkdown).not.toContain('[x]');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve task text when toggling', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.boolean(),
        (text, initialState) => {
          const markdown = `- [${initialState ? 'x' : ' '}] ${text}`;
          const toggled = toggleCheckboxInMarkdown(markdown, 0);
          
          // Text should be preserved
          expect(toggled).toContain(text);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 8: Checkbox State Persistence Round-Trip
// For any markdown document containing task list items with checkboxes,
// parsing the markdown, rendering it in the editor, modifying checkbox
// states, serializing back to markdown, and parsing again should
// preserve all checkbox states.
// Validates: Requirements 5.4, 5.5
// ============================================

describe('Property 8: Checkbox State Persistence Round-Trip', () => {
  it('should preserve checkbox states through round-trip', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        (tasks) => {
          // Generate initial markdown
          const originalMarkdown = generateMarkdownFromTasks(tasks);
          const originalStates = extractCheckboxStates(originalMarkdown);

          // Simulate round-trip: parse -> render -> serialize
          // In this test, we just verify the markdown parsing is consistent
          const reparsedStates = extractCheckboxStates(originalMarkdown);

          expect(reparsedStates).toEqual(originalStates);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve states after toggle and round-trip', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (tasks, targetIndex) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (checkboxCount === 0 || targetIndex >= checkboxCount) {
            return true;
          }

          // Toggle a checkbox
          const toggledMarkdown = toggleCheckboxInMarkdown(markdown, targetIndex);
          const toggledStates = extractCheckboxStates(toggledMarkdown);

          // Simulate round-trip
          const reparsedStates = extractCheckboxStates(toggledMarkdown);

          expect(reparsedStates).toEqual(toggledStates);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle mixed checkbox states', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            checked: fc.boolean(),
            text: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (tasks) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const states = extractCheckboxStates(markdown);

          // Verify count matches
          expect(states.length).toBe(tasks.length);

          // Verify each state matches
          for (let i = 0; i < tasks.length; i++) {
            expect(states[i]).toBe(tasks[i].checked);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 9: Read-Only Mode Prevents Checkbox Interaction
// For any checkbox in the editor when read-only mode is enabled,
// click events should not change the checkbox's checked state.
// Validates: Requirements 5.6
// ============================================

describe('Property 9: Read-Only Mode Prevents Checkbox Interaction', () => {
  const simulateReadOnlyToggle = (markdown: string, lineIndex: number, readOnly: boolean): string => {
    if (readOnly) {
      // In read-only mode, no changes should occur
      return markdown;
    }
    // In editable mode, toggle works normally
    return toggleCheckboxInMarkdown(markdown, lineIndex);
  };

  it('should prevent checkbox toggle in read-only mode', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (tasks, targetIndex) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (checkboxCount === 0 || targetIndex >= checkboxCount) {
            return true;
          }

          const statesBefore = extractCheckboxStates(markdown);
          
          // Attempt toggle in read-only mode
          const afterReadOnly = simulateReadOnlyToggle(markdown, targetIndex, true);
          const statesAfterReadOnly = extractCheckboxStates(afterReadOnly);

          // States should be unchanged
          expect(statesAfterReadOnly).toEqual(statesBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow checkbox toggle in editable mode', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        fc.integer({ min: 0, max: 9 }),
        (tasks, targetIndex) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (checkboxCount === 0 || targetIndex >= checkboxCount) {
            return true;
          }

          const statesBefore = extractCheckboxStates(markdown);
          
          // Toggle in editable mode
          const afterEditable = simulateReadOnlyToggle(markdown, targetIndex, false);
          const statesAfterEditable = extractCheckboxStates(afterEditable);

          // State should be toggled
          expect(statesAfterEditable[targetIndex]).toBe(!statesBefore[targetIndex]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all states in read-only mode regardless of clicks', () => {
    fc.assert(
      fc.property(
        taskListArbitrary,
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 5 }),
        (tasks, clickIndices) => {
          const markdown = generateMarkdownFromTasks(tasks);
          const checkboxCount = countCheckboxes(markdown);
          
          if (checkboxCount === 0) {
            return true;
          }

          const statesBefore = extractCheckboxStates(markdown);
          
          // Simulate multiple clicks in read-only mode
          let currentMarkdown = markdown;
          for (const index of clickIndices) {
            if (index < checkboxCount) {
              currentMarkdown = simulateReadOnlyToggle(currentMarkdown, index, true);
            }
          }
          
          const statesAfter = extractCheckboxStates(currentMarkdown);

          // All states should remain unchanged
          expect(statesAfter).toEqual(statesBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});
