import { describe, expect, it } from 'vitest';
import {
  FACT_KIND_LABEL,
  MONTH_NAMES,
  CHAPTER_HEADINGS,
  CHAPTER_NAMES,
  ORCADAS_ERAS,
  ORCADAS_GUIDING_QUESTION,
  journeyFacts,
  ORCADAS_FACTS,
  ORCADAS_FAUNA,
  ORCADAS_HOTSPOT_FACTS,
  ORCADAS_SOURCES,
  hotspotFacts,
  eraAt,
  factsFor,
  isPublishable,
  seaIceAt,
  sourcesOf,
  type FactKind,
} from '../src/content/orcadas.ts';
import {
  ORCADAS_ANNUAL_TEMP,
  ORCADAS_CLIMATE,
  ORCADAS_MONTHLY_TEMP,
} from '../src/content/orcadas-series.ts';
import { CHAPTERS, ORCADAS_TREND_SPLIT_YEAR, segmentedTrend } from '../src/orcadas.ts';

describe('orcadas content and sources', () => {
  it('has unique ids in sources and facts', () => {
    const sourceIds = ORCADAS_SOURCES.map((s) => s.id);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);

    const factIds = ORCADAS_FACTS.map((f) => f.id);
    expect(new Set(factIds).size).toBe(factIds.length);
  });

  it('ensures every sourceId in facts exists in ORCADAS_SOURCES', () => {
    const knownSourceIds = new Set(ORCADAS_SOURCES.map((s) => s.id));
    for (const fact of ORCADAS_FACTS) {
      for (const srcId of fact.sourceIds) {
        expect(knownSourceIds.has(srcId)).toBe(true);
      }
    }
  });

  it('ensures every real fact has at least one source', () => {
    for (const fact of ORCADAS_FACTS) {
      if (fact.kind === 'real') {
        expect(fact.sourceIds.length).toBeGreaterThan(0);
      }
    }
  });

  it('isPublishable hides real facts with unverified sources and shows sim/recon/calc', () => {
    for (const fact of ORCADAS_FACTS) {
      const publishable = isPublishable(fact);
      if (fact.kind === 'real') {
        const sources = sourcesOf(fact);
        const allVerified = sources.length > 0 && sources.every((s) => s.verified);
        expect(publishable).toBe(allVerified);
      } else {
        expect(publishable).toBe(true);
      }
    }
  });

  it('ensures every source has https url, org and consulted date', () => {
    for (const src of ORCADAS_SOURCES) {
      expect(src.url.startsWith('https://')).toBe(true);
      expect(src.org.trim().length).toBeGreaterThan(0);
      expect(src.consulted.trim().length).toBeGreaterThan(0);
    }
  });

  it('verifies eras are sorted and eraAt resolves expected eras across history', () => {
    for (let i = 1; i < ORCADAS_ERAS.length; i++) {
      expect(ORCADAS_ERAS[i].fromYear).toBeGreaterThan(ORCADAS_ERAS[i - 1].fromYear);
    }

    expect(eraAt(1903).id).toBe('omond');
    expect(eraAt(1904).id).toBe('traspaso');
    expect(eraAt(1905).id).toBe('moneta');
    expect(eraAt(1926).id).toBe('moneta');
    expect(eraAt(1927).id).toBe('radio');
    expect(eraAt(1951).id).toBe('navy');
    expect(eraAt(2026).id).toBe('today');
  });

  it('shows no flag nor land wind mast before the 1904 handover (B2)', () => {
    expect(eraAt(1903).buildings).not.toContain('flag');
    expect(eraAt(1903).buildings).not.toContain('windMast');
    expect(eraAt(1904).buildings).toContain('flag');
    expect(eraAt(2026).buildings).toEqual(
      expect.arrayContaining(['omond', 'flag', 'windMast', 'moneta', 'radioMast', 'modern'])
    );
  });

  it('gives each hotspot explicit publishable facts, never shared between hotspots (B5)', () => {
    const seen = new Set<string>();
    for (const [spot, ids] of Object.entries(ORCADAS_HOTSPOT_FACTS)) {
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        const fact = ORCADAS_FACTS.find((f) => f.id === id);
        expect(fact, `${spot}: ${id}`).toBeDefined();
        expect(isPublishable(fact!)).toBe(true);
        expect(seen.has(id), `${id} repeated`).toBe(false);
        seen.add(id);
      }
      expect(hotspotFacts(spot as keyof typeof ORCADAS_HOTSPOT_FACTS)).toHaveLength(ids.length);
    }
  });

  it('seaIceAt stays within 0..1 for months 1..12', () => {
    for (let month = 1; month <= 12; month++) {
      const ice = seaIceAt(month);
      expect(ice).toBeGreaterThanOrEqual(0);
      expect(ice).toBeLessThanOrEqual(1);
    }
  });

  it('has at least one publishable fact per chapter except observation, and for the month strip', () => {
    for (const chapter of CHAPTERS) {
      if (chapter === 'observation') continue;
      expect(factsFor(chapter).length, chapter).toBeGreaterThan(0);
    }
    expect(factsFor('months').length).toBeGreaterThan(0);
  });

  it('filters the journey facts by the active era', () => {
    expect(journeyFacts(1903).map((f) => f.id)).toEqual(['eras-expedicion-bruce']);
    expect(journeyFacts(1930).map((f) => f.id)).toContain('century-record-frio');
    expect(journeyFacts(1903).map((f) => f.id)).not.toContain('century-record-frio');
    const allJourney = new Set(factsFor('journey').map((f) => f.id));
    const inEras = new Set(ORCADAS_ERAS.flatMap((e) => e.factIds));
    expect(inEras).toEqual(allJourney);
  });

  it('names every chapter once and asks the guiding question', () => {
    for (const chapter of CHAPTERS) {
      expect(CHAPTER_NAMES[chapter].length).toBeGreaterThan(0);
      expect(CHAPTER_HEADINGS[chapter].length).toBeGreaterThan(0);
    }
    expect(ORCADAS_GUIDING_QUESTION.endsWith('?')).toBe(true);
  });

  it('has consistent labels and metadata', () => {
    const kinds: FactKind[] = ['real', 'sim', 'recon', 'calc'];
    for (const kind of kinds) {
      expect(FACT_KIND_LABEL[kind]).toBeDefined();
    }
    expect(MONTH_NAMES).toHaveLength(12);
    expect(ORCADAS_FAUNA.length).toBeGreaterThan(0);
  });
});

describe('orcadas content without repetition (C3)', () => {
  it('lists each era fact once, only in eras, and never a closing fact', () => {
    const seen = new Set<string>();
    for (const era of ORCADAS_ERAS) {
      for (const id of era.factIds) {
        expect(seen.has(id), `${id} in two eras`).toBe(false);
        seen.add(id);
        expect(ORCADAS_FACTS.find((f) => f.id === id)?.chapter).toBe('journey');
      }
    }
  });

  it('merges the two «oldest base» facts into one with both sources', () => {
    expect(ORCADAS_FACTS.some((f) => f.id === 'arrival-base-mas-antigua')).toBe(false);
    expect(ORCADAS_FACTS.find((f) => f.id === 'arrival-antiguedad')?.sourceIds).toEqual([
      'cancilleria',
      'armada',
    ]);
  });

  it('marks the today era start as illustrative (C2)', () => {
    const today = ORCADAS_ERAS[ORCADAS_ERAS.length - 1];
    expect(today.illustrativeStart).toBe(true);
    expect(ORCADAS_ERAS.filter((e) => e.illustrativeStart)).toEqual([today]);
  });
});

describe('orcadas two-segment trend (C1)', () => {
  it('matches the control slopes of 1903-1950 and 1951-2025', () => {
    const [early, late] = segmentedTrend(ORCADAS_ANNUAL_TEMP, ORCADAS_TREND_SPLIT_YEAR);
    expect(early.fromYear).toBe(1904);
    expect(early.toYear).toBe(1950);
    expect(early.n).toBe(47);
    expect(early.slopePerDecade).toBeCloseTo(-0.022, 3);
    expect(late.fromYear).toBe(1951);
    expect(late.toYear).toBe(2025);
    expect(late.n).toBe(66);
    expect(late.slopePerDecade).toBeCloseTo(0.129, 3);
  });
});

describe('orcadas series control values', () => {
  it('matches required climatology and complete year counts', () => {
    expect(ORCADAS_CLIMATE).toHaveLength(12);

    const jan = ORCADAS_CLIMATE[0];
    const jul = ORCADAS_CLIMATE[6];

    expect(jan.tempMeanC).toBe(0.65);
    expect(jul.tempMeanC).toBe(-10.03);
    expect(jul.pressureMeanHpa).toBe(995.39);

    const completeAnnualYears = ORCADAS_ANNUAL_TEMP.filter((y) => y.value !== null);
    expect(completeAnnualYears).toHaveLength(113);
    expect(ORCADAS_MONTHLY_TEMP[0].year).toBe(1903);
  });
});
