import { z } from 'zod';

export const JobListQuerySchema = z.object({
  source: z.string().max(40).optional(),
  location: z.string().max(200).optional(),
  remoteType: z.enum(['REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN']).optional(),
  postedAfter: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type JobListQuery = z.infer<typeof JobListQuerySchema>;
