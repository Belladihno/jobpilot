import { Injectable } from '@nestjs/common';
import type { AiCompletionClient } from '../ai-client.interface';

const STUB_STRUCTURED_RESUME = JSON.stringify({
  summary:
    'Backend engineer with 6 years of experience building Node.js and TypeScript services.',
  skills: [
    { name: 'Node.js', level: 'expert' },
    { name: 'TypeScript', level: 'advanced' },
    { name: 'PostgreSQL', level: 'advanced' },
    { name: 'Docker', level: 'intermediate' },
  ],
  experience: [
    {
      company: 'Acme Corp',
      title: 'Senior Backend Engineer',
      startDate: '2021-03',
      endDate: null,
      bullets: [
        'Led migration of legacy services to NestJS',
        'Reduced API p95 latency by 40%',
      ],
    },
    {
      company: 'Beta LLC',
      title: 'Backend Developer',
      startDate: '2018-06',
      endDate: '2021-02',
      bullets: ['Built REST APIs consumed by 2M monthly users'],
    },
  ],
  education: [
    {
      institution: 'State University',
      degree: 'BSc Computer Science',
      field: null,
      startYear: 2014,
      endYear: 2018,
    },
  ],
  certifications: [],
  projects: [],
});

@Injectable()
export class StubAiClient implements AiCompletionClient {
  complete(): Promise<string> {
    // Deterministic, schema-valid output so the whole pipeline is
    // exercisable without any real AI provider.
    return Promise.resolve(STUB_STRUCTURED_RESUME);
  }
}
