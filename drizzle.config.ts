import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// 👇 decide el entorno
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;

// 👇 carga el archivo
dotenv.config({ path: envFile });

export default defineConfig({
  schema: './src/**/entities/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    database: process.env.DB_NAME!,
    host: process.env.DB_HOST!,
    user: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    port: Number(process.env.DB_PORT!),
    ssl: process.env.DB_SSL === 'true',
  },
});