import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { RABBITMQ_CONNECTION } from '../src/infrastructure/messaging/messaging.constants';
import { MessagingService } from '../src/infrastructure/messaging/messaging.service';
import { makeMockRedisClient } from './helpers/mock-redis-client';

const RESUME_ID = '22222222-2222-7222-8222-222222222222';
const JOB_A = '33333333-3333-7333-8333-333333333333';
const JOB_B = '44444444-4444-7444-8444-444444444444';
const MATCH_A = '55555555-5555-7555-8555-555555555555';

describe('Jobs and matches (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let cookie = '';
  let userId = '';

  beforeAll(async () => {
    const mockMessaging = {
      isHealthy: jest.fn().mockReturnValue(true),
      publish: jest.fn().mockReturnValue(true),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue({ ping: jest.fn().mockResolvedValue('PONG') })
      .overrideProvider(MessagingService)
      .useValue(mockMessaging)
      .overrideProvider(REDIS_CLIENT)
      .useValue(makeMockRedisClient())
      .overrideProvider(RABBITMQ_CONNECTION)
      .useValue({
        createChannel: jest.fn().mockResolvedValue({
          publish: jest.fn().mockReturnValue(true),
          close: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
          prefetch: jest.fn().mockResolvedValue(undefined),
          consume: jest.fn().mockResolvedValue({ consumerTag: 'mock' }),
          assertExchange: jest.fn().mockResolvedValue(undefined),
          assertQueue: jest.fn().mockResolvedValue({ queue: '' }),
          bindQueue: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
      })
      .compile()
      .then((moduleRef) => {
        app = moduleRef.createNestApplication();
        app.use(cookieParser());
        app.setGlobalPrefix('api');
        return app.init();
      });

    dataSource = app.get(DataSource);

    // Register once for the whole suite — per-test registrations would trip
    // the auth rate limiter (10/min) and drop Set-Cookie on later tests.
    await dataSource.query(
      'TRUNCATE job_matches, jobs, resumes, job_preferences, candidate_profiles, sessions, users CASCADE',
    );
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'browse@example.com',
        password: 'Password123',
        firstName: 'Bro',
        lastName: 'Wse',
      });
    cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(
      ';',
    )[0];
    userId = (res.body as { id: string }).id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const seedJob = async (
    id: string,
    overrides: Record<string, string> = {},
  ): Promise<void> => {
    await dataSource.query(
      `INSERT INTO jobs (id, source, external_id, title, company, description, location, remote_type, employment_type, experience_level, application_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        overrides.source ?? 'stub',
        `ext-${id.slice(0, 8)}`,
        overrides.title ?? 'Backend Engineer',
        overrides.company ?? 'Acme Cloud',
        'Node.js and TypeScript',
        overrides.location ?? 'Berlin',
        overrides.remote_type ?? 'REMOTE',
        overrides.employment_type ?? 'FULL_TIME',
        'SENIOR',
        `https://jobs.example.com/${id}`,
      ],
    );
  };

  /** Reseed only the job-side data; user/session/profile/preferences stay
   *  put so the auth throttler never trips across tests. */
  beforeEach(async () => {
    await dataSource.query('TRUNCATE job_matches, jobs, resumes CASCADE');

    // Approved default resume for the registered user
    await dataSource.query(
      `INSERT INTO resumes (id, user_id, file_name, mime_type, file_size, storage_key, status, extracted_text, approved_at)
       VALUES ($1, $2, 'cv.pdf', 'application/pdf', 1000, 'resumes/x/cv.pdf', 'processed', 'text', now())`,
      [RESUME_ID, userId],
    );
    await dataSource.query(
      `UPDATE candidate_profiles SET default_resume_id = $1 WHERE user_id = $2`,
      [RESUME_ID, userId],
    );

    await seedJob(JOB_A);
    await seedJob(JOB_B, {
      title: 'DevOps Engineer',
      remote_type: 'ONSITE',
      location: 'Munich',
      source: 'adzuna',
    });

    await dataSource.query(
      `INSERT INTO job_matches (id, user_id, job_id, resume_id, score, match_reasons, missing_requirements)
       VALUES ($1, $2, $3, $4, 82, $5, $6)`,
      [
        MATCH_A,
        userId,
        JOB_A,
        RESUME_ID,
        JSON.stringify(['skill "Node.js" appears in the posting']),
        JSON.stringify(['salary not disclosed']),
      ],
    );
  });

  describe('GET /api/jobs', () => {
    it('lists discovered jobs newest first', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/jobs')
        .set('Cookie', cookie)
        .expect(200);

      const body = res.body as Array<{ id: string }>;
      expect(body).toHaveLength(2);
      expect(body.map((job) => job.id).sort()).toEqual([JOB_A, JOB_B].sort());
    });

    it('applies remoteType, source and location filters', async () => {
      const remote = await request(app.getHttpServer())
        .get('/api/jobs?remoteType=REMOTE')
        .set('Cookie', cookie)
        .expect(200);
      expect(
        (remote.body as Array<{ id: string }>).map((job) => job.id),
      ).toEqual([JOB_A]);

      const source = await request(app.getHttpServer())
        .get('/api/jobs?source=adzuna')
        .set('Cookie', cookie)
        .expect(200);
      expect(
        (source.body as Array<{ id: string }>).map((job) => job.id),
      ).toEqual([JOB_B]);

      const location = await request(app.getHttpServer())
        .get('/api/jobs?location=berl')
        .set('Cookie', cookie)
        .expect(200);
      expect(
        (location.body as Array<{ id: string }>).map((job) => job.id),
      ).toEqual([JOB_A]);
    });

    it('rejects invalid filter values', async () => {
      await request(app.getHttpServer())
        .get('/api/jobs?remoteType=TELEPORT')
        .set('Cookie', cookie)
        .expect(400);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/jobs').expect(401);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('returns one posting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/jobs/${JOB_A}`)
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body.company).toBe('Acme Cloud');
    });

    it('404s for unknown ids and 400s for malformed ones', async () => {
      await request(app.getHttpServer())
        .get(`/api/jobs/${JOB_B.replace('4', '5')}`)
        .set('Cookie', cookie)
        .expect(404);
      await request(app.getHttpServer())
        .get('/api/jobs/not-a-uuid')
        .set('Cookie', cookie)
        .expect(400);
    });
  });

  describe('GET /api/matches', () => {
    it('lists own matches with the embedded job summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/matches')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].score).toBe(82);
      expect(res.body[0].job.id).toBe(JOB_A);
      expect(res.body[0].matchReasons).toContain(
        'skill "Node.js" appears in the posting',
      );
    });

    it('filters by minScore, status and source', async () => {
      const overMin = await request(app.getHttpServer())
        .get('/api/matches?minScore=90')
        .set('Cookie', cookie)
        .expect(200);
      expect(overMin.body as unknown[]).toHaveLength(0);

      const inRange = await request(app.getHttpServer())
        .get('/api/matches?minScore=80&status=NEW')
        .set('Cookie', cookie)
        .expect(200);
      expect(inRange.body as unknown[]).toHaveLength(1);

      const otherSource = await request(app.getHttpServer())
        .get('/api/matches?source=adzuna')
        .set('Cookie', cookie)
        .expect(200);
      expect(otherSource.body as unknown[]).toHaveLength(0);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/matches').expect(401);
    });
  });

  describe('PATCH /api/matches/:id/status', () => {
    it('persists feedback status on an owned match', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/matches/${MATCH_A}/status`)
        .set('Cookie', cookie)
        .send({ status: 'INTERESTED' })
        .expect(200);

      expect(res.body.status).toBe('INTERESTED');

      const reread = await request(app.getHttpServer())
        .get(`/api/matches/${MATCH_A}`)
        .set('Cookie', cookie)
        .expect(200);
      expect(reread.body.status).toBe('INTERESTED');
    });

    it('rejects invalid statuses', async () => {
      await request(app.getHttpServer())
        .patch(`/api/matches/${MATCH_A}/status`)
        .set('Cookie', cookie)
        .send({ status: 'LOVE_IT' })
        .expect(400);
    });

    it("hides other users' matches", async () => {
      // Second user
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Password123',
          firstName: 'Ot',
          lastName: 'Her',
        });
      const otherCookie = (
        res.headers['set-cookie'] as unknown as string[]
      )[0].split(';')[0];

      await request(app.getHttpServer())
        .patch(`/api/matches/${MATCH_A}/status`)
        .set('Cookie', otherCookie)
        .send({ status: 'SAVED' })
        .expect(404);
    });
  });
});
