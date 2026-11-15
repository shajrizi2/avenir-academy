"""Rebuilds src/modules/jobs/sources/directory.ts from a clone of remoteintech/remote-jobs.

  git clone --depth 1 https://github.com/remoteintech/remote-jobs /tmp/remote-jobs
  python3 scripts/jobs-directory.py /tmp/remote-jobs   (run from apps/api)
"""
import glob, json, re, sys

REGIONS = ('worldwide', 'europe', 'americas-europe')
rows = []
for path in sorted(glob.glob(f'{sys.argv[1]}/src/companies/*.md')):
    front = open(path, encoding='utf8').read().split('---')[1]
    def field(key):
        m = re.search(rf'^{key}:\s*"?(.*?)"?\s*$', front, re.M)
        return m.group(1).strip() if m else ''
    name, url = field('title').replace('\\"', '"'), field('careers_url')
    if field('region') in REGIONS and name and url.startswith('http'):
        rows.append({'name': name, 'website': field('website') or None, 'careersUrl': url})

head = open('src/modules/jobs/sources/directory.ts', encoding='utf8').read().split('export const COMPANY_DIRECTORY')[0]
body = '\n'.join('  ' + json.dumps(r, ensure_ascii=False) + ',' for r in rows)
open('src/modules/jobs/sources/directory.ts', 'w', encoding='utf8').write(
    head + 'export const COMPANY_DIRECTORY: readonly DirectoryCompany[] = [\n' + body + '\n];\n')
print(len(rows), 'companies')
