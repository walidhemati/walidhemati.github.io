/**
 * Blocking inline <head> script (plan 4.1 #2, 4.6 #4, 6.2). Kept tiny (~600 B).
 * Runs before first paint, so there is no theme/motion FOUC.
 *
 *  1. theme   localStorage 'wh-theme' = light|dark → html[data-theme];
 *             html[data-theme-effective] always holds the resolved theme
 *  2. motion  localStorage 'wh-motion' = reduce → html[data-motion="reduce"]
 *  3. js-motion is added only when BOTH keys allow motion; a 3s safety timeout
 *     removes it again if motion.ts never set html.motion-ready
 *  4. hero-settle: the wdth 100→72 settle runs only if the hero font is
 *     already usable within ~100ms of first paint (4.4 #2)
 *  5. cross-document view transitions are skipped when the site toggle says reduce
 *
 * Every storage access is wrapped in try/catch (private mode, blocked storage).
 */
import { PREF_KEYS } from '../site.config';

export const prefsInline = `(function(d){var r=d.documentElement,s=null;try{s=window.localStorage}catch(e){}
function g(k){try{return s?s.getItem(k):null}catch(e){return null}}
var t=g(${JSON.stringify(PREF_KEYS.theme)});if(t==='light'||t==='dark')r.setAttribute('data-theme',t);
var mm=function(q){return window.matchMedia&&window.matchMedia(q).matches};
r.setAttribute('data-theme-effective',(t==='light'||t==='dark')?t:(mm('(prefers-color-scheme: dark)')?'dark':'light'));
if(g(${JSON.stringify(PREF_KEYS.motion)})==='reduce')r.setAttribute('data-motion','reduce');
r.classList.remove('no-js');r.classList.add('js');
var red=function(){return mm('(prefers-reduced-motion: reduce)')||r.getAttribute('data-motion')==='reduce'};
if(!red()){r.classList.add('js-motion');
setTimeout(function(){if(!r.classList.contains('motion-ready'))r.classList.remove('js-motion')},3000);
var hf=function(){try{return d.fonts&&d.fonts.check('700 1em "Archivo Hero"')}catch(e){return false}};
var t0=Date.now(),poll=function(){if(hf()){r.classList.add('hero-settle')}else if(Date.now()-t0<100){requestAnimationFrame(poll)}};
requestAnimationFrame(poll)}
var skip=function(e){if(e.viewTransition&&red())e.viewTransition.skipTransition()};
window.addEventListener('pageswap',skip);window.addEventListener('pagereveal',skip)})(document);`;
