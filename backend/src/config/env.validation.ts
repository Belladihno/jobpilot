import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_NAME: Joi.string().default('JobPilot'),
  PORT: Joi.number().port().default(5500),
  APP_URL: Joi.string().uri().default('http://localhost:5500'),

  // PostgreSQL
  DATABASE_URL: Joi.string().required(),

  // Storage
  STORAGE_DRIVER: Joi.string().valid('local').default('local'),
  STORAGE_LOCAL_ROOT: Joi.string().default('./storage'),

  // AI
  AI_PROVIDER: Joi.string().valid('stub', 'anthropic').default('stub'),
  AI_ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  AI_ANTHROPIC_MODEL: Joi.string().default('claude-3-5-sonnet-latest'),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // RabbitMQ
  RABBITMQ_HOST: Joi.string().required(),
  RABBITMQ_PORT: Joi.number().default(5672),
  RABBITMQ_USERNAME: Joi.string().required(),
  RABBITMQ_PASSWORD: Joi.string().required(),
  RABBITMQ_VHOST: Joi.string().default('/'),

  // Authentication
  SESSION_TTL_SECONDS: Joi.number().integer().positive().required(),
  COOKIE_NAME: Joi.string().default('jobpilot_session'),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_HTTP_ONLY: Joi.boolean().default(true),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),

  // Worker
  WORKER_STANDALONE: Joi.boolean().default(false),

  // Job discovery
  JOB_SOURCES: Joi.string().default('stub'),
  DISCOVERY_CRON: Joi.string().default('0 */6 * * *'),
});
