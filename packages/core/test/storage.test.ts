import { beforeEach, describe, expect, it } from 'vitest';
import {
  EXPLORED_KEY,
  loadExplored,
  saveExplored,
  loadViewMode,
  saveViewMode,
  ORCADAS_POINT,
} from '../src/index.ts';

describe('storage', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
  });

  it('persists explored', () => {
    expect(loadExplored()).toEqual([]);
    saveExplored(['orcadas', 'campana']);
    expect(loadExplored()).toEqual(['orcadas', 'campana']);
  });

  it('reads the old single-expedition format', () => {
    mem.set(EXPLORED_KEY, '1');
    expect(loadExplored()).toEqual([ORCADAS_POINT.id]);
    mem.set(EXPLORED_KEY, '0');
    expect(loadExplored()).toEqual([]);
  });

  it('survives a throwing localStorage', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('quota');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadExplored()).toEqual([]);
    expect(() => saveExplored(['orcadas'])).not.toThrow();
  });

  it('persists view mode', () => {
    expect(loadViewMode()).toBeNull();
    saveViewMode('3d');
    expect(loadViewMode()).toBe('3d');
    saveViewMode('2d');
    expect(loadViewMode()).toBe('2d');
  });
});
