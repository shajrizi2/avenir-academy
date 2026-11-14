import type { JobCategory } from '../../../generated/prisma/enums.js';
import { fold } from '../text.js';

/**
 * The board's categories, matched on the title first and the source's own labels second.
 * Order matters: "Sales Engineer" is Sales, "Product Designer" is Design, "Customer Support
 * Engineer" is Support.
 */
const RULES: [JobCategory, RegExp][] = [
  [
    'SUPPORT',
    /\b(support|customer success|customer service|customer experience|help ?desk|service desk|success manager|cx)\b/,
  ],
  [
    'SALES',
    /\b(sales|account executive|business development|bdr|sdr|account manager|partnerships?|revenue|pre-?sales)\b/,
  ],
  [
    'MARKETING',
    /\b(marketing|marketer|seo|sem|growth|social media|brand|ppc|paid (media|social|search)|demand gen(eration)?|community manager|acquisition|crm|lifecycle|influencer|affiliate|media buyer|communications|pr manager|public relations)\b/,
  ],
  [
    'DESIGN',
    /\b(designer|design|ux|ui|illustrator|motion|graphic|art director|creative director|visual)\b/,
  ],
  [
    'AI_DATA',
    /\b(machine learning|ml|data scien(ce|tist)|data engineer(ing)?|data analyst|analytics|ai|llm|nlp|computer vision|deep learning|mlops|business intelligence|bi (analyst|developer)|statistician|research scientist)\b/,
  ],
  [
    'ENGINEERING',
    /\b(engineer(ing)?|developer|devops|sre|site reliability|front[- ]?end|back[- ]?end|full[- ]?stack|software|programmer|qa|quality assurance|test automation|mobile|ios|android|security|infrastructure|platform|architect|cto|tech lead|web3|blockchain|golang|python|java|javascript|typescript|react|node|php|ruby|rust|\.net|c\+\+|salesforce developer|wordpress)\b/,
  ],
  [
    'PRODUCT',
    /\b(product (manager|owner|lead|director|management|ops|operations)|program manager|project manager|scrum master|delivery manager|chief product)\b/,
  ],
  [
    'WRITING',
    /\b(writer|copywriter|editor|content|translator|translation|journalist|localization|technical writer|proofreader)\b/,
  ],
  [
    'HR',
    /\b(recruit(er|ing|ment)?|talent|people (ops|operations|partner)|hr|human resources|people team)\b/,
  ],
  [
    'FINANCE_ADMIN',
    /\b(finance|financial|accountant|accounting|bookkeep(er|ing)|controller|payroll|tax|legal|counsel|lawyer|paralegal|compliance|operations|ops|admin(istrative|istrator)?|executive assistant|virtual assistant|office manager|assistant|procurement|data entry)\b/,
  ],
];

export function categorize(title: string, sourceCategories: readonly string[] = []): JobCategory {
  for (const text of [fold(title), fold(sourceCategories.join(' | '))]) {
    if (!text) continue;
    for (const [category, re] of RULES) if (re.test(text)) return category;
  }
  return 'OTHER';
}
