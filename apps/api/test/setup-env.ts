import { testDatabaseUrl } from './test-database.js';

// Point the app at the test database before any module reads the config.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';
// Payments: a fake Stripe client, a known webhook secret for signing test events, no timers.
process.env.STRIPE_FAKE = 'true';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.CRON_ENABLED = 'false';
// Uploaded materials go to a throwaway folder.
process.env.UPLOAD_DIR = `${(await import('node:os')).tmpdir()}/ai-academy-e2e-uploads`;
