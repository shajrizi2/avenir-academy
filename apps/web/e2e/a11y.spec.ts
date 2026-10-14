import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { ADMIN, INSTRUCTOR, signIn, STUDENT } from './support';

/** WCAG 2.1 A and AA rules, on desktop and on a phone. */
async function expectNoViolations(page: Page) {
  // Let entrance animations finish so contrast is measured on the final colours.
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

test.use({ reducedMotion: 'reduce' });

for (const path of ['/sq', '/courses', '/courses/vibe-coding-ai', '/login', '/register']) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page);
  });
}

const signedIn: [string, string, string][] = [
  ['student', STUDENT, '/dashboard'],
  ['student', STUDENT, '/learn/vibe-coding-ai'],
  ['instructor', INSTRUCTOR, '/teach'],
  ['admin', ADMIN, '/admin'],
  ['admin', ADMIN, '/admin/enrollments'],
  ['admin', ADMIN, '/admin/payments'],
  ['admin', ADMIN, '/admin/groups'],
];

for (const [role, email, path] of signedIn) {
  test(`${path} (${role}) has no accessibility violations`, async ({ page }) => {
    await signIn(page, email);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });
}
