/**
 * Property-based tests for offline mode storage operations
 * Tests the unified operations module with IndexedDB adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { IndexedDBAdapter } from './indexeddb/IndexedDBAdapter';
import { Task } from '@/types/task';

// Mock the storage module to use IndexedDB directly for testing
vi.mock('./index', async () => {
  const { IndexedDBAdapter } = await import('./indexeddb/IndexedDBAdapter');
  const adapter = new IndexedDBAdapter();
  return {
    isOfflineMode: true,
    getStorage: () => adapter,
    initializeStorage: async () => {
      if (!adapter.isReady()) {
        await adapter.initialize();
      }
    },
  };
});

// Import after mocking
import * as operations from './operations';

describe('Offline Mode Task Operations', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = new IndexedDBAdapter();
    await adapter.initialize();
    
    // Clean up any existing data
    const tasks = await adapter.getTasks();
    for (const task of tasks) {
      await adapter.deleteTask(task.id);
    }
  });

  afterEach(async () => {
    // Clean up
    const tasks = await adapter.getTasks();
    for (const task of tasks) {
      await adapter.deleteTask(task.id);
    }
  });

  // Arbitraries for generating test data
  const taskTitleArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const taskDescriptionArb = fc.option(fc.string({ maxLength: 500 }), { nil: undefined });

  const createTaskInputArb = fc.record({
    title: taskTitleArb,
    description: taskDescriptionArb,
    completed: fc.boolean(),
    deleted: fc.constant(false),
    abandoned: fc.constant(false),
    flagged: fc.boolean(),
  });

  it('Property 7: Task CRUD operations work correctly in offline mode', async () => {
    await fc.assert(
      fc.asyncProperty(createTaskInputArb, async (taskInput) => {
        // Create task
        const created = await adapter.createTask(taskInput);
        expect(created).not.toBeNull();
        expect(created.id).toBeDefined();
        expect(created.title).toBe(taskInput.title);
        expect(created.completed).toBe(taskInput.completed);

        // Read task
        const read = await adapter.getTaskById(created.id);
        expect(read).not.toBeNull();
        expect(read!.id).toBe(created.id);
        expect(read!.title).toBe(taskInput.title);

        // Update task
        const newTitle = taskInput.title + ' (updated)';
        const updated = await adapter.updateTask(created.id, { title: newTitle });
        expect(updated).not.toBeNull();
        expect(updated!.title).toBe(newTitle);

        // Verify update persisted
        const readAfterUpdate = await adapter.getTaskById(created.id);
        expect(readAfterUpdate!.title).toBe(newTitle);

        // Delete task
        const deleted = await adapter.deleteTask(created.id);
        expect(deleted).toBe(true);

        // Verify deletion
        const readAfterDelete = await adapter.getTaskById(created.id);
        expect(readAfterDelete).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7.1: Move to trash and restore work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(createTaskInputArb, async (taskInput) => {
        // Create task
        const created = await adapter.createTask(taskInput);
        expect(created.deleted).toBe(false);

        // Move to trash
        const trashed = await adapter.updateTask(created.id, {
          deleted: true,
          deleted_at: new Date().toISOString(),
        });
        expect(trashed).not.toBeNull();
        expect(trashed!.deleted).toBe(true);
        expect(trashed!.deleted_at).toBeDefined();

        // Verify task appears in deleted filter
        const deletedTasks = await adapter.getTasks({ deleted: true });
        expect(deletedTasks.some(t => t.id === created.id)).toBe(true);

        // Verify task doesn't appear in active filter
        const activeTasks = await adapter.getTasks({ deleted: false });
        expect(activeTasks.some(t => t.id === created.id)).toBe(false);

        // Restore from trash
        const restored = await adapter.updateTask(created.id, {
          deleted: false,
          deleted_at: undefined,
        });
        expect(restored).not.toBeNull();
        expect(restored!.deleted).toBe(false);

        // Verify task appears in active filter again
        const activeTasksAfterRestore = await adapter.getTasks({ deleted: false });
        expect(activeTasksAfterRestore.some(t => t.id === created.id)).toBe(true);

        // Cleanup
        await adapter.deleteTask(created.id);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7.2: Abandon and restore work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(createTaskInputArb, async (taskInput) => {
        // Create task
        const created = await adapter.createTask({ ...taskInput, completed: false });
        expect(created.abandoned).toBe(false);

        // Abandon task
        const abandoned = await adapter.updateTask(created.id, {
          abandoned: true,
          abandoned_at: new Date().toISOString(),
          completed: false,
          completed_at: undefined,
        });
        expect(abandoned).not.toBeNull();
        expect(abandoned!.abandoned).toBe(true);
        expect(abandoned!.abandoned_at).toBeDefined();

        // Verify task appears in abandoned filter
        const abandonedTasks = await adapter.getTasks({ abandoned: true });
        expect(abandonedTasks.some(t => t.id === created.id)).toBe(true);

        // Restore from abandoned
        const restored = await adapter.updateTask(created.id, {
          abandoned: false,
          abandoned_at: undefined,
        });
        expect(restored).not.toBeNull();
        expect(restored!.abandoned).toBe(false);

        // Cleanup
        await adapter.deleteTask(created.id);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7.3: Completion toggle works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(createTaskInputArb, async (taskInput) => {
        // Create incomplete task
        const created = await adapter.createTask({ ...taskInput, completed: false });
        expect(created.completed).toBe(false);
        expect(created.completed_at).toBeUndefined();

        // Complete task
        const completed = await adapter.updateTask(created.id, {
          completed: true,
          completed_at: new Date().toISOString(),
        });
        expect(completed).not.toBeNull();
        expect(completed!.completed).toBe(true);
        expect(completed!.completed_at).toBeDefined();

        // Uncomplete task
        const uncompleted = await adapter.updateTask(created.id, {
          completed: false,
          completed_at: undefined,
        });
        expect(uncompleted).not.toBeNull();
        expect(uncompleted!.completed).toBe(false);

        // Cleanup
        await adapter.deleteTask(created.id);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7.4: Batch sort order update works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(createTaskInputArb, { minLength: 2, maxLength: 5 }),
        async (taskInputs) => {
          // Create multiple tasks
          const createdTasks: Task[] = [];
          for (const input of taskInputs) {
            const task = await adapter.createTask(input);
            createdTasks.push(task);
          }

          // Generate new sort orders
          const updates = createdTasks.map((task, index) => ({
            id: task.id,
            sort_order: (index + 1) * 1000,
          }));

          // Batch update
          const success = await adapter.batchUpdateSortOrder(updates);
          expect(success).toBe(true);

          // Verify sort orders
          for (const update of updates) {
            const task = await adapter.getTaskById(update.id);
            expect(task).not.toBeNull();
            expect(task!.sort_order).toBe(update.sort_order);
          }

          // Cleanup
          for (const task of createdTasks) {
            await adapter.deleteTask(task.id);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 7.5: Flagged filter works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(createTaskInputArb, async (taskInput) => {
        // Create unflagged task
        const created = await adapter.createTask({ ...taskInput, flagged: false });
        expect(created.flagged).toBe(false);

        // Flag task
        const flagged = await adapter.updateTask(created.id, { flagged: true });
        expect(flagged).not.toBeNull();
        expect(flagged!.flagged).toBe(true);

        // Verify task appears in flagged filter
        const flaggedTasks = await adapter.getTasks({ flagged: true, deleted: false, abandoned: false });
        expect(flaggedTasks.some(t => t.id === created.id)).toBe(true);

        // Unflag task
        const unflagged = await adapter.updateTask(created.id, { flagged: false });
        expect(unflagged).not.toBeNull();
        expect(unflagged!.flagged).toBe(false);

        // Cleanup
        await adapter.deleteTask(created.id);
      }),
      { numRuns: 100 }
    );
  });
});
