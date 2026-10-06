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
    <LandingSection id="faq" tone="muted" eyebrow={t.faq.eyebrow} title={t.faq.title}>
      <Accordion
        type="single"
        collapsible
        className="reveal mx-auto max-w-3xl rounded-xl border bg-white px-4 sm:px-6"
      >
        {t.faq.items.map((item, i) => (
          <AccordionItem key={item.question} value={`faq-${i}`}>
            <AccordionTrigger className="py-5 text-base font-medium text-slate-900">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-base leading-7 text-slate-600">
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
