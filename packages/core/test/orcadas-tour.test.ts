import { describe, expect, it } from 'vitest';
import {
  ORCADAS_FACTS,
  ORCADAS_TOUR,
  factById,
  factsFor,
  isPublishable,
  panelFacts,
  tourStop,
  tourStops,
} from '../src/content/orcadas.ts';
import {
  CHAPTERS,
  initialOrcadas,
  orcadasReducer as reduce,
  tourAtEnd,
} from '../src/orcadas.ts';

describe('orcadas guided tour stops', () => {
  it('has unique stop ids, <= 120 char lines, <= 4 stops per chapter, and publishable facts', () => {
    const ids = ORCADAS_TOUR.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const stop of ORCADAS_TOUR) {
      expect(stop.line.length).toBeGreaterThan(0);
      expect(stop.line.length).toBeLessThanOrEqual(120);
      const fact = ORCADAS_FACTS.find((f) => f.id === stop.factId);
      expect(fact, stop.id).toBeDefined();
      expect(isPublishable(fact!), stop.id).toBe(true);
      expect(factById(stop.factId)).toEqual(fact);
    }

    for (const chapter of CHAPTERS) {
      const stops = tourStops(chapter);
      expect(stops.length, chapter).toBeLessThanOrEqual(4);
      if (chapter === 'answer') {
        expect(stops).toHaveLength(0);
      } else {
        expect(stops.length).toBeGreaterThan(0);
      }
      expect(tourStop(chapter, -1)).toBeNull();
      expect(tourStop(chapter, stops.length)).toBeNull();
      if (stops.length > 0) {
        expect(tourStop(chapter, 0)).toEqual(stops[0]);
      }
    }
  });

  it('advances with tourNext until tourAtEnd, goes back with tourPrev, and jumps with tourGo', () => {
    let s = initialOrcadas(11, 2026);
    expect(s.tourIndex).toBe(0);
    expect(tourAtEnd(s)).toBe(false);
    expect(reduce(s, { type: 'tourPrev' })).toBe(s);

    const arrivalCount = tourStops('arrival').length;
    for (let i = 1; i < arrivalCount; i++) {
      s = reduce(s, { type: 'tourNext' });
      expect(s.tourIndex).toBe(i);
    }
    expect(tourAtEnd(s)).toBe(true);
    expect(reduce(s, { type: 'tourNext' })).toBe(s);

    s = reduce(s, { type: 'tourPrev' });
    expect(s.tourIndex).toBe(arrivalCount - 2);
    expect(tourAtEnd(s)).toBe(false);

    s = reduce(s, { type: 'tourGo', index: 1 });
    expect(s.tourIndex).toBe(1);
    expect(reduce(s, { type: 'tourGo', index: 99 })).toBe(s);
    expect(reduce(s, { type: 'tourGo', index: -1 })).toBe(s);
  });

  it('resets tourIndex to 0 when changing chapters with next, back, or goto', () => {
    let s = initialOrcadas(11, 2026);
    s = reduce(s, { type: 'tourNext' });
    expect(s.tourIndex).toBe(1);

    s = reduce(s, { type: 'next' });
    expect(s.chapter).toBe('observation');
    expect(s.tourIndex).toBe(0);
    expect(tourAtEnd(s)).toBe(true);

    s = reduce(s, { type: 'back' });
    expect(s.chapter).toBe('arrival');
    expect(s.tourIndex).toBe(0);

    s = reduce(s, { type: 'tourGo', index: 2 });
    expect(s.tourIndex).toBe(2);
    s = reduce(s, { type: 'goto', chapter: 'answer' });
    expect(s.chapter).toBe('answer');
    expect(s.tourIndex).toBe(0);
    expect(tourAtEnd(s)).toBe(true);
  });

  it('syncs year and tourIndex in journey', () => {
    let s = initialOrcadas(11, 2026);
    s = reduce(s, { type: 'goto', chapter: 'journey' });
    expect(s.tourIndex).toBe(0);
    expect(s.year).toBe(1903);

    s = reduce(s, { type: 'tourNext' });
    expect(s.tourIndex).toBe(1);
    expect(s.year).toBe(1927);

    s = reduce(s, { type: 'tourNext' });
    expect(s.tourIndex).toBe(2);
    expect(s.year).toBe(1951);

    s = reduce(s, { type: 'tourNext' });
    expect(s.tourIndex).toBe(3);
    expect(s.year).toBe(2026);
    expect(tourAtEnd(s)).toBe(true);

    s = reduce(s, { type: 'tourPrev' });
    expect(s.tourIndex).toBe(2);
    expect(s.year).toBe(1951);

    // Moving the year slider syncs tourIndex to the last stop <= year
    s = reduce(s, { type: 'year', year: 1926 });
    expect(s.year).toBe(1926);
    expect(s.tourIndex).toBe(0);

    s = reduce(s, { type: 'year', year: 1950 });
    expect(s.tourIndex).toBe(1);

    s = reduce(s, { type: 'year', year: 2025 });
    expect(s.tourIndex).toBe(2);

    s = reduce(s, { type: 'year', year: 2026 });
    expect(s.tourIndex).toBe(3);
  });

  it('excludes facts already shown in tour stops from panelFacts across all chapters', () => {
    const tourFactIds = new Set(ORCADAS_TOUR.map((stop) => stop.factId));
    for (const chapter of CHAPTERS) {
      const { visible, more } = panelFacts(factsFor(chapter));
      for (const f of [...visible, ...more]) {
        expect(tourFactIds.has(f.id), `${chapter}:${f.id}`).toBe(false);
      }
    }
    const answerPanelIds = (() => {
      const { visible, more } = panelFacts(factsFor('answer'));
      return [...visible, ...more].map((f) => f.id);
    })();
    expect(answerPanelIds).not.toContain('done-monumento-hsm42');
    expect(answerPanelIds).toContain('done-laborc-actual');
  });
});
