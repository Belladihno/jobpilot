import { z } from 'zod';

export const JobDiscoveryMessageSchema = z.object({
  source: z.string().min(1).max(40),
});

export type JobDiscoveryMessage = z.infer<typeof JobDiscoveryMessageSchema>;
