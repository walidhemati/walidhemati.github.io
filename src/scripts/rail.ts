/**
 * Project rail, touch and mobile (plan 4.4 #13): as each card snaps into view
 * its brackets LOCK ON (CSS transition with --ease-snap on .is-locked).
 * IntersectionObserver against the viewport (clipped by the rail), threshold .6.
 * Reduced motion / no JS: the CSS draws the brackets statically.
 */
export function rail(section: HTMLElement): () => void {
  const items = Array.from(section.querySelectorAll<HTMLElement>('[data-rail-item]'));
  if (!items.length || !('IntersectionObserver' in window)) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) en.target.classList.toggle('is-locked', en.intersectionRatio >= 0.6);
    },
    { threshold: [0, 0.6, 1] },
  );
  items.forEach((i) => io.observe(i));
  return () => {
    io.disconnect();
    items.forEach((i) => i.classList.remove('is-locked'));
  };
}
