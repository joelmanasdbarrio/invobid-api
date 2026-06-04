import * as Joi from 'joi';

export const EnvConfigSchema = Joi.object({
  BUYER_TRANSFER_FEE_PERCENTAGE: Joi.number().required(),
  SELLER_TRANSFER_FEE_PERCENTAGE: Joi.number().required(),
  SMALLEST_BID_INCREMENT_PERCENTAGE: Joi.number().required(),
  MINIMUM_INVOICE_DISCOUNT: Joi.number().required(),
  AUCTION_EXTENSION_MINUTES: Joi.number().integer().positive().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'local')
    .default('development'),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().required(),
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
