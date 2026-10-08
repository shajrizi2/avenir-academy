import { getLandingMessages } from '@/i18n/server';

/** Three big numbers. Only facts that hold for every cohort; never learner counts. */
export async function SocialProof() {
  const { t } = await getLandingMessages();
  return (
    <section aria-label={t.proof.label} className="bg-soft border-line border-y">
      <dl className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:py-16">
        {t.proof.items.map((item) => (
          <div key={item.label} className="reveal flex flex-col-reverse items-center text-center">
            <dt className="text-ink-soft mt-2 max-w-60 font-medium">{item.label}</dt>
            <dd className="text-ink text-title lg:text-display tracking-heading font-extrabold">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
