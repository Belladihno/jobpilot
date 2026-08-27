import { z } from 'zod';

export const UpdateMatchStatusSchema = z.object({
  status: z.enum(['INTERESTED', 'SAVED', 'DISMISSED', 'APPLIED']),
});

export type UpdateMatchStatusDto = z.infer<typeof UpdateMatchStatusSchema>;
