/**
 * Where a fact comes from. Sources are never invented or completed:
 * when the origin is unknown, use the `pending` variant.
 */
export type SourceRef =
  | {
      status: 'verified';
      /** Reference or URL. */
      ref: string;
      /** Organization or author that publishes it. */
      publisher: string;
      /** Date the source was consulted, format DD/MM/YYYY. */
      consultedOn: string;
    }
  | { status: 'pending' };

/**
 * What the UI must label each milestone as, so a simulation or a
 * reconstruction is never shown as a real fact.
 */
export type MilestoneKind = 'hecho' | 'reconstruccion' | 'contexto';

/**
 * Rights of a third-party resource (the pages we use do not state a license,
 * so the permission has to be documented). Never assumed: use `pending` if unknown.
 */
export type RightsRef =
  | {
      status: 'documented';
      /** Terms under which we may use it, e.g. the author's permission. */
      terms: string;
      /** Who granted it. */
      grantedBy: string;
    }
  | { status: 'pending' };

/** A real photo is a record; an illustration is a reconstruction. The UI labels each. */
export type ImageKind = 'foto' | 'ilustracion';

export interface MilestoneImage {
  /** Path or URL of the file. */
  src: string;
  /** Description for screen readers. */
  alt: string;
  /** Visible caption, e.g. the original book caption. */
  caption: string;
  /** Who made or lent it, e.g. "Gentileza: ...". */
  credit: string;
  kind: ImageKind;
  /** Year it was taken or drawn, when known. */
  year?: number;
  rights: RightsRef;
  /** Where the image comes from. */
  source: SourceRef;
}

export interface PonchoMilestone {
  id: string;
  /** Year, used to order the route. */
  year: number;
  /** Exact start date when known, format DD/MM/YYYY (or MM/YYYY if the day is unknown). */
  date?: string;
  /** End date for events that last a while (an expedition), same format as `date`. */
  endDate?: string;
  place: string;
  title: string;
  summary: string;
  kind: MilestoneKind;
  source: SourceRef;
  /** Photos or illustrations of the milestone, if any. */
  images?: readonly MilestoneImage[];
}

/** State of the route: how far the user has gone and which milestone is current. */
export interface PonchoProgress {
  /** Position along the whole route, 0..1. */
  progress: number;
  /** Index of the current milestone in the milestone list. */
  current: number;
}
