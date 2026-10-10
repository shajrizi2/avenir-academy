/**
 * Makes an existing account an admin. Production has no seed data: register through the
 * site first, then run (see docs/DEPLOY.md):
 *   docker compose run --rm migrate node_modules/.bin/tsx scripts/promote-admin.ts you@example.com
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: pnpm admin:promote <email>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: Role.ADMIN },
    select: { email: true, role: true },
  });
  console.log(`${user.email} is now ${user.role}.`);
} catch {
  console.error(`No account with the email ${email}. Register on the site first.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
