// One-time local setup: env files, Postgres, migrations and seed data.
// Safe to re-run: existing env files are kept and the seed is idempotent.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

const envFiles = [
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env.local'],
];

for (const [example, target] of envFiles) {
  if (existsSync(target)) {
    console.log(`✓ ${target} exists, leaving it as is`);
  } else {
    copyFileSync(example, target);
    console.log(`✓ created ${target} from ${example}`);
  }
}

const run = (command) => {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit' });
};

run('docker compose up -d --wait');
run('pnpm --filter @ai-academy/api db:deploy');
run('pnpm --filter @ai-academy/api db:seed');

console.log('\nAll set. Start everything with: pnpm dev');
