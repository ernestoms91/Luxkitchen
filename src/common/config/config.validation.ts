import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().required(),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  DB_USERNAME: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_MAX_CONNECTIONS: Joi.number().optional(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(), // Ejemplo: '60m', '1d', etc.
  EMAIL_SMTP_HOST: Joi.string().required(),
  EMAIL_SMTP_PORT: Joi.number().default(587),
  EMAIL_SMTP_USERNAME: Joi.string().required(),
  EMAIL_SMTP_PASSWORD: Joi.string().required(),
  EMAIL_SMTP_FROM: Joi.string().email().required(),
  EMAIL_SMTP_SECURE: Joi.boolean()
    .truthy('true', 1, 'TRUE')
    .falsy('false', 0, 'FALSE')
    .default(false),
  DB_SSL: Joi.boolean()
    .truthy('true', 1, 'TRUE')
    .falsy('false', 0, 'FALSE')
    .default(false),
  S3_ENDPOINT: Joi.string().uri().required(),
  S3_REGION: Joi.string().required(),
  S3_ACCESS_KEY: Joi.string().required(),
  S3_SECRET_KEY: Joi.string().required(),
  S3_BUCKET_NAME: Joi.string().required(),
  S3_FORCE_PATH_STYLE: Joi.boolean()
    .truthy('true', 1, 'TRUE')
    .falsy('false', 0, 'FALSE')
    .default(true),
  S3_PUBLIC_URL: Joi.string().uri().required(),
  PRODUCT_IMAGES_MAX_COUNT: Joi.number().default(6),
  PRODUCT_IMAGE_MAX_SIZE: Joi.number().default(5 * 1024 * 1024), // 5MB
  PRODUCT_IMAGE_ALLOWED_TYPES: Joi.string()
});
