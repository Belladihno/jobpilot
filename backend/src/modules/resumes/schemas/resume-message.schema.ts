import { z } from 'zod';

export const ResumeProcessingMessageSchema = z.object({
  resumeId: z.string().uuid(),
});

export type ResumeProcessingMessage = z.infer<
  typeof ResumeProcessingMessageSchema
>;
