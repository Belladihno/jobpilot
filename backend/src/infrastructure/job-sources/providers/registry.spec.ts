import type { AppConfig } from '../../../config/configuration';
import { JobSourceRegistry } from './registry';
import { StubJobSource } from './stub-job.source';

const makeConfig = (enabled: string[]) =>
  ({
    jobSources: { enabled },
  }) as unknown as AppConfig;

describe('JobSourceRegistry', () => {
  it('returns only adapters selected in JOB_SOURCES', () => {
    const registry = new JobSourceRegistry(
      new StubJobSource(),
      makeConfig(['stub']),
    );

    const enabled = registry.getEnabled();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe('stub');
  });

  it('resolves adapters by id', () => {
    const registry = new JobSourceRegistry(
      new StubJobSource(),
      makeConfig(['stub']),
    );
    expect(registry.get('stub')?.id).toBe('stub');
    expect(registry.get('adzuna')).toBeNull();
  });
});
