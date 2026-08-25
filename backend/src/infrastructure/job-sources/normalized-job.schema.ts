import { z } from 'zod';

export const REMOTE_TYPES = ['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN'] as const;

export const NormalizedJobSchema = z.object({
  source: z.string().min(1).max(40),
  externalId: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().max(20_000),
  location: z.string().max(200),
  remoteType: z.enum(REMOTE_TYPES),
  employmentType: z.enum([
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERNSHIP',
    'TEMPORARY',
    'UNKNOWN',
  ]),
  experienceLevel: z.enum(['JUNIOR', 'MID', 'SENIOR', 'LEAD', 'UNKNOWN']),
  salaryMin: z.number().int().min(0).nullable(),
  salaryMax: z.number().int().min(0).nullable(),
  salaryCurrency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  applicationUrl: z.string().url().max(1000),
  postedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
});

export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;

/**
 * Double-validation boundary for external sources:
 * raw response → source-specific schema → adapter mapping → THIS schema.
 * A failure here means an adapter has a mapping bug — reject the batch.
 */
export function parseNormalizedJobs(raw: unknown[]): {
  jobs: NormalizedJob[];
  invalidCount: number;
} {
  const jobs: NormalizedJob[] = [];
  let invalidCount = 0;

  for (const item of raw) {
    const result = NormalizedJobSchema.safeParse(item);
    if (result.success) {
      jobs.push(result.data);
    } else {
      invalidCount += 1;
    }
  }

  return { jobs, invalidCount };
}
