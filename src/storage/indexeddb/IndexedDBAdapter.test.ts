/**
 * Property tests for IndexedDB Adapter
 * Feature: offline-mode
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { Task } from '@/types/task';
import { CreateTaskInput, TaskFilter, SortOptions } from '../types';

// Helper to create a fresh adapter for each test
const createAdapter = async (): Promise<IndexedDBAdapter> => {
  const adapter = new IndexedDBAdapter();
  await adapter.initialize();
  return adapter;
};

// Helper to clear all data from the database
const clearDatabase = async (adapter: IndexedDBAdapter): Promise<void> => {
  const tasks = await adapter.getTasks();
  for (const task of tasks) {
    await adapter.deleteTask(task.id);
  }
  const projects = await adapter.getProjects();
  for (const project of projects) {
    await adapter.deleteProject(project.id);
  }
  const tags = await adapter.getTags();
  for (const tag of tags) {
    await adapter.deleteTag(tag.id);
  }
};

// Arbitraries for generating test data
const taskTitleArb = fc.string({ minLength: 1, maxLength: 200 });
const taskDescriptionArb = fc.option(fc.string({ maxLength: 1000 }), { nil: undefined });
const taskDateArb = fc.option(
  fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => {
    // Ensure valid date before converting to ISO string
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    return d.toISOString();
  }),
  { nil: undefined }
);

const createTaskInputArb: fc.Arbitrary<CreateTaskInput> = fc.record({
  title: taskTitleArb,
  description: taskDescriptionArb,
  completed: fc.boolean(),
  flagged: fc.boolean(),
  date: taskDateArb,
  project: fc.option(fc.uuid(), { nil: undefined }),
  sort_order: fc.option(fc.integer({ min: -10000, max: 10000 }), { nil: undefined }),
});

describe('IndexedDB Adapter - Task Operations', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
    await clearDatabase(adapter);
  });

  afterEach(async () => {
    await clearDatabase(adapter);
  });

  describe('Property 2: Task CRUD Round-Trip', () => {
    /**
     * For any valid task data, creating a task and then reading it back
     * SHALL return an equivalent task object with all fields preserved.
     */
    it('should preserve task data through create-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(createTaskInputArb, async (taskInput) => {
          const created = await adapter.createTask(taskInput);
          const retrieved = await adapter.getTaskById(created.id);

          expect(retrieved).not.toBeNull();
          expect(retrieved!.id).toBe(created.id);
          expect(retrieved!.title).toBe(taskInput.title);
          expect(retrieved!.description).toBe(taskInput.description);
          expect(retrieved!.completed).toBe(taskInput.completed);
          expect(retrieved!.flagged).toBe(taskInput.flagged);
          expect(retrieved!.date).toBe(taskInput.date);
          expect(retrieved!.project).toBe(taskInput.project);

          // Cleanup
          await adapter.deleteTask(created.id);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Updating a task and reading it back SHALL reflect all changes.
     */
    it('should preserve task data through update-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          createTaskInputArb,
          createTaskInputArb,
          async (initialInput, updateInput) => {
            // Create initial task
            const created = await adapter.createTask(initialInput);

            // Update with new data
            const updates: Partial<Task> = {
              title: updateInput.title,
              description: updateInput.description,
              completed: updateInput.completed,
              flagged: updateInput.flagged,
              date: updateInput.date,
            };

            const updated = await adapter.updateTask(created.id, updates);
            expect(updated).not.toBeNull();

            // Verify updates
            const retrieved = await adapter.getTaskById(created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.title).toBe(updateInput.title);
            expect(retrieved!.description).toBe(updateInput.description);
            expect(retrieved!.completed).toBe(updateInput.completed);
            expect(retrieved!.flagged).toBe(updateInput.flagged);
            expect(retrieved!.date).toBe(updateInput.date);

            // ID should not change
            expect(retrieved!.id).toBe(created.id);

            // Cleanup
            await adapter.deleteTask(created.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Deleting a task SHALL make it unretrievable.
     */
    it('should make task unretrievable after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(createTaskInputArb, async (taskInput) => {
          const created = await adapter.createTask(taskInput);
          expect(await adapter.getTaskById(created.id)).not.toBeNull();

          const deleted = await adapter.deleteTask(created.id);
          expect(deleted).toBe(true);

          const retrieved = await adapter.getTaskById(created.id);
          expect(retrieved).toBeNull();
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 3: Task Filtering Correctness', () => {
    /**
     * For any set of tasks with various attributes, applying a filter
     * SHALL return exactly the tasks that match all specified filter criteria.
     */
    it('should correctly filter tasks by completed status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(createTaskInputArb, { minLength: 1, maxLength: 20 }),
          fc.boolean(),
          async (taskInputs, filterCompleted) => {
            // Create tasks
            const createdTasks: Task[] = [];
            for (const input of taskInputs) {
              const task = await adapter.createTask(input);
              createdTasks.push(task);
            }

            // Apply filter
            const filter: TaskFilter = { completed: filterCompleted };
            const filtered = await adapter.getTasks(filter);

            // Verify all returned tasks match the filter
            for (const task of filtered) {
              expect(task.completed).toBe(filterCompleted);
            }

            // Verify no matching tasks were missed
            const expectedCount = createdTasks.filter((t) => t.completed === filterCompleted).length;
            expect(filtered.length).toBe(expectedCount);

            // Cleanup
            for (const task of createdTasks) {
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should correctly filter tasks by flagged status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(createTaskInputArb, { minLength: 1, maxLength: 20 }),
          fc.boolean(),
          async (taskInputs, filterFlagged) => {
            // Create tasks
            const createdTasks: Task[] = [];
            for (const input of taskInputs) {
              const task = await adapter.createTask(input);
              createdTasks.push(task);
            }

            // Apply filter
            const filter: TaskFilter = { flagged: filterFlagged };
            const filtered = await adapter.getTasks(filter);

            // Verify all returned tasks match the filter
            for (const task of filtered) {
              expect(task.flagged).toBe(filterFlagged);
            }

            // Verify no matching tasks were missed
            const expectedCount = createdTasks.filter((t) => t.flagged === filterFlagged).length;
            expect(filtered.length).toBe(expectedCount);

            // Cleanup
            for (const task of createdTasks) {
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should correctly filter tasks by multiple criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(createTaskInputArb, { minLength: 1, maxLength: 20 }),
          fc.boolean(),
          fc.boolean(),
          async (taskInputs, filterCompleted, filterFlagged) => {
            // Create tasks
            const createdTasks: Task[] = [];
            for (const input of taskInputs) {
              const task = await adapter.createTask(input);
              createdTasks.push(task);
            }

            // Apply combined filter
            const filter: TaskFilter = {
              completed: filterCompleted,
              flagged: filterFlagged,
            };
            const filtered = await adapter.getTasks(filter);

            // Verify all returned tasks match ALL filter criteria
            for (const task of filtered) {
              expect(task.completed).toBe(filterCompleted);
              expect(task.flagged).toBe(filterFlagged);
            }

            // Verify count matches expected
            const expectedCount = createdTasks.filter(
              (t) => t.completed === filterCompleted && t.flagged === filterFlagged
            ).length;
            expect(filtered.length).toBe(expectedCount);

            // Cleanup
            for (const task of createdTasks) {
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 4: Task Sorting Correctness', () => {
    /**
     * For any list of tasks with sort_order values, sorting by sort_order
     * SHALL produce a list where each element is correctly ordered.
     */
    it('should correctly sort tasks by sort_order ascending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: taskTitleArb,
              completed: fc.boolean(),
              flagged: fc.boolean(),
              sort_order: fc.integer({ min: -1000, max: 1000 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (taskInputs) => {
            // Create tasks
            const createdTasks: Task[] = [];
            for (const input of taskInputs) {
              const task = await adapter.createTask(input);
              createdTasks.push(task);
            }

            // Sort ascending
            const sort: SortOptions[] = [{ field: 'sort_order', direction: 'asc' }];
            const sorted = await adapter.getTasks(undefined, sort);

            // Verify order
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1].sort_order ?? 0;
              const curr = sorted[i].sort_order ?? 0;
              expect(prev).toBeLessThanOrEqual(curr);
            }

            // Cleanup
            for (const task of createdTasks) {
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should correctly sort tasks by sort_order descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: taskTitleArb,
              completed: fc.boolean(),
              flagged: fc.boolean(),
              sort_order: fc.integer({ min: -1000, max: 1000 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (taskInputs) => {
            // Create tasks
            const createdTasks: Task[] = [];
            for (const input of taskInputs) {
              const task = await adapter.createTask(input);
              createdTasks.push(task);
            }

            // Sort descending
            const sort: SortOptions[] = [{ field: 'sort_order', direction: 'desc' }];
            const sorted = await adapter.getTasks(undefined, sort);

            // Verify order
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1].sort_order ?? 0;
              const curr = sorted[i].sort_order ?? 0;
              expect(prev).toBeGreaterThanOrEqual(curr);
            }

            // Cleanup
            for (const task of createdTasks) {
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});


// Arbitraries for project test data
const projectNameArb = fc.string({ minLength: 1, maxLength: 100 });
const projectIconArb = fc.constantFrom('📁', '📋', '🎯', '💼', '🏠', '🔧', '📚', '🎨');
const projectColorArb = fc.option(
  fc.stringMatching(/^#[0-9a-fA-F]{6}$/),
  { nil: undefined }
);

const createProjectInputArb = fc.record({
  name: projectNameArb,
  icon: projectIconArb,
  color: projectColorArb,
  sort_order: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
});

describe('IndexedDB Adapter - Project Operations', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
    await clearDatabase(adapter);
  });

  afterEach(async () => {
    await clearDatabase(adapter);
  });

  describe('Property 5: Project CRUD Round-Trip', () => {
    /**
     * For any valid project data, creating a project SHALL generate a valid UUID
     * and persist all fields.
     */
    it('should preserve project data through create-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(createProjectInputArb, async (projectInput) => {
          const created = await adapter.createProject(projectInput);

          // Verify UUID is generated
          expect(created.id).toBeDefined();
          expect(created.id.length).toBe(36); // UUID format

          const retrieved = await adapter.getProjectById(created.id);

          expect(retrieved).not.toBeNull();
          expect(retrieved!.id).toBe(created.id);
          expect(retrieved!.name).toBe(projectInput.name);
          expect(retrieved!.icon).toBe(projectInput.icon);
          expect(retrieved!.color).toBe(projectInput.color);

          // Cleanup
          await adapter.deleteProject(created.id);
        }),
        { numRuns: 50 }
      );
    });

    /**
     * Updating a project and reading it back SHALL reflect all changes.
     */
    it('should preserve project data through update-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          createProjectInputArb,
          createProjectInputArb,
          async (initialInput, updateInput) => {
            const created = await adapter.createProject(initialInput);

            const updates = {
              name: updateInput.name,
              icon: updateInput.icon,
              color: updateInput.color,
            };

            const updated = await adapter.updateProject(created.id, updates);
            expect(updated).not.toBeNull();

            const retrieved = await adapter.getProjectById(created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe(updateInput.name);
            expect(retrieved!.icon).toBe(updateInput.icon);
            expect(retrieved!.color).toBe(updateInput.color);
            expect(retrieved!.id).toBe(created.id);

            // Cleanup
            await adapter.deleteProject(created.id);
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Deleting a project SHALL remove it and update associated tasks.
     */
    it('should remove project and update associated tasks on deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          createProjectInputArb,
          fc.array(createTaskInputArb, { minLength: 1, maxLength: 5 }),
          async (projectInput, taskInputs) => {
            // Create project
            const project = await adapter.createProject(projectInput);

            // Create tasks associated with the project
            const tasks: Task[] = [];
            for (const taskInput of taskInputs) {
              const task = await adapter.createTask({
                ...taskInput,
                project: project.id,
              });
              tasks.push(task);
            }

            // Delete project
            const deleted = await adapter.deleteProject(project.id);
            expect(deleted).toBe(true);

            // Verify project is deleted
            const retrievedProject = await adapter.getProjectById(project.id);
            expect(retrievedProject).toBeNull();

            // Verify tasks have project field cleared
            for (const task of tasks) {
              const retrievedTask = await adapter.getTaskById(task.id);
              expect(retrievedTask).not.toBeNull();
              expect(retrievedTask!.project).toBeUndefined();

              // Cleanup task
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

// Arbitraries for tag test data
const tagNameArb = fc.string({ minLength: 1, maxLength: 50 });

describe('IndexedDB Adapter - Tag Operations', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
    await clearDatabase(adapter);
  });

  afterEach(async () => {
    await clearDatabase(adapter);
  });

  describe('Property 6: Tag Management Round-Trip', () => {
    /**
     * Creating a tag SHALL persist all fields.
     */
    it('should preserve tag data through create-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          tagNameArb,
          fc.option(fc.uuid(), { nil: null }),
          async (name, projectId) => {
            const created = await adapter.createTag(name, projectId);

            expect(created.id).toBeDefined();
            expect(created.id.length).toBe(36);

            const retrieved = await adapter.getTagById(created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe(name);
            expect(retrieved!.project_id).toBe(projectId);

            // Cleanup
            await adapter.deleteTag(created.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Attaching a tag to a task SHALL create a retrievable relationship.
     */
    it('should create retrievable task-tag relationship on attach', async () => {
      await fc.assert(
        fc.asyncProperty(createTaskInputArb, tagNameArb, async (taskInput, tagName) => {
          const task = await adapter.createTask(taskInput);
          const tag = await adapter.createTag(tagName, null);

          await adapter.attachTagToTask(task.id, tag.id);

          const tagsByTask = await adapter.getTagsByTaskIds([task.id]);
          expect(tagsByTask[task.id]).toBeDefined();
          expect(tagsByTask[task.id].length).toBe(1);
          expect(tagsByTask[task.id][0].id).toBe(tag.id);

          // Cleanup
          await adapter.deleteTask(task.id);
          await adapter.deleteTag(tag.id);
        }),
        { numRuns: 30 }
      );
    });

    /**
     * Detaching a tag from a task SHALL remove the relationship.
     */
    it('should remove task-tag relationship on detach', async () => {
      await fc.assert(
        fc.asyncProperty(createTaskInputArb, tagNameArb, async (taskInput, tagName) => {
          const task = await adapter.createTask(taskInput);
          const tag = await adapter.createTag(tagName, null);

          await adapter.attachTagToTask(task.id, tag.id);

          // Verify attached
          let tagsByTask = await adapter.getTagsByTaskIds([task.id]);
          expect(tagsByTask[task.id].length).toBe(1);

          // Detach
          await adapter.detachTagFromTask(task.id, tag.id);

          // Verify detached
          tagsByTask = await adapter.getTagsByTaskIds([task.id]);
          expect(tagsByTask[task.id].length).toBe(0);

          // Cleanup
          await adapter.deleteTask(task.id);
          await adapter.deleteTag(tag.id);
        }),
        { numRuns: 30 }
      );
    });

    /**
     * Deleting a tag SHALL cascade to remove all task-tag associations.
     */
    it('should cascade delete task-tag associations when tag is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(createTaskInputArb, { minLength: 1, maxLength: 5 }),
          tagNameArb,
          async (taskInputs, tagName) => {
            // Create tasks
            const tasks: Task[] = [];
            for (const input of taskInputs) {
              const task = await adapter.createTask(input);
              tasks.push(task);
            }

            // Create tag and attach to all tasks
            const tag = await adapter.createTag(tagName, null);
            for (const task of tasks) {
              await adapter.attachTagToTask(task.id, tag.id);
            }

            // Verify all attachments
            const taskIds = tasks.map((t) => t.id);
            let tagsByTask = await adapter.getTagsByTaskIds(taskIds);
            for (const taskId of taskIds) {
              expect(tagsByTask[taskId].length).toBe(1);
            }

            // Delete tag
            await adapter.deleteTag(tag.id);

            // Verify all associations are removed
            tagsByTask = await adapter.getTagsByTaskIds(taskIds);
            for (const taskId of taskIds) {
              expect(tagsByTask[taskId].length).toBe(0);
            }

            // Cleanup tasks
            for (const task of tasks) {
              await adapter.deleteTask(task.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});


// Arbitraries for pomodoro test data
const pomodoroTypeArb = fc.constantFrom('work', 'short_break', 'long_break') as fc.Arbitrary<
  'work' | 'short_break' | 'long_break'
>;
const pomodoroDurationArb = fc.integer({ min: 1, max: 60 });

const createPomodoroInputArb = fc.record({
  task_id: fc.option(fc.uuid(), { nil: null }),
  duration: pomodoroDurationArb,
  type: pomodoroTypeArb,
  started_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => {
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  }),
  completed_at: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => {
      if (isNaN(d.getTime())) return new Date().toISOString();
      return d.toISOString();
    }),
    { nil: null }
  ),
});

describe('IndexedDB Adapter - Pomodoro Operations', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
    await clearDatabase(adapter);
  });

  afterEach(async () => {
    await clearDatabase(adapter);
  });

  describe('Property 9: Pomodoro Session Persistence', () => {
    /**
     * For any Pomodoro session, creating a session SHALL persist all fields.
     */
    it('should preserve pomodoro session data through create-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(createPomodoroInputArb, async (sessionInput) => {
          const created = await adapter.createPomodoroSession(sessionInput);

          expect(created.id).toBeDefined();
          expect(created.id.length).toBe(36);

          const retrieved = await adapter.getPomodoroSessionById(created.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved!.task_id).toBe(sessionInput.task_id);
          expect(retrieved!.duration).toBe(sessionInput.duration);
          expect(retrieved!.type).toBe(sessionInput.type);
          expect(retrieved!.started_at).toBe(sessionInput.started_at);
          expect(retrieved!.completed_at).toBe(sessionInput.completed_at);

          // Cleanup
          await adapter.deletePomodoroSession(created.id);
        }),
        { numRuns: 50 }
      );
    });

    /**
     * Updating a pomodoro session SHALL reflect changes.
     */
    it('should preserve pomodoro session data through update-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(createPomodoroInputArb, async (sessionInput) => {
          const created = await adapter.createPomodoroSession(sessionInput);

          const newCompletedAt = new Date().toISOString();
          const updated = await adapter.updatePomodoroSession(created.id, {
            completed_at: newCompletedAt,
          });

          expect(updated).not.toBeNull();
          expect(updated!.completed_at).toBe(newCompletedAt);

          const retrieved = await adapter.getPomodoroSessionById(created.id);
          expect(retrieved!.completed_at).toBe(newCompletedAt);

          // Cleanup
          await adapter.deletePomodoroSession(created.id);
        }),
        { numRuns: 30 }
      );
    });

    /**
     * Getting sessions by task_id SHALL return only sessions for that task.
     */
    it('should filter pomodoro sessions by task_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(createPomodoroInputArb, { minLength: 2, maxLength: 10 }),
          async (sessionInputs) => {
            // Create sessions
            const sessions = [];
            for (const input of sessionInputs) {
              const session = await adapter.createPomodoroSession(input);
              sessions.push(session);
            }

            // Get unique task_ids
            const taskIds = [...new Set(sessions.map((s) => s.task_id).filter(Boolean))];

            if (taskIds.length > 0) {
              const targetTaskId = taskIds[0] as string;
              const filtered = await adapter.getPomodoroSessions(targetTaskId);

              // Verify all returned sessions have the correct task_id
              for (const session of filtered) {
                expect(session.task_id).toBe(targetTaskId);
              }

              // Verify count matches
              const expectedCount = sessions.filter((s) => s.task_id === targetTaskId).length;
              expect(filtered.length).toBe(expectedCount);
            }

            // Cleanup
            for (const session of sessions) {
              await adapter.deletePomodoroSession(session.id);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

// Arbitraries for activity test data
const activityActionArb = fc.constantFrom(
  'task_created',
  'task_updated',
  'task_completed',
  'task_deleted',
  'tag_added',
  'tag_removed'
);

const createActivityInputArb = fc.record({
  task_id: fc.uuid(),
  action: activityActionArb,
  metadata: fc.option(
    fc.record({
      from: fc.option(fc.string(), { nil: undefined }),
      to: fc.option(fc.string(), { nil: undefined }),
    }),
    { nil: null }
  ),
});

describe('IndexedDB Adapter - Activity Operations', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = await createAdapter();
    await clearDatabase(adapter);
  });

  afterEach(async () => {
    await clearDatabase(adapter);
  });

  describe('Property 10: Task Activity Persistence', () => {
    /**
     * For any task activity log, creating an activity SHALL persist all fields.
     */
    it('should preserve task activity data through create-read cycle', async () => {
      await fc.assert(
        fc.asyncProperty(createActivityInputArb, async (activityInput) => {
          const created = await adapter.createTaskActivity(activityInput);

          expect(created.id).toBeDefined();
          expect(created.id.length).toBe(36);
          expect(created.task_id).toBe(activityInput.task_id);
          expect(created.action).toBe(activityInput.action);

          // Cleanup - activities are retrieved by task_id, no direct delete needed
        }),
        { numRuns: 50 }
      );
    });

    /**
     * Reading activities for a task SHALL return all logged activities in chronological order.
     */
    it('should return activities in chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(activityActionArb, { minLength: 2, maxLength: 10 }),
          async (taskId, actions) => {
            // Create activities with small delays to ensure different timestamps
            for (const action of actions) {
              await adapter.createTaskActivity({
                task_id: taskId,
                action,
                metadata: null,
              });
            }

            const activities = await adapter.getTaskActivities(taskId);

            // Verify chronological order
            for (let i = 1; i < activities.length; i++) {
              const prevTime = new Date(activities[i - 1].created_at).getTime();
              const currTime = new Date(activities[i].created_at).getTime();
              expect(prevTime).toBeLessThanOrEqual(currTime);
            }

            // Verify count
            expect(activities.length).toBe(actions.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
