/**
 * Two-key reduced motion (plan 4.6): the OS setting OR the site toggle
 * (html[data-motion="reduce"]) turns decorative motion off.
 * Shared by motion.ts and the lazily loaded home chunk.
 */
const root = document.documentElement;
export const osReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
export const siteReduce = (): boolean => root.getAttribute('data-motion') === 'reduce';
export const motionAllowed = (): boolean => !osReduce.matches && !siteReduce();
