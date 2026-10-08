import { testDatabaseUrl } from './test-database-url.js';

// Point the app at the test database before any module reads the config.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';
// Uploaded materials go to a throwaway folder.
process.env.UPLOAD_DIR = `${(await import('node:os')).tmpdir()}/ai-academy-e2e-uploads`;
