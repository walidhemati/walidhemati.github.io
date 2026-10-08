/**
 * Home-only section reveals (plan 4.4 #5, #8, #9, #15).
 *
 * ONE implementation per browser (4.1 #6):
 *  - Browsers with scroll-driven animations (animation-timeline: view()) use the
 *    CSS path in motion.css; this script then only indexes stagger children.
 *  - Everyone else gets this IntersectionObserver path, which adds .is-in to
 *    [data-reveal], [data-reveal-stagger], .reveal-rule and [data-reveal-trace].
 * The CSS only hides anything under html.js-motion, so without this script (or
 * with reduced motion) everything is simply visible.
 */
const SELECTOR = '[data-reveal], [data-reveal-stagger], .reveal-rule, [data-reveal-trace]';

export const scrollDrivenCSS = (): boolean =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');

export function initReveal(scope: ParentNode = document): () => void {
  const els = Array.from(scope.querySelectorAll<HTMLElement>(SELECTOR));
  if (!els.length) return () => {};

  // index children of stagger groups so CSS can compute the delay / range offset
  els
    .filter((el) => el.hasAttribute('data-reveal-stagger'))
    .forEach((group) => Array.from(group.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i))));

  if (scrollDrivenCSS()) return () => {};

  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
