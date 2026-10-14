/**
 * The three courses on offer, shared by the development seed and the production seed
 * (src/cli/seed-courses.ts). Copy is Albanian; the product names stay as written. The
 * descriptions are a starting point for the product owner to adjust in the admin.
 */

export interface CatalogModule {
  title: string;
  description: string;
}

export interface CatalogCourse {
  slug: string;
  title: string;
  summary: string;
  description: string;
  modules: CatalogModule[];
}

export const PRICE_CENTS = 8900;
export const LIST_PRICE_CENTS = 15000;
export const CURRENCY = 'EUR';

/** The first groups: 1 November 2026 (a Sunday, so lectures start Monday the 2nd). */
export const FIRST_GROUP_START = '2026-11-01';
export const FIRST_GROUP_WEEKDAYS = [1, 3, 5];
export const FIRST_GROUP_START_TIME = '19:00';

export const CATALOG: CatalogCourse[] = [
  {
    slug: 'vibe-coding-ai',
    title: 'Development & Vibe Coding përmes AI',
    summary:
      'Ndërto aplikacione dhe automatizime reale me asistentë kodimi AI, nga ideja te një produkt që funksionon, edhe pa përvojë të mëparshme në programim.',
    description:
      'Një kurs live dhe praktik ku mëson të zhvillosh softuer me ndihmën e AI-së: si të përshkruash atë që do, si ta lexosh e ta korrigjosh kodin që të jep asistenti, si ta strukturosh një projekt dhe si ta publikosh. Çdo muaj ka 12 leksione live në Google Meet me profesionistë seniorë, mësime offline mes leksioneve dhe një test në fund. Punon mbi projektet e tua, me mjetet që përdoren sot në industri.',
    modules: [
      {
        title: 'Bazat e kodimit me AI',
        description:
          'Si funksionojnë asistentët e kodimit, mjedisi i punës, prompt-et që japin kod të mirë dhe leximi i gabimeve. Projekti i parë: një faqe dhe një skript që funksionojnë.',
      },
      {
        title: 'Aplikacione web me AI',
        description:
          'Struktura e një aplikacioni web, komponentët, të dhënat dhe formularët. Ndërton një aplikacion të plotë me ndihmën e AI-së dhe mëson ta testosh.',
      },
      {
        title: 'Të dhëna, API dhe automatizime',
        description:
          'Baza të dhënash, API-t, integrimi i shërbimeve të jashtme dhe automatizimi i punëve të përsëritura me AI.',
      },
      {
        title: 'Publikimi dhe projekti përfundimtar',
        description:
          'Siguria, cilësia e kodit, publikimi online dhe mirëmbajtja. Përfundon me projektin tënd të publikuar dhe të prezantuar para grupit.',
      },
    ],
  },
  {
    slug: 'digital-marketing-ai',
    title: 'Digital Marketing & AI',
    summary:
      'Planifiko, krijo dhe mat fushata që sjellin rezultate, me AI-në si bashkëpunëtor në çdo hap: strategji, përmbajtje, reklama dhe raportim.',
    description:
      'Një program live që mbulon marketingun digjital nga strategjia te matja, me AI-në të integruar në çdo modul. Mëson të pozicionosh një markë, të krijosh përmbajtje që shitet, të drejtosh fushata me pagesë dhe të lexosh të dhënat, duke përdorur AI-në për kërkime, tekste, kreativitet dhe raporte. 12 leksione live në muaj me profesionistë seniorë, mësime offline dhe një test mujor.',
    modules: [
      {
        title: 'Strategjia dhe audiencat me AI',
        description:
          'Pozicionimi, audiencat, rrugëtimi i klientit dhe objektivat e matshëm. AI-ja për kërkime tregu dhe analizë të konkurrencës.',
      },
      {
        title: 'Përmbajtja dhe rrjetet sociale',
        description:
          'Kalendari i përmbajtjes, formatet që funksionojnë në çdo rrjet dhe prodhimi i teksteve, imazheve dhe videove me AI.',
      },
      {
        title: 'Reklamat me pagesë',
        description:
          'Fushata në Meta, Google dhe TikTok: strukturë, audienca, kreativë me AI, buxhet dhe optimizim.',
      },
      {
        title: 'Analitika dhe automatizimi',
        description:
          'Matja e konvertimeve, panelet analitike, raportet me AI dhe automatizimi i marketingut. Projekti përfundimtar: një fushatë e plotë.',
      },
    ],
  },
  {
    slug: 'seo-ai',
    title: 'SEO përmes AI',
    summary:
      'Sill trafik organik që rritet çdo muaj: kërkimi i fjalëve kyçe, përmbajtja, SEO teknike dhe linket, me AI-në si mjet pune të përditshëm.',
    description:
      'Një kurs live për SEO-në e sotme, ku AI-ja përdoret në çdo fazë: nga gjetja e fjalëve kyçe te shkrimi i përmbajtjes, auditimi teknik dhe raportimi. Punon mbi një faqe reale (tënden ose të një klienti), 12 leksione live në muaj me profesionistë seniorë, mësime offline mes leksioneve dhe një test në fund të çdo moduli.',
    modules: [
      {
        title: 'Bazat e SEO-së dhe fjalët kyçe',
        description:
          'Si funksionojnë motorët e kërkimit, qëllimi i kërkimit, kërkimi dhe grupimi i fjalëve kyçe me AI.',
      },
      {
        title: 'Përmbajtja që renditet',
        description:
          'Struktura e faqeve, shkrimi dhe optimizimi i përmbajtjes me AI, meta-elementet dhe përmbajtja që i përgjigjet kërkimit.',
      },
      {
        title: 'SEO teknike',
        description:
          'Shpejtësia, indeksimi, arkitektura e faqes, të dhënat e strukturuara dhe auditimi teknik me ndihmën e AI-së.',
      },
      {
        title: 'Linket, autoriteti dhe raportimi',
        description:
          'Ndërtimi i linkeve, SEO lokale, matja e rezultateve dhe raportet automatike. Projekti përfundimtar: plani SEO i faqes tënde.',
      },
    ],
  },
];

/** Starter offline lessons for the first module of each course. */
export const STARTER_LESSONS: Record<
  string,
  { title: string; estimatedMin: number; content: string }[]
> = {
  'vibe-coding-ai': [
    {
      title: 'Si t’i flasësh një asistenti kodimi',
      estimatedMin: 15,
      content:
        '# Si t’i flasësh një asistenti kodimi\n\nNjë asistent kodimi punon më mirë kur e di **çfarë** do të ndërtosh, **për kë** dhe **me çfarë** mjetesh.\n\n## Tre pjesët e një prompt-i të mirë\n\n1. **Konteksti**: çfarë është projekti dhe ku je.\n2. **Detyra**: çfarë duhet të bëjë kodi, me një shembull.\n3. **Kufizimet**: gjuha, libraritë, stili.\n\n## Ushtrim\n\nShkruaj një prompt për një faqe që tregon orën e Tiranës dhe ndryshon ngjyrën pas orës 20:00. Ruaje prompt-in dhe sille në leksionin e radhës.',
    },
    {
      title: 'Leximi i gabimeve',
      estimatedMin: 10,
      content:
        '# Leximi i gabimeve\n\nGabimet janë informacion, jo dështim. Çdo mesazh gabimi ka tri pjesë: **ku** ndodhi, **çfarë** ndodhi dhe shpesh **pse**.\n\n- Kopjoje gabimin të plotë, jo vetëm rreshtin e parë.\n- Kërkoji asistentit ta shpjegojë para se ta rregullojë.\n- Pyete: «Çfarë duhet të ndryshoj që të mos ndodhë sërish?»\n\n> Këshillë: mbaj një skedar me gabimet që ke hasur dhe zgjidhjet e tyre.',
    },
  ],
  'digital-marketing-ai': [
    {
      title: 'Objektiva që maten',
      estimatedMin: 12,
      content:
        '# Objektiva që maten\n\nNjë objektiv i mirë marketingu është **specifik, i matshëm dhe me afat**.\n\n| I dobët | I mirë |\n| --- | --- |\n| Më shumë ndjekës | 500 ndjekës të rinj në Instagram deri më 30 nëntor |\n| Më shumë shitje | 40 porosi nga reklamat në Meta brenda 30 ditëve |\n\n## Ushtrim\n\nShkruaj tre objektiva për biznesin tënd (ose një biznes që njeh) dhe përdor AI-në për t’i kthyer në versione të matshme.',
    },
  ],
  'seo-ai': [
    {
      title: 'Qëllimi i kërkimit',
      estimatedMin: 12,
      content:
        '# Qëllimi i kërkimit\n\nPas çdo kërkimi në Google ka një **qëllim**: të mësojë diçka, të gjejë një faqe, të krahasojë ose të blejë.\n\n## Katër llojet\n\n- **Informues**: «si bëhet…», «çfarë është…»\n- **Navigues**: emri i një faqeje ose marke\n- **Krahasues**: «më i miri…», «X vs Y»\n- **Transaksional**: «bli…», «çmimi…»\n\n## Ushtrim\n\nMerr 10 fjalë kyçe nga fusha jote dhe përcakto qëllimin e secilës me ndihmën e AI-së. Kontrollo rezultatet e para në Google: a përputhen?',
    },
  ],
};
