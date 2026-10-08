/**
 * Inverted statement word fill (plan 4.4 #11). ONE implementation in all
 * browsers: ScrollTrigger scrub over SplitText words (aria-hidden host + sr-only copy). Not pinned.
 * Each word tweens a --fill custom property 0 → 1; CSS mixes its colour from
 * --invert-ink-3 to --invert-fg, so a theme switch mid-scroll stays correct.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

export function statement(el: HTMLElement): () => void {
  const split = SplitText.create(el, {
    type: 'words',
    wordsClass: 'fill-w',
    tag: 'span', // words live inside a <p>: never emit <div>
    aria: 'none', // the host is aria-hidden; an sr-only copy carries the text
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(
        self.words,
        { '--fill': 0 },
        {
          '--fill': 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: 0.4 },
        },
      );
    },
  });
  return () => split.revert();
}
