export const configuration = () => ({
  app: {
    env: process.env.NODE_ENV as 'development' | 'test' | 'production',
    name: process.env.APP_NAME!,
    port: parseInt(process.env.PORT!, 10),
    url: process.env.APP_URL!,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localRoot: process.env.STORAGE_LOCAL_ROOT ?? './storage',
  },
  ai: {
    provider: process.env.AI_PROVIDER ?? 'stub',
    anthropicApiKey: process.env.AI_ANTHROPIC_API_KEY || undefined,
    anthropicModel:
      process.env.AI_ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
  },
  redis: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!, 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST!,
    port: parseInt(process.env.RABBITMQ_PORT!, 10),
    username: process.env.RABBITMQ_USERNAME!,
    password: process.env.RABBITMQ_PASSWORD!,
    vhost: process.env.RABBITMQ_VHOST!,
  },
  auth: {
    sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS!, 10),
    cookie: {
      name: process.env.COOKIE_NAME!,
      secure: process.env.COOKIE_SECURE === 'true',
      httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
      sameSite: process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none',
    },
  },
  worker: {
    standalone: process.env.WORKER_STANDALONE === 'true',
  },
  jobSources: {
    enabled: (process.env.JOB_SOURCES ?? 'stub')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  discovery: {
    cron: process.env.DISCOVERY_CRON ?? '0 */6 * * *',
  },
});

export type AppConfig = ReturnType<typeof configuration>;

/**
 * Matching score components (must sum to 100). Business tuning, deliberately
 * NOT an environment variable — see phase3 plan §0.
 */
export const MATCHING_WEIGHTS = {
  skills: 40,
  title: 20,
  experience: 20,
  location: 10,
  preferenceAlignment: 10,
} as const;
