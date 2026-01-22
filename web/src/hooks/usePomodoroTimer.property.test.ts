/**
 * Property-Based Tests for Pomodoro Focus Title
 * Feature: pomodoro-focus-title
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ============================================
// Mock localStorage
// ============================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import after mocking localStorage
import { POMODORO_FOCUS_TITLE_KEY } from '@/constants/storage-keys';

// ============================================
// Helper functions to test (extracted logic)
// ============================================

const loadFocusTitle = (): string => {
  try {
    const raw = localStorage.getItem(POMODORO_FOCUS_TITLE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { title?: string };
      return parsed.title ?? "";
    }
  } catch {
    // Ignore parse errors
  }
  return "";
};

const persistFocusTitle = (title: string, sessionId?: string) => {
  try {
    localStorage.setItem(POMODORO_FOCUS_TITLE_KEY, JSON.stringify({ title, sessionId }));
  } catch {
    // Ignore storage errors
  }
};

const clearPersistedFocusTitle = () => {
  try {
    localStorage.removeItem(POMODORO_FOCUS_TITLE_KEY);
  } catch {
    // Ignore storage errors
  }
};

// ============================================
// Arbitraries (Data Generators)
// ============================================

const focusTitleArbitrary = fc.string({ minLength: 0, maxLength: 200 });

const nonEmptyFocusTitleArbitrary = fc.string({ minLength: 1, maxLength: 200 });

const sessionIdArbitrary = fc.uuid();

// ============================================
// Property 3: Title Persistence Round-Trip
// For any focus title, if a session is started with that title
// and the page is refreshed before the session ends, the title
// should be restored from storage and match the original title exactly.
// Validates: Requirements 3.1, 3.2
// ============================================

describe('Property 3: Title Persistence Round-Trip', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should persist and restore focus title exactly', () => {
    fc.assert(
      fc.property(
        nonEmptyFocusTitleArbitrary,
        sessionIdArbitrary,
        (title, sessionId) => {
          // Persist the title (simulating session start)
          persistFocusTitle(title, sessionId);

          // Simulate page refresh by loading from storage
          const restoredTitle = loadFocusTitle();

          // The restored title should match the original exactly
          expect(restoredTitle).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty titles correctly', () => {
    fc.assert(
      fc.property(
        sessionIdArbitrary,
        (sessionId) => {
          // Persist empty title
          persistFocusTitle("", sessionId);

          // Load should return empty string
          const restoredTitle = loadFocusTitle();
          expect(restoredTitle).toBe("");
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle special characters in titles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        sessionIdArbitrary,
        (title, sessionId) => {
          persistFocusTitle(title, sessionId);
          const restoredTitle = loadFocusTitle();
          expect(restoredTitle).toBe(title);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty string when no title is persisted', () => {
    // Ensure storage is empty
    localStorageMock.clear();
    
    const restoredTitle = loadFocusTitle();
    expect(restoredTitle).toBe("");
  });
});

// ============================================
// Property 4: Title Cleanup on Session End
// For any session end action (complete, skip, or reset),
// the persisted focus title in localStorage should be cleared,
// and the input field should be empty for the next session.
// Validates: Requirements 3.3, 3.4
// ============================================

describe('Property 4: Title Cleanup on Session End', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('should clear persisted title after clearPersistedFocusTitle is called', () => {
    fc.assert(
      fc.property(
        nonEmptyFocusTitleArbitrary,
        sessionIdArbitrary,
        (title, sessionId) => {
          // First persist a title
          persistFocusTitle(title, sessionId);
          
          // Verify it was persisted
          expect(loadFocusTitle()).toBe(title);

          // Clear the title (simulating session end)
          clearPersistedFocusTitle();

          // Verify it was cleared
          expect(loadFocusTitle()).toBe("");
          expect(localStorage.getItem(POMODORO_FOCUS_TITLE_KEY)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle clearing when no title exists', () => {
    // Ensure storage is empty
    localStorageMock.clear();
    
    // Should not throw
    expect(() => clearPersistedFocusTitle()).not.toThrow();
    
    // Should still return empty
    expect(loadFocusTitle()).toBe("");
  });

  it('should allow setting new title after clearing', () => {
    fc.assert(
      fc.property(
        nonEmptyFocusTitleArbitrary,
        nonEmptyFocusTitleArbitrary,
        sessionIdArbitrary,
        sessionIdArbitrary,
        (title1, title2, sessionId1, sessionId2) => {
          // Set first title
          persistFocusTitle(title1, sessionId1);
          expect(loadFocusTitle()).toBe(title1);

          // Clear
          clearPersistedFocusTitle();
          expect(loadFocusTitle()).toBe("");

          // Set new title
          persistFocusTitle(title2, sessionId2);
          expect(loadFocusTitle()).toBe(title2);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================
// Property 2: Break Session Hides Title
// For any break session (short_break or long_break),
// the focus title display should be hidden or minimized,
// regardless of whether a title was set in the previous focus session.
// Validates: Requirements 2.4
// ============================================

describe('Property 2: Break Session Hides Title', () => {
  type SessionMode = 'focus' | 'short_break' | 'long_break';

  const shouldShowTitle = (mode: SessionMode, hasSession: boolean, title: string): boolean => {
    return hasSession && mode === 'focus' && title.length > 0;
  };

  it('should hide title display during break sessions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SessionMode>('short_break', 'long_break'),
        nonEmptyFocusTitleArbitrary,
        fc.boolean(),
        (breakMode, title, hasSession) => {
          const showTitle = shouldShowTitle(breakMode, hasSession, title);
          expect(showTitle).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show title display during focus sessions with title', () => {
    fc.assert(
      fc.property(
        nonEmptyFocusTitleArbitrary,
        (title) => {
          const showTitle = shouldShowTitle('focus', true, title);
          expect(showTitle).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should hide title display during focus sessions without title', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (hasSession) => {
          const showTitle = shouldShowTitle('focus', hasSession, '');
          expect(showTitle).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should hide title display when no session is active', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SessionMode>('focus', 'short_break', 'long_break'),
        nonEmptyFocusTitleArbitrary,
        (mode, title) => {
          const showTitle = shouldShowTitle(mode, false, title);
          expect(showTitle).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================
// Property 5: Title Saved with Session Record
// For any completed focus session that had a title set,
// the session record in storage should contain that exact title,
// and the title should be retrievable when fetching session history.
// Validates: Requirements 4.1
// ============================================

describe('Property 5: Title Saved with Session Record', () => {
  interface SessionRecord {
    id: string;
    type: 'focus' | 'short_break' | 'long_break';
    title?: string | null;
    completed: boolean;
  }

  const createSessionRecord = (
    type: SessionRecord['type'],
    title: string | undefined,
    completed: boolean
  ): SessionRecord => ({
    id: `session-${Math.random().toString(36).slice(2)}`,
    type,
    title: title?.trim() || null,
    completed,
  });

  const getDisplayTitle = (session: SessionRecord): string | null => {
    if (session.type !== 'focus') return null;
    return session.title || '未命名专注';
  };

  it('should preserve title in session record for focus sessions', () => {
    fc.assert(
      fc.property(
        nonEmptyFocusTitleArbitrary,
        (title) => {
          const session = createSessionRecord('focus', title, true);
          expect(session.title).toBe(title.trim());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null title for break sessions regardless of input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SessionRecord['type']>('short_break', 'long_break'),
        nonEmptyFocusTitleArbitrary,
        (breakType, title) => {
          const session = createSessionRecord(breakType, title, true);
          const displayTitle = getDisplayTitle(session);
          expect(displayTitle).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should show placeholder for focus sessions without title', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', undefined),
        (emptyTitle) => {
          const session = createSessionRecord('focus', emptyTitle, true);
          const displayTitle = getDisplayTitle(session);
          expect(displayTitle).toBe('未命名专注');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should trim whitespace from titles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (baseTitle) => {
          const paddedTitle = `  ${baseTitle}  `;
          const session = createSessionRecord('focus', paddedTitle, true);
          expect(session.title).toBe(paddedTitle.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});
