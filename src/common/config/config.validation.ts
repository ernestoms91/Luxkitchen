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
});
