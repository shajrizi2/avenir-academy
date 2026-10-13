import { BadRequestException, type ValidationError } from '@nestjs/common';

/**
 * Turns class-validator errors into Albanian messages. The DTOs keep their decorators; the
 * message is built here from the constraint type and the field, so every request body and
 * query string validates in Albanian without a message on every decorator.
 */

/** Field names as students and admins read them. Unknown fields fall back to the property. */
const FIELDS: Record<string, string> = {
  email: 'Email-i',
  password: 'Fjalëkalimi',
  firstName: 'Emri',
  lastName: 'Mbiemri',
  phone: 'Numri i telefonit',
  token: 'Lidhja',
  title: 'Titulli',
  titleSq: 'Titulli (shqip)',
  slug: 'Adresa (slug)',
  summary: 'Përmbledhja',
  summarySq: 'Përmbledhja (shqip)',
  description: 'Përshkrimi',
  descriptionSq: 'Përshkrimi (shqip)',
  coverUrl: 'Fotoja e kopertinës',
  startDate: 'Data e fillimit',
  startsAt: 'Data dhe ora e fillimit',
  opensAt: 'Hapja',
  closesAt: 'Mbyllja',
  durationMin: 'Kohëzgjatja',
  durationWeeks: 'Kohëzgjatja në javë',
  meetUrl: 'Lidhja e Google Meet',
  url: 'Lidhja',
  note: 'Shënimi',
  status: 'Statusi',
  role: 'Roli',
  bio: 'Biografia',
  avatarUrl: 'Fotoja',
  name: 'Emri',
  quote: 'Citati',
  locale: 'Gjuha',
  weekdays: 'Ditët e javës',
  startTime: 'Ora e fillimit',
  capacity: 'Vendet',
  instructorId: 'Instruktori',
  groupId: 'Grupi',
  moduleId: 'Moduli',
  enrollmentId: 'Regjistrimi',
  provider: 'Mënyra e pagesës',
  content: 'Përmbajtja',
  videoUrl: 'Lidhja e videos',
  estimatedMin: 'Minutat e vlerësuara',
  priceCents: 'Çmimi',
  listPriceCents: 'Çmimi standard',
  currency: 'Monedha',
  passMark: 'Pragu i kalimit',
  timeLimitMin: 'Koha në dispozicion',
  maxAttempts: 'Numri i tentativave',
  questions: 'Pyetjet',
  options: 'Opsionet',
  text: 'Teksti',
  points: 'Pikët',
  answers: 'Përgjigjet',
  records: 'Prezenca',
  isPublished: 'Publikimi',
  contactEmail: 'Email-i i kontaktit',
  contactPhone: 'Telefoni i kontaktit',
  whatsappNumber: 'Numri i WhatsApp',
  bankIban: 'IBAN-i',
  bankSwift: 'Kodi SWIFT',
  bankBeneficiary: 'Përfituesi',
  bankName: 'Banka',
  page: 'Faqja',
  pageSize: 'Madhësia e faqes',
  q: 'Kërkimi',
  ids: 'Renditja',
  offlineEmailsEnabled: 'Email-et e mësimit offline',
};

type Builder = (field: string, raw: string) => string;

/** Constraint type → message. `raw` is class-validator's own text (used for the numbers in it). */
const MESSAGES: Record<string, Builder> = {
  isEmail: (f) => `${f} duhet të jetë një adresë email-i e vlefshme`,
  isString: (f) => `${f} duhet të jetë tekst`,
  isNotEmpty: (f) => `${f} është i detyrueshëm`,
  isDefined: (f) => `${f} është i detyrueshëm`,
  minLength: (f, raw) => `${f} duhet të ketë të paktën ${num(raw)} karaktere`,
  maxLength: (f, raw) => `${f} duhet të ketë më së shumti ${num(raw)} karaktere`,
  isLength: (f, raw) => lengthMessage(f, raw),
  matches: (f) => `${f} nuk ka formatin e duhur`,
  isUrl: (f) => `${f} duhet të jetë një URL e plotë (https://…)`,
  isInt: (f) => `${f} duhet të jetë një numër i plotë`,
  isNumber: (f) => `${f} duhet të jetë numër`,
  min: (f, raw) => `${f} duhet të jetë të paktën ${num(raw)}`,
  max: (f, raw) => `${f} duhet të jetë më së shumti ${num(raw)}`,
  isBoolean: (f) => `${f} duhet të jetë po ose jo`,
  isEnum: (f) => `${f} ka një vlerë të panjohur`,
  isIn: (f) => `${f} ka një vlerë të panjohur`,
  isIso8601: (f) => `${f} duhet të jetë një datë e vlefshme`,
  isDateString: (f) => `${f} duhet të jetë një datë e vlefshme`,
  isArray: (f) => `${f} duhet të jetë një listë`,
  arrayMinSize: (f, raw) => `${f} duhet të ketë të paktën ${num(raw)} elemente`,
  arrayMaxSize: (f, raw) => `${f} duhet të ketë më së shumti ${num(raw)} elemente`,
  arrayUnique: (f) => `${f} nuk duhet të ketë përsëritje`,
  isObject: (f) => `${f} duhet të jetë një objekt`,
  whitelistValidation: (f) => `Fusha ${f} nuk pritej`,
  nestedValidation: (f) => `${f} ka vlera të pavlefshme`,
};

function num(raw: string): string {
  return /\d+/.exec(raw)?.[0] ?? '';
}

function lengthMessage(field: string, raw: string): string {
  // "x must be longer than or equal to 3 characters" / "shorter than or equal to 120"
  const n = num(raw);
  return raw.includes('longer')
    ? `${field} duhet të ketë të paktën ${n} karaktere`
    : `${field} duhet të ketë më së shumti ${n} karaktere`;
}

/** The field label, with array indexes read as "Pyetja 2". */
function label(property: string, parent?: string): string {
  if (/^\d+$/.test(property)) {
    const noun = parent === 'questions' ? 'Pyetja' : parent === 'options' ? 'Opsioni' : 'Elementi';
    return `${noun} ${Number(property) + 1}`;
  }
  return FIELDS[property] ?? property;
}

/** Flattens nested errors into one Albanian message per failed constraint. */
export function translateValidationErrors(errors: ValidationError[], parent?: string): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const field = label(error.property, parent);
    for (const [type, raw] of Object.entries(error.constraints ?? {})) {
      // A decorator with its own (already Albanian) message wins.
      const own =
        raw && !/^[a-zA-Z0-9_.]+ (must|should|contains)/.test(raw) && /[ëçË]|\bduhet\b/.test(raw);
      messages.push(own ? raw : (MESSAGES[type]?.(field, raw) ?? `${field} nuk është i vlefshëm`));
    }
    if (error.children?.length) {
      messages.push(...translateValidationErrors(error.children, error.property));
    }
  }
  return messages;
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException(translateValidationErrors(errors));
}
