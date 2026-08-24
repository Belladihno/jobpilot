import { z } from 'zod';

export const SetDefaultResumeSchema = z.object({
  resumeId: z.string().uuid().nullable(),
});

export type SetDefaultResumeDto = z.infer<typeof SetDefaultResumeSchema>;
