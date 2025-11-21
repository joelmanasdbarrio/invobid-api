import * as Joi from 'joi';

export const EnvConfigSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'local')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_NAME: Joi.string().required(),
  DB_USR: Joi.string().required(),
  DB_PWD: Joi.string().required(),
  MINIO_USR: Joi.string().required(),
  MINIO_PWD: Joi.string().required(),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_DOCS_BUCKET_NAME: Joi.string(),
  MINIO_PUBLIC_BUCKET_NAME: Joi.string(),
});
