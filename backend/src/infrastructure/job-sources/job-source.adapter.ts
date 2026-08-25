import type { NormalizedJob } from './normalized-job.schema';

export interface JobSourceAdapter {
  /** Stable identifier persisted as jobs.source (e.g. 'stub', 'adzuna'). */
  readonly id: string;
  /** Fetches and normalizes the latest job postings from this source. */
  fetchLatest(): Promise<NormalizedJob[]>;
}
