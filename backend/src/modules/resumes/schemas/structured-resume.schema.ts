import { z } from 'zod';

export const StructuredResumeSchema = z.object({
  summary: z.string().max(3000).optional(),
  skills: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        level: z.string().max(40).optional(),
      }),
    )
    .max(60)
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().min(1).max(120),
        title: z.string().min(1).max(120),
        startDate: z.string().max(20).optional(),
        endDate: z.string().max(20).nullable().optional(),
        bullets: z.array(z.string().max(300)).max(10).default([]),
      }),
    )
    .max(30)
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().min(1).max(150),
        degree: z.string().min(1).max(120),
        field: z.string().max(120).nullable().optional(),
        startYear: z.number().int().min(1950).max(2100).optional(),
        endYear: z.number().int().min(1950).max(2100).nullable().optional(),
      }),
    )
    .max(20)
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().min(1).max(150),
        issuer: z.string().max(120).nullable().optional(),
        issuedAt: z.string().max(20).nullable().optional(),
      }),
    )
    .max(30)
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(1000).nullable().optional(),
        technologies: z.array(z.string().max(60)).max(15).default([]),
      }),
    )
    .max(30)
    .default([]),
});

export type StructuredResume = z.infer<typeof StructuredResumeSchema>;

export function buildExtractionPrompt(resumeText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = [
    'You are a precise CV data extraction engine.',
    'Extract structured data from the CV text provided by the user.',
    'Return ONLY a single JSON object matching this TypeScript type:',
    `{
      summary?: string,
      skills: Array<{ name: string, level?: string }>,
      experience: Array<{ company: string, title: string, startDate?: string, endDate?: string | null, bullets: string[] }>,
      education: Array<{ institution: string, degree: string, field?: string | null, startYear?: number, endYear?: number | null }>,
      certifications: Array<{ name: string, issuer?: string | null, issuedAt?: string | null }>,
      projects: Array<{ name: string, description?: string | null, technologies: string[] }>
    }`,
    'Rules:',
    '- Never invent experience, skills, or credentials not present in the text.',
    '- Omit fields that are not present in the CV rather than guessing.',
    '- Output raw JSON only. No markdown fences, no commentary.',
  ].join('\n');

  return { systemPrompt, userPrompt: resumeText };
}

export function parseModelJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}
