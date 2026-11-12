import { describe, expect, it } from 'vitest';
import {
  FACT_KIND_LABEL,
  MONTH_NAMES,
  ORCADAS_ERAS,
  ORCADAS_FACTS,
  ORCADAS_FAUNA,
  ORCADAS_SOURCES,
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
import { CHAPTERS } from '../src/orcadas.ts';

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
    expect(eraAt(1904).id).toBe('omond');
    expect(eraAt(1905).id).toBe('moneta');
    expect(eraAt(1926).id).toBe('moneta');
    expect(eraAt(1927).id).toBe('radio');
    expect(eraAt(1951).id).toBe('navy');
    expect(eraAt(2026).id).toBe('today');
  });

  it('seaIceAt stays within 0..1 for months 1..12', () => {
    for (let month = 1; month <= 12; month++) {
      const ice = seaIceAt(month);
      expect(ice).toBeGreaterThanOrEqual(0);
      expect(ice).toBeLessThanOrEqual(1);
    }
  });

  it('has at least one publishable fact per chapter', () => {
    for (const chapter of CHAPTERS) {
      const facts = factsFor(chapter);
      expect(facts.length).toBeGreaterThan(0);
    }
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
