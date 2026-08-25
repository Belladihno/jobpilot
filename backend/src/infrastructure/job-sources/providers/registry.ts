import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../../config/configuration';
import { APP_CONFIG } from '../../../config/app-config.module';
import type { JobSourceAdapter } from '../job-source.adapter';
import { StubJobSource } from './stub-job.source';

@Injectable()
export class JobSourceRegistry {
  private readonly logger = new Logger(JobSourceRegistry.name);
  private readonly adapters = new Map<string, JobSourceAdapter>();
  private readonly enabled: string[];

  constructor(
    stubJobSource: StubJobSource,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    const all: JobSourceAdapter[] = [stubJobSource];
    for (const adapter of all) {
      this.adapters.set(adapter.id, adapter);
    }

    const requested = config.jobSources.enabled;
    const unknown = requested.filter((id) => !this.adapters.has(id));
    if (unknown.length > 0) {
      throw new Error(
        `JOB_SOURCES references unknown source(s): ${unknown.join(', ')}. Available: ${[...this.adapters.keys()].join(', ')}`,
      );
    }
    this.enabled = requested;
    this.logger.log(`Enabled job sources: ${requested.join(', ')}`);
  }

  /** Adapters selected via JOB_SOURCES, in configured order. */
  getEnabled(): JobSourceAdapter[] {
    return this.enabled
      .map((id) => this.adapters.get(id))
      .filter((adapter): adapter is JobSourceAdapter => adapter !== undefined);
  }

  get(id: string): JobSourceAdapter | null {
    return this.adapters.get(id) ?? null;
  }
}
