import {
  DEFAULT_TIMEZONE,
  formatPrice,
  formatSqDate,
  formatSqTimeRange,
  HOLD_BANK_HOURS,
} from '@ai-academy/shared';

/**
 * Every email the platform sends, in Albanian. Each template returns the subject, a plain
 * text body and an HTML body built from the same lines, so both look the same.
 */

export interface Rendered {
  subject: string;
  text: string;
  html: string;
}

export interface SessionLine {
  title: string;
  startsAt: Date;
  durationMin: number;
}

export interface BankDetails {
  beneficiary: string | null;
  iban: string | null;
  bankName: string | null;
  swift: string | null;
}

const BRAND = 'Avenir Academy';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'button'; label: string; url: string }
  | { kind: 'link'; label: string; url: string }
  | { kind: 'table'; rows: [string, string][] };

/** One source of truth for text and HTML. */
function render(subject: string, greeting: string, blocks: Block[]): Rendered {
  const text: string[] = [greeting, ''];
  const html: string[] = [`<p>${esc(greeting)}</p>`];
  for (const block of blocks) {
    switch (block.kind) {
      case 'p':
        text.push(block.text, '');
        html.push(`<p>${esc(block.text)}</p>`);
        break;
      case 'list':
        text.push(...block.items.map((i) => `• ${i}`), '');
        html.push(`<ul>${block.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`);
        break;
      case 'button':
        text.push(`${block.label}: ${block.url}`, '');
        html.push(
          `<p><a href="${esc(block.url)}" style="display:inline-block;padding:12px 20px;background:#141414;color:#ffffff;border-radius:14px;font-weight:700;text-decoration:none">${esc(block.label)}</a></p>`,
        );
        break;
      case 'link':
        text.push(`${block.label}: ${block.url}`, '');
        html.push(`<p><a href="${esc(block.url)}">${esc(block.label)}</a></p>`);
        break;
      case 'table':
        text.push(...block.rows.map(([k, v]) => `${k}: ${v}`), '');
        html.push(
          `<table cellpadding="6" style="border-collapse:collapse">${block.rows
            .map(
              ([k, v]) =>
                `<tr><td style="color:#5b5b5b">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`,
            )
            .join('')}</table>`,
        );
        break;
    }
  }
  text.push('Me respekt,', `Ekipi i ${BRAND}`);
  html.push(`<p>Me respekt,<br>Ekipi i ${BRAND}</p>`);
  return {
    subject,
    text: text.join('\n'),
    html: `<!doctype html><html lang="sq"><body style="font-family:Arial,Helvetica,sans-serif;color:#141414;line-height:1.5;max-width:600px;margin:0 auto;padding:24px">${html.join('\n')}</body></html>`,
  };
}

const greet = (firstName: string) => `Përshëndetje ${firstName},`;

export function sessionLine(s: SessionLine, timeZone = DEFAULT_TIMEZONE): string {
  return `${formatSqDate(s.startsAt, { weekday: true, timeZone })}, ${formatSqTimeRange(s.startsAt, s.durationMin, timeZone)} · ${s.title}`;
}

// ---- Account ----

export function passwordReset(p: { firstName: string; link: string; minutes: number }): Rendered {
  return render(`Rivendos fjalëkalimin në ${BRAND}`, greet(p.firstName), [
    {
      kind: 'p',
      text: 'Morëm një kërkesë për të rivendosur fjalëkalimin tënd. Hap lidhjen më poshtë për të zgjedhur një fjalëkalim të ri:',
    },
    { kind: 'button', label: 'Vendos fjalëkalim të ri', url: p.link },
    {
      kind: 'p',
      text: `Lidhja skadon pas ${p.minutes} minutash dhe mund të përdoret vetëm një herë.`,
    },
    { kind: 'p', text: 'Nëse nuk e kërkove ti, mund ta shpërfillësh këtë email.' },
  ]);
}

// ---- Enrollment and payments ----

export function registrationConfirmed(p: {
  firstName: string;
  courseTitle: string;
  groupName: string;
  startDate: Date;
  sessions: SessionLine[];
  meetUrl: string | null;
  panelUrl: string;
  timeZone?: string;
}): Rendered {
  const tz = p.timeZone ?? DEFAULT_TIMEZONE;
  return render(`Je regjistruar në ${p.courseTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Pagesa jote u konfirmua dhe vendi yt në kursin «${p.courseTitle}» është i sigurt. Mirë se erdhe!`,
    },
    {
      kind: 'table',
      rows: [
        ['Kursi', p.courseTitle],
        ['Grupi', p.groupName],
        ['Fillimi', formatSqDate(p.startDate, { weekday: true, timeZone: tz })],
        ['Leksionet', `${p.sessions.length} leksione live në Google Meet`],
      ],
    },
    { kind: 'p', text: 'Orari i plotë i leksioneve të këtij muaji (ora e Shqipërisë):' },
    { kind: 'list', items: p.sessions.map((s) => sessionLine(s, tz)) },
    p.meetUrl
      ? { kind: 'link', label: 'Lidhja e Google Meet për leksionet', url: p.meetUrl }
      : {
          kind: 'p',
          text: 'Lidhja e Google Meet shfaqet në panelin tënd 15 minuta para çdo leksioni.',
        },
    {
      kind: 'p',
      text: 'Orarin e gjen edhe të bashkëngjitur si skedar kalendari (.ics), që ta shtosh në Google Calendar ose Outlook me një klik.',
    },
    {
      kind: 'p',
      text: 'Para çdo leksioni live do të marrësh një email kujtese: 24 orë dhe 1 orë para fillimit. Në ditët pa leksion të presin mësimet offline në panelin tënd.',
    },
    { kind: 'button', label: 'Hap panelin tënd', url: p.panelUrl },
  ]);
}

export function paymentPending(p: {
  firstName: string;
  courseTitle: string;
  moduleTitle: string;
  amountCents: number;
  currency: string;
  reference: string;
  bank: BankDetails;
  payBy: Date | null;
  paymentUrl: string;
}): Rendered {
  const rows: [string, string][] = [
    ['Shuma', formatPrice(p.amountCents, p.currency)],
    ['Referenca (shkruaje te përshkrimi i pagesës)', p.reference],
    ['Përfituesi', p.bank.beneficiary ?? '[plotësohet nga akademia]'],
    ['IBAN', p.bank.iban ?? '[plotësohet nga akademia]'],
    ['Banka', p.bank.bankName ?? '[plotësohet nga akademia]'],
    ...(p.bank.swift ? [['SWIFT/BIC', p.bank.swift] as [string, string]] : []),
  ];
  return render(`Të dhënat për pagesën: ${p.courseTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Faleminderit që zgjodhe «${p.courseTitle}». Për të konfirmuar vendin tënd, kryej transfertën bankare për ${p.moduleTitle} me të dhënat më poshtë:`,
    },
    { kind: 'table', rows },
    ...(p.payBy
      ? [
          {
            kind: 'p' as const,
            text: `Vendi yt mbahet ${HOLD_BANK_HOURS} orë, deri më ${formatSqDate(p.payBy, { weekday: true, time: true })}. Pasi ta marrim pagesën, e konfirmojmë dhe të dërgojmë orarin e plotë me email.`,
          },
        ]
      : [
          {
            kind: 'p' as const,
            text: 'Pasi ta marrim pagesën, e konfirmojmë dhe të njoftojmë me email.',
          },
        ]),
    { kind: 'button', label: 'Shiko të dhënat e pagesës', url: p.paymentUrl },
  ]);
}

export function paymentConfirmed(p: {
  firstName: string;
  courseTitle: string;
  moduleTitle: string;
  amountCents: number;
  currency: string;
  receiptUrl: string | null;
  panelUrl: string;
}): Rendered {
  return render(`Pagesa u konfirmua: ${p.moduleTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Morëm pagesën prej ${formatPrice(p.amountCents, p.currency)} për ${p.moduleTitle} të kursit «${p.courseTitle}». Faleminderit!`,
    },
    {
      kind: 'p',
      text: 'Moduli hapet sapo të kalosh testin e modulit të mëparshëm (moduli i parë hapet menjëherë).',
    },
    ...(p.receiptUrl ? [{ kind: 'link' as const, label: 'Shiko faturën', url: p.receiptUrl }] : []),
    { kind: 'button', label: 'Hap panelin tënd', url: p.panelUrl },
  ]);
}

export function paymentFailed(p: {
  firstName: string;
  courseTitle: string;
  moduleTitle: string;
  reason: 'card' | 'rejected';
  retryUrl: string;
}): Rendered {
  return render(`Pagesa nuk u krye: ${p.moduleTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text:
        p.reason === 'card'
          ? `Pagesa me kartë për ${p.moduleTitle} të kursit «${p.courseTitle}» nuk u krye. Mund të provosh sërish me një kartë tjetër ose të zgjedhësh transfertën bankare.`
          : `Nuk e konfirmuam dot transfertën bankare për ${p.moduleTitle} të kursit «${p.courseTitle}». Nëse mendon se është gabim, na kontakto; përndryshe mund të nisësh pagesën sërish.`,
    },
    { kind: 'button', label: 'Provo pagesën sërish', url: p.retryUrl },
  ]);
}

export function holdExpiring(p: {
  firstName: string;
  courseTitle: string;
  reference: string;
  expiresAt: Date;
  paymentUrl: string;
}): Rendered {
  return render(`Vendi yt skadon së shpejti: ${p.courseTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Vendi yt në kursin «${p.courseTitle}» mbahet deri më ${formatSqDate(p.expiresAt, { weekday: true, time: true })}. Ende nuk e kemi marrë transfertën bankare me referencën ${p.reference}.`,
    },
    {
      kind: 'p',
      text: 'Nëse e ke kryer tashmë pagesën, mos u shqetëso: e konfirmojmë sapo të arrijë. Nëse jo, kryeje para afatit që të mos e humbësh vendin.',
    },
    { kind: 'button', label: 'Shiko të dhënat e pagesës', url: p.paymentUrl },
  ]);
}

export function holdExpired(p: {
  firstName: string;
  courseTitle: string;
  courseUrl: string;
}): Rendered {
  return render(`Afati i pagesës skadoi: ${p.courseTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Afati për pagesën e muajit të parë në kursin «${p.courseTitle}» skadoi dhe vendi u lirua për të tjerët.`,
    },
    {
      kind: 'p',
      text: 'Nëse ende do të marrësh pjesë, mund ta nisësh sërish regjistrimin; nëse ka ende vende, e merr menjëherë.',
    },
    { kind: 'button', label: 'Shiko kursin', url: p.courseUrl },
  ]);
}

export function refundIssued(p: {
  firstName: string;
  courseTitle: string;
  moduleTitle: string;
  amountCents: number;
  currency: string;
}): Rendered {
  return render(`Rimbursim: ${p.moduleTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Të rimbursuam ${formatPrice(p.amountCents, p.currency)} për ${p.moduleTitle} të kursit «${p.courseTitle}». Shuma kthehet në kartën tënde brenda 5–10 ditësh pune, sipas bankës.`,
    },
    { kind: 'p', text: 'Nëse ke pyetje, na shkruaj duke iu përgjigjur këtij email-i.' },
  ]);
}

export function waitlistJoined(p: {
  firstName: string;
  courseTitle: string;
  groupName: string;
}): Rendered {
  return render(`Je në listën e pritjes: ${p.courseTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Grupi «${p.groupName}» i kursit «${p.courseTitle}» është i plotë për momentin, ndaj të vendosëm në listën e pritjes.`,
    },
    {
      kind: 'p',
      text: 'Sapo të lirohet një vend ose të hapet një grup i ri, të njoftojmë me email dhe të mbajmë një vend 48 orë që të kryesh pagesën.',
    },
  ]);
}

export function seatOffered(p: {
  firstName: string;
  courseTitle: string;
  groupName: string;
  startDate: Date;
  expiresAt: Date;
  checkoutUrl: string;
}): Rendered {
  return render(`Një vend për ty: ${p.courseTitle}`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Lajm i mirë: ke një vend në grupin «${p.groupName}» të kursit «${p.courseTitle}», që nis më ${formatSqDate(p.startDate, { weekday: true })}.`,
    },
    {
      kind: 'p',
      text: `Vendi mbahet për ty deri më ${formatSqDate(p.expiresAt, { weekday: true, time: true })}. Kryej pagesën e muajit të parë para këtij afati që ta konfirmosh.`,
    },
    { kind: 'button', label: 'Paguaj dhe konfirmo vendin', url: p.checkoutUrl },
  ]);
}

// ---- Lectures and offline learning ----

export function lectureReminder(p: {
  firstName: string;
  hoursBefore: 24 | 1;
  courseTitle: string;
  session: SessionLine;
  meetUrl: string | null;
  panelUrl: string;
}): Rendered {
  const when = p.hoursBefore === 24 ? 'nesër' : 'pas një ore';
  return render(`Leksioni live ${when}: ${p.session.title}`, greet(p.firstName), [
    { kind: 'p', text: `Të kujtojmë leksionin e radhës të kursit «${p.courseTitle}»:` },
    {
      kind: 'table',
      rows: [
        ['Tema', p.session.title],
        ['Data', formatSqDate(p.session.startsAt, { weekday: true })],
        ['Ora', formatSqTimeRange(p.session.startsAt, p.session.durationMin)],
      ],
    },
    p.meetUrl
      ? { kind: 'button', label: 'Hyr në Google Meet', url: p.meetUrl }
      : { kind: 'button', label: 'Hyr në Google Meet nga paneli', url: p.panelUrl },
    {
      kind: 'p',
      text: 'Butoni «Hyr në Google Meet» në panel aktivizohet 15 minuta para fillimit.',
    },
  ]);
}

export function offlineLearning(p: {
  firstName: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string | null;
  lessonUrl: string;
  nextSession: SessionLine | null;
}): Rendered {
  return render(`Sot pa leksion: vazhdo mësimin offline`, greet(p.firstName), [
    {
      kind: 'p',
      text: `Sot nuk ka leksion live për «${p.courseTitle}», por mund ta mbash ritmin me mësimin offline të ${p.moduleTitle}.`,
    },
    p.lessonTitle
      ? { kind: 'p', text: `Mësimi yt i radhës: «${p.lessonTitle}».` }
      : { kind: 'p', text: 'Hyr në panel dhe shiko materialet dhe mësimet e modulit.' },
    { kind: 'button', label: p.lessonTitle ? 'Vazhdo mësimin' : 'Hap panelin', url: p.lessonUrl },
    ...(p.nextSession
      ? [{ kind: 'p' as const, text: `Leksioni tjetër live: ${sessionLine(p.nextSession)}.` }]
      : []),
  ]);
}
