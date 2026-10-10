import type { ModuleStatus } from '@ai-academy/shared';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ChatSparkles,
  LaptopCode,
  LiveClass,
  MegaphoneChart,
  NeuralNetwork,
  PathUnlock,
  TestCheck,
} from '@/components/illustrations';
import { EnrollmentStatusBadge } from '@/components/course/enrollment-status-badge';
import { Logo } from '@/components/logo';
import { ModuleStatusBadge } from '@/components/module-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const metadata: Metadata = { title: 'Design system', robots: { index: false } };

const SWATCHES = [
  { group: 'Neutrals', items: ['canvas', 'soft', 'ink', 'ink-soft', 'line', 'line-strong'] },
  {
    group: 'Track: AI',
    items: ['track-ai', 'track-ai-ink', 'track-ai-tint', 'track-ai-shadow'],
  },
  {
    group: 'Track: Marketing',
    items: [
      'track-marketing',
      'track-marketing-ink',
      'track-marketing-tint',
      'track-marketing-shadow',
    ],
  },
  { group: 'Passed', items: ['passed', 'passed-ink', 'passed-tint'] },
  { group: 'Active', items: ['active', 'active-ink', 'active-tint'] },
  { group: 'Locked', items: ['locked', 'locked-ink', 'locked-tint'] },
  { group: 'Failed', items: ['failed', 'failed-ink', 'failed-tint'] },
];

const TYPE_SCALE = [
  { className: 'text-display font-extrabold', label: 'display · 64' },
  { className: 'text-title font-extrabold', label: 'title · 44' },
  { className: 'text-heading font-bold', label: 'heading · 32' },
  { className: 'text-subheading font-bold', label: 'subheading · 24' },
  { className: 'text-lg', label: 'lg · 18' },
  { className: 'text-base', label: 'base · 16' },
  { className: 'text-sm', label: 'sm · 14' },
];

const BUTTON_VARIANTS = [
  'chunky',
  'chunky-outline',
  'default',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
] as const;

const ILLUSTRATIONS = [
  { name: 'NeuralNetwork', Component: NeuralNetwork },
  { name: 'ChatSparkles', Component: ChatSparkles },
  { name: 'MegaphoneChart', Component: MegaphoneChart },
  { name: 'LaptopCode', Component: LaptopCode },
  { name: 'PathUnlock', Component: PathUnlock },
  { name: 'LiveClass', Component: LiveClass },
  { name: 'TestCheck', Component: TestCheck },
];

const STATUSES: ModuleStatus[] = ['PASSED', 'ACTIVE', 'LOCKED', 'FAILED'];

/** Every token and primitive on one page, for design review. Not available in production. */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-16 px-4 py-12 sm:px-6">
      <header className="space-y-3">
        <Logo />
        <h1 className="text-title font-extrabold">Design system</h1>
        <p className="text-ink-soft max-w-2xl text-lg">
          Tokens live in <code>src/app/globals.css</code>. Components use these classes only, never
          raw colours.
        </p>
      </header>

      <Section title="Colours">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map(({ group, items }) => (
            <div key={group}>
              <h3 className="mb-3 font-bold">{group}</h3>
              <ul className="space-y-2">
                {items.map((name) => (
                  <li key={name} className="flex items-center gap-3 text-sm">
                    {/* Full class names so Tailwind generates them: bg-canvas, bg-soft, … */}
                    <span
                      className={`border-line size-10 rounded-lg border ${SWATCH_CLASS[name]}`}
                    />
                    <code>{name}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale (Plus Jakarta Sans)">
        <ul className="space-y-4">
          {TYPE_SCALE.map(({ className, label }) => (
            <li key={label} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="text-ink-soft w-36 shrink-0 text-sm">{label}</code>
              <span className={`${className} min-w-0`}>Learn by doing</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Buttons">
        <div className="space-y-6">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-4">
              <code className="text-ink-soft w-36 text-sm">{variant}</code>
              <Button variant={variant} size="sm">
                Small
              </Button>
              <Button variant={variant}>Default</Button>
              <Button variant={variant} size="lg">
                Large <ArrowRight data-icon="inline-end" />
              </Button>
              <Button variant={variant} size="xl">
                Extra large
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
            </div>
          ))}
          <div className="bg-ink rounded-card flex flex-wrap items-center gap-4 p-6">
            <code className="text-primary-foreground/80 w-36 text-sm">on a dark band</code>
            <Button variant="chunky-outline" size="lg">
              Start now
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Default card</CardTitle>
              <CardDescription>1px border, 16px radius. For static content.</CardDescription>
            </CardHeader>
            <CardContent>Body text sits here.</CardContent>
          </Card>
          <Card variant="pressable">
            <CardHeader>
              <CardTitle>Pressable card</CardTitle>
              <CardDescription>Hover and click me: it lifts, then sinks.</CardDescription>
            </CardHeader>
            <CardContent>Use for clickable cards only.</CardContent>
          </Card>
          <Card className="bg-track-ai-tint border-transparent">
            <CardHeader>
              <span className="bg-track-ai text-primary-foreground flex size-10 items-center justify-center rounded-xl">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <CardTitle className="mt-2">Track-tinted card</CardTitle>
              <CardDescription className="text-ink">
                For a track&apos;s own content.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ai">AI track</Badge>
          <Badge variant="marketing">Marketing track</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <h3 className="mt-8 mb-3 font-bold">Module status</h3>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((status) => (
            <ModuleStatusBadge key={status} status={status} />
          ))}
        </div>
        <h3 className="mt-8 mb-3 font-bold">Enrollment status</h3>
        <div className="flex flex-wrap gap-3">
          {(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((status) => (
            <EnrollmentStatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Illustrations">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ILLUSTRATIONS.map(({ name, Component }) => (
            <li key={name} className="border-line rounded-card bg-background border p-4">
              <Component />
              <code className="text-ink-soft mt-2 block text-sm">{name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-xl gap-5">
          <div className="grid gap-2">
            <Label htmlFor="design-email">Email</Label>
            <Input id="design-email" type="email" placeholder="you@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="design-invalid">Invalid</Label>
            <Input id="design-invalid" aria-invalid defaultValue="not-an-email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="design-disabled">Disabled</Label>
            <Input id="design-disabled" disabled defaultValue="Read only" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="design-bio">Textarea</Label>
            <Textarea id="design-bio" placeholder="A few words about you" />
          </div>
        </div>
      </Section>
    </main>
  );
}

const SWATCH_CLASS: Record<string, string> = {
  canvas: 'bg-canvas',
  soft: 'bg-soft',
  ink: 'bg-ink',
  'ink-soft': 'bg-ink-soft',
  line: 'bg-line',
  'line-strong': 'bg-line-strong',
  'track-ai': 'bg-track-ai',
  'track-ai-ink': 'bg-track-ai-ink',
  'track-ai-tint': 'bg-track-ai-tint',
  'track-ai-shadow': 'bg-track-ai-shadow',
  'track-marketing': 'bg-track-marketing',
  'track-marketing-ink': 'bg-track-marketing-ink',
  'track-marketing-tint': 'bg-track-marketing-tint',
  'track-marketing-shadow': 'bg-track-marketing-shadow',
  passed: 'bg-passed',
  'passed-ink': 'bg-passed-ink',
  'passed-tint': 'bg-passed-tint',
  active: 'bg-active',
  'active-ink': 'bg-active-ink',
  'active-tint': 'bg-active-tint',
  locked: 'bg-locked',
  'locked-ink': 'bg-locked-ink',
  'locked-tint': 'bg-locked-tint',
  failed: 'bg-failed',
  'failed-ink': 'bg-failed-ink',
  'failed-tint': 'bg-failed-tint',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="text-heading border-line border-b pb-3 font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
