/**
 * JSON-LD builders (plan 7.1). Only confirmed facts go in here.
 * alternateName is deliberately absent until Walid approves it.
 */
import { EMAIL, NAME, SITE_URL, SOCIALS } from '../site.config';

export const PERSON_ID = `${SITE_URL}/#person`;

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: NAME,
    url: `${SITE_URL}/`,
    email: `mailto:${EMAIL}`,
    // No jobTitle: next to worksFor it would read as his Shikenso title, which
    // is unconfirmed. Add it back only once Walid confirms the title.
    worksFor: { '@type': 'Organization', name: 'Shikenso' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Istanbul Kültür University' },
    affiliation: { '@type': 'CollegeOrUniversity', name: 'University of Freiburg' },
    address: { '@type': 'PostalAddress', addressLocality: 'Freiburg', addressCountry: 'DE' },
    knowsAbout: ['Computer vision', 'Machine learning', 'Android development', 'Scientific computing', 'PyTorch', 'Kotlin', 'C++'],
    sameAs: [SOCIALS.github.url, SOCIALS.linkedin.url],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: NAME,
    author: { '@id': PERSON_ID },
    inLanguage: 'en',
  };
}
