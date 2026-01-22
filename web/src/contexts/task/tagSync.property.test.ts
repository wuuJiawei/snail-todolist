/**
 * Property-Based Tests for Tag Sync Optimization
 * Feature: tag-sync-optimization
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Tag } from '@/types/tag';

// ============================================
// Pure function extracted for testing
// This mirrors the logic in TaskProvider's syncTagUpdate
// ============================================

interface SyncTagUpdateOptions {
  removeFromCache?: boolean;
  oldProjectId?: string | null;
}

function keyForProject(projectId?: string | null): string {
  return (projectId ?? null) === null ? "global" : (projectId as string);
}

/**
 * Pure function that computes the next state for tagsCache and taskIdToTags
 * after a tag update operation.
 */
function computeTagSyncUpdate(
  tagsCache: Record<string, Tag[]>,
  taskIdToTags: Record<string, Tag[]>,
  tagId: string,
  updates: Partial<Tag>,
  options?: SyncTagUpdateOptions
): { nextCache: Record<string, Tag[]>; nextMapping: Record<string, Tag[]> } {
  const nextCache: Record<string, Tag[]> = {};
  
  if (options?.removeFromCache) {
    Object.keys(tagsCache).forEach((key) => {
      nextCache[key] = (tagsCache[key] || []).filter((t) => t.id !== tagId);
    });
  } else if (options?.oldProjectId !== undefined && updates.project_id !== undefined) {
    const oldKey = keyForProject(options.oldProjectId);
    const newKey = keyForProject(updates.project_id);
    let movedTag: Tag | undefined;

    Object.keys(tagsCache).forEach((key) => {
      if (key === oldKey) {
        const list = tagsCache[key] || [];
        movedTag = list.find((t) => t.id === tagId);
        nextCache[key] = list.filter((t) => t.id !== tagId);
      } else {
        nextCache[key] = tagsCache[key] || [];
      }
    });

    if (movedTag) {
      const updatedTag = { ...movedTag, ...updates };
      const targetList = nextCache[newKey] || [];
      nextCache[newKey] = [updatedTag, ...targetList.filter((t) => t.id !== tagId)];
    }
  } else {
    Object.keys(tagsCache).forEach((key) => {
      nextCache[key] = (tagsCache[key] || []).map((t) =>
        t.id === tagId ? { ...t, ...updates } : t
      );
    });
  }

  const nextMapping: Record<string, Tag[]> = {};
  Object.keys(taskIdToTags).forEach((taskId) => {
    const tags = taskIdToTags[taskId] || [];
    if (options?.removeFromCache) {
      nextMapping[taskId] = tags.filter((t) => t.id !== tagId);
    } else {
      const hasTag = tags.some((t) => t.id === tagId);
      if (hasTag) {
        nextMapping[taskId] = tags.map((t) =>
          t.id === tagId ? { ...t, ...updates } : t
        );
      } else {
        nextMapping[taskId] = tags;
      }
    }
  });

  return { nextCache, nextMapping };
}

// ============================================
// Arbitraries (Data Generators)
// ============================================

const tagArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  project_id: fc.option(fc.uuid(), { nil: null }),
  user_id: fc.uuid(),
});

const tagsCacheArbitrary = fc.dictionary(
  fc.constantFrom('global', fc.uuid().toString()),
  fc.array(tagArbitrary, { minLength: 0, maxLength: 5 })
);

const taskIdToTagsArbitrary = fc.dictionary(
  fc.uuid(),
  fc.array(tagArbitrary, { minLength: 0, maxLength: 3 })
);

// ============================================
// Property 1: Tag Update Consistency
// For any tag update (rename), all references to that tag
// in both tagsCache and taskIdToTags should reflect the updated values.
// Validates: Requirements 1.1, 1.2, 3.1, 3.3, 5.1, 5.2
// ============================================

describe('Property 1: Tag Update Consistency', () => {
  it('should update tag name consistently across both caches', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (tag, newName, taskIds) => {
          const tagsCache: Record<string, Tag[]> = {
            global: [tag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {};
          taskIds.forEach((taskId) => {
            taskIdToTags[taskId] = [{ ...tag }];
          });

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            tag.id,
            { name: newName }
          );

          // Verify tagsCache is updated
          const updatedTagInCache = nextCache.global?.find((t) => t.id === tag.id);
          expect(updatedTagInCache?.name).toBe(newName);

          // Verify all taskIdToTags entries are updated
          taskIds.forEach((taskId) => {
            const updatedTagInMapping = nextMapping[taskId]?.find((t) => t.id === tag.id);
            expect(updatedTagInMapping?.name).toBe(newName);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not affect tags with different IDs', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        tagArbitrary,
        fc.string({ minLength: 1, maxLength: 30 }),
        (targetTag, otherTag, newName) => {
          fc.pre(targetTag.id !== otherTag.id);

          const tagsCache: Record<string, Tag[]> = {
            global: [targetTag, otherTag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {
            'task-1': [targetTag, otherTag],
          };

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            targetTag.id,
            { name: newName }
          );

          // Other tag should remain unchanged
          const otherTagInCache = nextCache.global?.find((t) => t.id === otherTag.id);
          expect(otherTagInCache?.name).toBe(otherTag.name);

          const otherTagInMapping = nextMapping['task-1']?.find((t) => t.id === otherTag.id);
          expect(otherTagInMapping?.name).toBe(otherTag.name);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 2: Tag Deletion Consistency
// For any tag deletion, the tag should be removed from both
// tagsCache and all entries in taskIdToTags that contained it.
// Validates: Requirements 2.1, 2.2
// ============================================

describe('Property 2: Tag Deletion Consistency', () => {
  it('should remove tag from both caches completely', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (tag, taskIds) => {
          const tagsCache: Record<string, Tag[]> = {
            global: [tag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {};
          taskIds.forEach((taskId) => {
            taskIdToTags[taskId] = [{ ...tag }];
          });

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            tag.id,
            {},
            { removeFromCache: true }
          );

          // Verify tag is removed from tagsCache
          const tagInCache = nextCache.global?.find((t) => t.id === tag.id);
          expect(tagInCache).toBeUndefined();

          // Verify tag is removed from all taskIdToTags entries
          taskIds.forEach((taskId) => {
            const tagInMapping = nextMapping[taskId]?.find((t) => t.id === tag.id);
            expect(tagInMapping).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve other tags when deleting one', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        tagArbitrary,
        (targetTag, otherTag) => {
          fc.pre(targetTag.id !== otherTag.id);

          const tagsCache: Record<string, Tag[]> = {
            global: [targetTag, otherTag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {
            'task-1': [targetTag, otherTag],
          };

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            targetTag.id,
            {},
            { removeFromCache: true }
          );

          // Other tag should still exist
          expect(nextCache.global?.length).toBe(1);
          expect(nextCache.global?.[0].id).toBe(otherTag.id);

          expect(nextMapping['task-1']?.length).toBe(1);
          expect(nextMapping['task-1']?.[0].id).toBe(otherTag.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 3: Cache Bucket Consistency
// For any tag with project_id === null, it should appear in the "global" bucket.
// For any tag with a non-null project_id, it should appear in the corresponding project bucket.
// Validates: Requirements 3.2
// ============================================

describe('Property 3: Cache Bucket Consistency', () => {
  it('should move tag to correct bucket when project scope changes', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        fc.uuid(),
        (tag, newProjectId) => {
          const originalTag = { ...tag, project_id: null };
          
          const tagsCache: Record<string, Tag[]> = {
            global: [originalTag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {
            'task-1': [{ ...originalTag }],
          };

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            tag.id,
            { project_id: newProjectId },
            { oldProjectId: null }
          );

          // Tag should be removed from global bucket
          const tagInGlobal = nextCache.global?.find((t) => t.id === tag.id);
          expect(tagInGlobal).toBeUndefined();

          // Tag should be in new project bucket
          const tagInProject = nextCache[newProjectId]?.find((t) => t.id === tag.id);
          expect(tagInProject).toBeDefined();
          expect(tagInProject?.project_id).toBe(newProjectId);

          // taskIdToTags should also be updated
          const tagInMapping = nextMapping['task-1']?.find((t) => t.id === tag.id);
          expect(tagInMapping?.project_id).toBe(newProjectId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should move tag from project to global when project_id becomes null', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        fc.uuid(),
        (tag, originalProjectId) => {
          const originalTag = { ...tag, project_id: originalProjectId };
          
          const tagsCache: Record<string, Tag[]> = {
            [originalProjectId]: [originalTag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {
            'task-1': [{ ...originalTag }],
          };

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            tag.id,
            { project_id: null },
            { oldProjectId: originalProjectId }
          );

          // Tag should be removed from project bucket
          const tagInProject = nextCache[originalProjectId]?.find((t) => t.id === tag.id);
          expect(tagInProject).toBeUndefined();

          // Tag should be in global bucket
          const tagInGlobal = nextCache.global?.find((t) => t.id === tag.id);
          expect(tagInGlobal).toBeDefined();
          expect(tagInGlobal?.project_id).toBeNull();

          // taskIdToTags should also be updated
          const tagInMapping = nextMapping['task-1']?.find((t) => t.id === tag.id);
          expect(tagInMapping?.project_id).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 4: Unaffected Tasks Unchanged
// For any tag update, task entries in taskIdToTags that do not
// contain the affected tag should remain unchanged.
// Validates: Requirements 4.4
// ============================================

describe('Property 4: Unaffected Tasks Unchanged', () => {
  it('should not modify tasks that do not have the updated tag', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        tagArbitrary,
        fc.string({ minLength: 1, maxLength: 30 }),
        (targetTag, unrelatedTag, newName) => {
          fc.pre(targetTag.id !== unrelatedTag.id);

          const tagsCache: Record<string, Tag[]> = {
            global: [targetTag, unrelatedTag],
          };
          
          const taskIdToTags: Record<string, Tag[]> = {
            'task-with-target': [{ ...targetTag }],
            'task-without-target': [{ ...unrelatedTag }],
          };

          const originalUnrelatedTags = [...taskIdToTags['task-without-target']];

          const { nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            targetTag.id,
            { name: newName }
          );

          // Task without target tag should have same tags
          expect(nextMapping['task-without-target'].length).toBe(originalUnrelatedTags.length);
          expect(nextMapping['task-without-target'][0].id).toBe(unrelatedTag.id);
          expect(nextMapping['task-without-target'][0].name).toBe(unrelatedTag.name);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 5: Empty State Handling
// The sync function should handle empty caches gracefully.
// ============================================

describe('Property 5: Empty State Handling', () => {
  it('should handle empty tagsCache', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 30 }),
        (tagId, newName) => {
          const tagsCache: Record<string, Tag[]> = {};
          const taskIdToTags: Record<string, Tag[]> = {};

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            tagId,
            { name: newName }
          );

          expect(Object.keys(nextCache).length).toBe(0);
          expect(Object.keys(nextMapping).length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle tag not found in cache', () => {
    fc.assert(
      fc.property(
        tagArbitrary,
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 30 }),
        (existingTag, nonExistentTagId, newName) => {
          fc.pre(existingTag.id !== nonExistentTagId);

          const tagsCache: Record<string, Tag[]> = {
            global: [existingTag],
          };
          const taskIdToTags: Record<string, Tag[]> = {
            'task-1': [{ ...existingTag }],
          };

          const { nextCache, nextMapping } = computeTagSyncUpdate(
            tagsCache,
            taskIdToTags,
            nonExistentTagId,
            { name: newName }
          );

          // Existing tag should remain unchanged
          expect(nextCache.global?.[0].name).toBe(existingTag.name);
          expect(nextMapping['task-1']?.[0].name).toBe(existingTag.name);
        }
      ),
      { numRuns: 50 }
    );
  });
});
