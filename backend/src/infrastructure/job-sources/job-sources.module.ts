import { Global, Module } from '@nestjs/common';
import { JobSourceRegistry } from './providers/registry';
import { StubJobSource } from './providers/stub-job.source';

@Global()
@Module({
  providers: [StubJobSource, JobSourceRegistry],
  exports: [StubJobSource, JobSourceRegistry],
})
export class JobSourcesModule {}
