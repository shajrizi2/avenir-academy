// Docker build step (apps/api/Dockerfile): trims a production pnpm install to what the API
// actually loads at run time.
//   1. pnpm links the optional peers of @prisma/client (`prisma`, the CLI, and `typescript`)
//      even in a --prod install, and the CLI pulls in Prisma Studio, pglite, effect, … about
//      250 MB. The API never loads them (migrations run from the separate `migrate` image), so
//      every package reachable only through those peers is deleted.
//   2. @prisma/client ships query compilers for five databases; only PostgreSQL is used.
// Usage: node prune-node-modules.mjs <workspace-root> <package-dir>...
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const OPTIONAL_PEERS = new Set(['prisma', 'typescript']);
const OTHER_DATABASES = /^query_compiler_.*\.(mysql|sqlite|sqlserver|cockroachdb)\./;

const [root, ...packageDirs] = process.argv.slice(2);
const store = join(root, 'node_modules', '.pnpm');

/** Entries of a node_modules folder, scoped packages expanded: [name, path]. */
function entries(nodeModules) {
  if (!existsSync(nodeModules)) return [];
  return readdirSync(nodeModules).flatMap((name) => {
    if (name.startsWith('.')) return [];
    const path = join(nodeModules, name);
    if (
      name.startsWith('@') &&
      lstatSync(path).isDirectory() &&
      !lstatSync(path).isSymbolicLink()
    ) {
      return readdirSync(path).map((sub) => [`${name}/${sub}`, join(path, sub)]);
    }
    return [[name, path]];
  });
}

/** The .pnpm/<id> folder a package lives in, or null outside the store. */
function storeEntryOf(realPath) {
  const rel = relative(store, realPath);
  return rel.startsWith('..') ? null : rel.split(sep)[0];
}

const kept = new Set();
const queue = packageDirs.flatMap((dir) => entries(join(dir, 'node_modules')));
while (queue.length > 0) {
  const [name, link] = queue.pop();
  if (OPTIONAL_PEERS.has(name) || !existsSync(link)) continue;
  const id = storeEntryOf(realpathSync(link));
  if (!id || kept.has(id)) continue;
  kept.add(id);
  // A package's dependencies are linked next to it: .pnpm/<id>/node_modules/*.
  queue.push(...entries(join(store, id, 'node_modules')).filter(([dep]) => dep !== name));
}

let removed = 0;
for (const id of readdirSync(store)) {
  if (id === 'node_modules' || id.startsWith('lock') || kept.has(id)) continue;
  rmSync(join(store, id), { recursive: true, force: true });
  removed++;
}

// pnpm's hidden hoisting folder now has links to deleted packages.
const hoisted = join(store, 'node_modules');
for (const [, link] of entries(hoisted)) {
  if (!existsSync(link)) rmSync(link, { force: true });
}

for (const id of kept) {
  if (!id.startsWith('@prisma+client@')) continue;
  const runtime = join(store, id, 'node_modules', '@prisma', 'client', 'runtime');
  for (const file of readdirSync(runtime)) {
    if (OTHER_DATABASES.test(file)) rmSync(join(runtime, file));
  }
}

console.log(
  `Kept ${kept.size} packages, removed ${removed} (peers: ${[...OPTIONAL_PEERS].join(', ')}).`,
);
