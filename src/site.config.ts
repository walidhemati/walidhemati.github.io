/**
 * Site identity: the single source of truth for name, contact and links.
 *
 * PROVISIONAL: Walid confirms the canonical name, email, GitHub and LinkedIn
 * (plan section 8, "Blocking decisions"). Change them HERE only.
 *
 * PRIVACY: never add phone, WhatsApp, date of birth, nationality or a home
 * address to this file or anywhere on the site.
 */

export const SITE_URL = 'https://walidhemati.github.io';

export const NAME = 'Walid Hemati';
/** Split for the two-line hero: WALID / HEMATI */
export const NAME_LINES = ['Walid', 'Hemati'] as const;

/** The ONE email constant. Used for mailto, copy-to-clipboard, JSON-LD, legal pages. */
export const EMAIL = 'walidhemati@gmail.com';

export const ROLE = 'ML & Software Engineer';
export const POSITIONING = 'ML & Software Engineer (Computer Vision, Android)';
export const DEFAULT_TITLE = `${NAME}: ${POSITIONING}`;
export const DEFAULT_DESCRIPTION =
  'Walid Hemati is an ML and software engineer in Freiburg: computer vision on broadcast and streamed video at Shikenso, privacy-first Android apps, and scientific computing in Python and C++.';

export const LOCATION = 'Freiburg';

/** Footer availability line (4.4 #17). Wording pending his confirmation. */
export const AVAILABILITY = 'Open to ML / SWE roles · Freiburg / remote EU';
/** Short form for the one-line hero pill (columns 1–3). Same pending wording. */
export const AVAILABILITY_SHORT = 'Open to ML / SWE · Freiburg / EU';

/**
 * Impressum address (§ 5 DDG). Leave EMPTY until Walid supplies a c/o service
 * or his own address; the page then shows a clearly marked placeholder line.
 */
export const IMPRESSUM_ADDRESS = '';

export const SOCIALS = {
  github: { label: 'GitHub', handle: 'walidhemati', url: 'https://github.com/walidhemati' },
  linkedin: {
    label: 'LinkedIn',
    handle: 'walid-abdul-hakim-5a6957235',
    url: 'https://www.linkedin.com/in/walid-abdul-hakim-5a6957235/',
  },
} as const;

export type SocialKey = keyof typeof SOCIALS;

/** Scrubbed CV (no DOB, phone, WhatsApp, nationality or address). The HTML CV lives at /cv/. */
export const CV_PAGE = '/cv/';
/** The scrubbed PDF in public/ (regenerate with scripts/cv-pdf.mjs). The HTML CV stays at /cv/. */
export const CV_PDF: string | null = '/cv.pdf';
export const CV_HREF = CV_PDF ?? CV_PAGE;

export interface NavItem {
  n: string;
  label: string;
  href: string;
}

export const NAV: readonly NavItem[] = [
  { n: '01', label: 'Work', href: '/work/' },
  { n: '02', label: 'About', href: '/about/' },
  { n: '03', label: 'Now', href: '/now/' },
  { n: '04', label: 'Contact', href: '/#contact' },
] as const;

export const LEGAL_NAV: readonly { label: string; href: string; lang: string }[] = [
  { label: 'Impressum', href: '/impressum/', lang: 'de' },
  { label: 'Datenschutz', href: '/datenschutz/', lang: 'de' },
] as const;

/** Site version shown in the footer (lynnandtonic-style versioned site). */
export const SITE_VERSION = 'v.2026';

export const THEME_COLOR = { light: '#F2F0EB', dark: '#0D0D0C' } as const;

/** localStorage keys read by the blocking inline prefs script. */
export const PREF_KEYS = { theme: 'wh-theme', motion: 'wh-motion' } as const;
