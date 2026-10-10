import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getLandingMessages } from '@/i18n/server';
import { JsonLd } from './json-ld';
import { LandingSection } from './landing-section';

export async function Faq() {
  const { t } = await getLandingMessages();
  return (
    <LandingSection id="faq" eyebrow={t.faq.eyebrow} title={t.faq.title}>
      <Accordion type="single" collapsible className="reveal mx-auto max-w-3xl space-y-3">
        {t.faq.items.map((item, i) => (
          <AccordionItem
            key={item.question}
            value={`faq-${i}`}
            className="border-line rounded-card bg-background data-[state=open]:border-ink border-2 px-5 transition-colors sm:px-6"
          >
            <AccordionTrigger className="text-ink min-h-16 items-center py-5 text-lg font-bold hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-ink-soft pb-6 text-base leading-7">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: t.faq.items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }}
      />
    </LandingSection>
  );
}
