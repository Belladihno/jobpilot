import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { JobSourceAdapter } from '../job-source.adapter';
import { parseNormalizedJobs } from '../normalized-job.schema';
import type { NormalizedJob } from '../normalized-job.schema';

/**
 * Raw payload shape as an external API would deliver it — deliberately
 * different from NormalizedJob so the mapping boundary stays real.
 */
const StubSourceSchema = z.object({
  id: z.string().min(1),
  job_title: z.string().min(1),
  employer: z.string().min(1),
  description: z.string(),
  city: z.string(),
  work_model: z.enum(['remote', 'hybrid', 'onsite', 'unknown']),
  contract: z.string().nullable(),
  seniority: z.string().nullable(),
  pay_min: z.string().nullable(),
  pay_max: z.string().nullable(),
  currency: z.string().nullable(),
  url: z.string().url(),
  published: z.string().datetime().nullable(),
});

const RAW_FIXTURES: unknown[] = [
  {
    id: 'stub-senior-backend',
    job_title: 'Senior Backend Engineer (Node.js)',
    employer: 'Acme Cloud',
    description:
      'We are looking for a Senior Node.js engineer with strong TypeScript, PostgreSQL and RabbitMQ experience.',
    city: 'Remote — EU',
    work_model: 'remote',
    contract: 'FULL_TIME',
    seniority: 'SENIOR',
    pay_min: '80000',
    pay_max: '110000',
    currency: 'EUR',
    url: 'https://jobs.example.com/stub-senior-backend',
    published: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'stub-fullstack-hybrid',
    job_title: 'Full Stack Developer',
    employer: 'Bright Apps',
    description:
      'React + NestJS product team. Experience with Redis and Docker required.',
    city: 'Berlin',
    work_model: 'hybrid',
    contract: 'FULL_TIME',
    seniority: 'MID',
    pay_min: null,
    pay_max: null,
    currency: null,
    url: 'https://jobs.example.com/stub-fullstack-hybrid',
    published: '2026-08-21T12:30:00.000Z',
  },
  {
    id: 'stub-devops-onsite',
    job_title: 'Platform Engineer',
    employer: 'InfraWorks',
    description:
      'Kubernetes, Terraform and CI pipelines. TypeScript tooling a plus.',
    city: 'Munich',
    work_model: 'onsite',
    contract: 'CONTRACT',
    seniority: 'SENIOR',
    pay_min: '90',
    pay_max: '120',
    currency: 'EUR',
    url: 'https://jobs.example.com/stub-platform-engineer',
    published: '2026-08-22T07:15:00.000Z',
  },
  {
    id: 'stub-junior-support',
    job_title: 'Junior Support Engineer',
    employer: 'HelpDesk GmbH',
    description: 'Entry level role. Basic SQL knowledge helpful.',
    city: 'Hamburg',
    work_model: 'onsite',
    contract: 'PART_TIME',
    seniority: 'JUNIOR',
    pay_min: null,
    pay_max: null,
    currency: null,
    url: 'https://jobs.example.com/stub-junior-support',
    published: null,
  },
];

const mapContract = (value: string | null): NormalizedJob['employmentType'] => {
  const upper = value?.toUpperCase() ?? '';
  return (
    (
      ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'] as const
    ).find((t) => t === upper) ?? 'UNKNOWN'
  );
};

const mapSeniority = (
  value: string | null,
): NormalizedJob['experienceLevel'] => {
  const upper = value?.toUpperCase() ?? '';
  return (
    (['JUNIOR', 'MID', 'SENIOR', 'LEAD'] as const).find((l) => l === upper) ??
    'UNKNOWN'
  );
};

@Injectable()
export class StubJobSource implements JobSourceAdapter {
  readonly id = 'stub';

  fetchLatest(): Promise<NormalizedJob[]> {
    // Mimics a real adapter: raw payloads arrive untrusted.
    const parsedRaw = z.array(StubSourceSchema).safeParse(RAW_FIXTURES);
    if (!parsedRaw.success) {
      throw new Error('Stub source delivered malformed raw data');
    }

    const mapped = parsedRaw.data.map((raw): NormalizedJob => {
      const toIntOrNull = (v: string | null) =>
        v === null ? null : Number.parseInt(v, 10);

      return {
        source: this.id,
        externalId: raw.id,
        title: raw.job_title,
        company: raw.employer,
        description: raw.description,
        location: raw.city,
        remoteType: raw.work_model.toUpperCase() as NormalizedJob['remoteType'],
        employmentType: mapContract(raw.contract),
        experienceLevel: mapSeniority(raw.seniority),
        salaryMin: toIntOrNull(raw.pay_min),
        salaryMax: toIntOrNull(raw.pay_max),
        salaryCurrency: raw.currency ? raw.currency.toUpperCase() : null,
        applicationUrl: raw.url,
        postedAt: raw.published,
        expiresAt: null,
      };
    });

    return Promise.resolve(parseNormalizedJobs(mapped).jobs);
  }
}
