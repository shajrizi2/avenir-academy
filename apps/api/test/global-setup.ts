import { prepareDatabase, testDatabaseUrl } from './test-database.js';

/** Applies migrations to the test database and empties every table before the run. */
export default async function globalSetup(): Promise<void> {
  await prepareDatabase(testDatabaseUrl());
}
