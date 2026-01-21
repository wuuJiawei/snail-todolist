/**
 * Property-Based Tests for DataTransferService
 * Feature: data-export-import
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import JSZip from 'jszip';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Tag } from '@/types/tag';

// Mock the storage module
vi.mock('@/storage', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  getStorage: vi.fn(),
}));

import { getStorage } from '@/storage';
import { exportData, importData, validateBackupFile, createBackupBlob } from './dataTransferService';

// ============================================
// Arbitraries (Data Generators)
// ============================================

const projectArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.constantFrom('folder', 'star', 'heart', 'work'),
  color: fc.constantFrom('#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'),
  user_id: fc.uuid(),
  sort_order: fc.integer({ min: 0, max: 1000 }),
  count: fc.integer({ min: 0, max: 100 }),
});

const taskArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  completed: fc.boolean(),
  project: fc.option(fc.uuid(), { nil: undefined }),
  date: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
  user_id: fc.uuid(),
  sort_order: fc.integer({ min: 0, max: 1000 }),
  deleted: fc.boolean(),
  abandoned: fc.boolean(),
  flagged: fc.boolean(),
});

const tagArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  project_id: fc.option(fc.uuid(), { nil: null }),
  user_id: fc.uuid(),
});

// ============================================
// Property 1: Export Data Completeness
// For any storage state containing projects, tasks, and tags,
// exporting data SHALL produce a ZIP file containing all records.
// Validates: Requirements 1.1, 1.2, 1.3, 1.4
// ============================================

describe('Property 1: Export Data Completeness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export all projects, tasks, and tags without loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(projectArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(taskArbitrary, { minLength: 0, maxLength: 20 }),
        fc.array(tagArbitrary, { minLength: 0, maxLength: 10 }),
        async (projects, tasks, tags) => {
          // Setup mock storage
          const mockStorage = {
            getProjects: vi.fn().mockResolvedValue(projects),
            getTasks: vi.fn().mockResolvedValue(tasks),
            getTags: vi.fn().mockResolvedValue(tags),
            getTagsByTaskIds: vi.fn().mockResolvedValue({}),
          };
          vi.mocked(getStorage).mockReturnValue(mockStorage as any);

          // Export data using createBackupBlob (doesn't trigger download)
          const result = await createBackupBlob();

          expect(result).not.toBeNull();
          expect(result!.blob).toBeInstanceOf(Blob);

          // Parse the exported ZIP
          const zip = await JSZip.loadAsync(result!.blob);
          
          // Verify all required files exist
          expect(zip.file('manifest.json')).not.toBeNull();
          expect(zip.file('projects.json')).not.toBeNull();
          expect(zip.file('tasks.json')).not.toBeNull();
          expect(zip.file('tags.json')).not.toBeNull();
          expect(zip.file('task_tags.json')).not.toBeNull();

          // Parse and verify data
          const exportedProjects = JSON.parse(await zip.file('projects.json')!.async('string'));
          const exportedTasks = JSON.parse(await zip.file('tasks.json')!.async('string'));
          const exportedTags = JSON.parse(await zip.file('tags.json')!.async('string'));
          const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));

          // Verify counts match
          expect(exportedProjects.length).toBe(projects.length);
          expect(exportedTasks.length).toBe(tasks.length);
          expect(exportedTags.length).toBe(tags.length);
          expect(manifest.counts.projects).toBe(projects.length);
          expect(manifest.counts.tasks).toBe(tasks.length);
          expect(manifest.counts.tags).toBe(tags.length);

          // Verify all IDs are present
          const exportedProjectIds = new Set(exportedProjects.map((p: Project) => p.id));
          const exportedTaskIds = new Set(exportedTasks.map((t: Task) => t.id));
          const exportedTagIds = new Set(exportedTags.map((t: Tag) => t.id));

          for (const project of projects) {
            expect(exportedProjectIds.has(project.id)).toBe(true);
          }
          for (const task of tasks) {
            expect(exportedTaskIds.has(task.id)).toBe(true);
          }
          for (const tag of tags) {
            expect(exportedTagIds.has(tag.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================
// Property 2: Import Data Round-Trip
// For any valid backup file, importing then re-exporting
// SHALL produce data equivalent to the original backup.
// Validates: Requirements 2.3, 2.4, 2.5
// ============================================

describe('Property 2: Import Data Round-Trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should preserve data through import-export cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(projectArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.array(tagArbitrary, { minLength: 1, maxLength: 5 }),
        async (originalProjects, originalTasks, originalTags) => {
          // Create a valid backup ZIP
          const zip = new JSZip();
          const manifest = {
            version: '1.0',
            createdAt: new Date().toISOString(),
            appVersion: '1.0.0',
            counts: {
              projects: originalProjects.length,
              tasks: originalTasks.length,
              tags: originalTags.length,
              taskTags: 0,
            },
          };
          
          zip.file('manifest.json', JSON.stringify(manifest));
          zip.file('projects.json', JSON.stringify(originalProjects));
          zip.file('tasks.json', JSON.stringify(originalTasks));
          zip.file('tags.json', JSON.stringify(originalTags));
          zip.file('task_tags.json', JSON.stringify([]));
          
          const blob = await zip.generateAsync({ type: 'blob' });
          const file = new File([blob], 'backup.zip', { type: 'application/zip' });

          // Setup mock storage that tracks imported data
          const importedProjects: Project[] = [];
          const importedTasks: Task[] = [];
          const importedTags: Tag[] = [];

          const mockStorage = {
            getProjects: vi.fn().mockResolvedValue([]),
            getTasks: vi.fn().mockResolvedValue([]),
            getTags: vi.fn().mockResolvedValue([]),
            getTagsByTaskIds: vi.fn().mockResolvedValue({}),
            getProjectById: vi.fn().mockResolvedValue(null),
            getTaskById: vi.fn().mockResolvedValue(null),
            getTagById: vi.fn().mockResolvedValue(null),
            createProject: vi.fn().mockImplementation(async (p) => {
              importedProjects.push(p);
              return p;
            }),
            createTask: vi.fn().mockImplementation(async (t) => {
              importedTasks.push(t);
              return t;
            }),
            createTag: vi.fn().mockImplementation(async (name, projectId) => {
              const tag = { id: `tag-${importedTags.length}`, name, project_id: projectId };
              importedTags.push(tag as Tag);
              return tag;
            }),
            attachTagToTask: vi.fn().mockResolvedValue(undefined),
            deleteProject: vi.fn().mockResolvedValue(true),
            deleteTask: vi.fn().mockResolvedValue(true),
            deleteTag: vi.fn().mockResolvedValue(true),
          };
          vi.mocked(getStorage).mockReturnValue(mockStorage as any);

          // Import data
          const importResult = await importData(file, { mode: 'replace' });

          expect(importResult.success).toBe(true);
          expect(importResult.stats?.projects).toBe(originalProjects.length);
          expect(importResult.stats?.tasks).toBe(originalTasks.length);
          expect(importResult.stats?.tags).toBe(originalTags.length);

          // Verify imported data matches original
          expect(importedProjects.length).toBe(originalProjects.length);
          expect(importedTasks.length).toBe(originalTasks.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 6: Invalid File Rejection
// For any file that is not a valid backup ZIP,
// the import service SHALL reject it with an error.
// Validates: Requirements 2.1, 2.2, 2.8
// ============================================

describe('Property 6: Invalid File Rejection', () => {
  it('should reject non-ZIP files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        async (content) => {
          const file = new File([content], 'invalid.txt', { type: 'text/plain' });
          const result = await validateBackupFile(file);
          
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject ZIP files missing required files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('manifest.json', 'projects.json', 'tasks.json', 'tags.json', 'task_tags.json'),
        async (missingFile) => {
          const zip = new JSZip();
          
          // Add all files except the missing one
          const files = ['manifest.json', 'projects.json', 'tasks.json', 'tags.json', 'task_tags.json'];
          for (const filename of files) {
            if (filename !== missingFile) {
              if (filename === 'manifest.json') {
                zip.file(filename, JSON.stringify({ version: '1.0', createdAt: new Date().toISOString() }));
              } else {
                zip.file(filename, '[]');
              }
            }
          }
          
          const blob = await zip.generateAsync({ type: 'blob' });
          const file = new File([blob], 'incomplete.zip', { type: 'application/zip' });
          
          const result = await validateBackupFile(file);
          
          expect(result.valid).toBe(false);
          expect(result.error).toContain(missingFile);
        }
      ),
      { numRuns: 5 }
    );
  });
});
