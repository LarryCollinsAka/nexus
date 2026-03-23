import 'dotenv/config';

export default {
  schema: './lib/db.ts',
  out: './lib/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  verbose: true,
  strict: true,
};
