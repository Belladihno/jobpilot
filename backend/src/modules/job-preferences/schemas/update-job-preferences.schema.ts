import { z } from 'zod';

const keywordArray = (maxItems: number, maxLen: number) =>
  z
    .array(
      z
        .string()
        .min(1)
        .max(maxLen)
        .transform((value) => value.trim()),
    )
    .max(maxItems)
    .optional();

export const UpdateJobPreferencesSchema = z.object({
  jobTitles: keywordArray(20, 80),
  locations: keywordArray(20, 120),
  remotePreference: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'ANY']).optional(),
  employmentTypes: z
    .array(
      z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY']),
    )
    .max(10)
    .optional(),
  salaryMin: z.number().int().min(0).max(100_000_000).nullable().optional(),
  salaryCurrency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter code')
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  excludedKeywords: keywordArray(30, 60),
  requiredKeywords: keywordArray(30, 60),
  experienceLevels: z
    .array(z.enum(['JUNIOR', 'MID', 'SENIOR', 'LEAD']))
    .max(6)
    .optional(),
  autoApplyEnabled: z.boolean().optional(),
  minimumMatchScore: z.number().int().min(0).max(100).optional(),
});

export type UpdateJobPreferencesDto = z.infer<
  typeof UpdateJobPreferencesSchema
>;
