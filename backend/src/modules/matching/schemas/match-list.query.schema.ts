import { z } from 'zod';

export const MatchListQuerySchema = z.object({
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  status: z
    .enum(['NEW', 'INTERESTED', 'SAVED', 'DISMISSED', 'APPLIED'])
    .optional(),
  source: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MatchListQuery = z.infer<typeof MatchListQuerySchema>;
