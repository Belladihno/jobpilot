import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .optional();

export const UpdateCandidateProfileSchema = z.object({
  headline: optionalText(120),
  professionalSummary: z.string().max(5000).optional(),
  location: optionalText(120),
  phone: z
    .string()
    .max(32)
    .regex(/^[+0-9 ()-]*$/, 'Invalid phone characters')
    .transform((value) => value.trim())
    .optional(),
  linkedinUrl: optionalText(500),
  githubUrl: optionalText(500),
  portfolioUrl: optionalText(500),
});

export type UpdateCandidateProfileDto = z.infer<
  typeof UpdateCandidateProfileSchema
>;
