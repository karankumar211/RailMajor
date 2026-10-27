import gsap from 'gsap';

/**
 * RailOpt AI - Control Room GSAP Animation Helpers
 * Fast (150-300ms), purposeful, and functional animations.
 */

// Amber flash + fade-in for newly appeared conflicts or high-priority warnings
export const flashIn = (el) => {
  if (!el) return;
  return gsap.timeline()
    .fromTo(
      el,
      { opacity: 0, backgroundColor: 'rgba(255, 176, 32, 0.4)' },
      { opacity: 1, backgroundColor: 'rgba(255, 176, 32, 0.12)', duration: 0.2, ease: 'power2.out' }
    )
    .to(el, {
      backgroundColor: 'transparent',
      duration: 0.25,
      ease: 'power2.out',
    });
};

// Fast slide-in from right for recommendation cards or side drawers
export const slideInFromRight = (el, onComplete) => {
  if (!el) return;
  return gsap.fromTo(
    el,
    { x: 32, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out', onComplete }
  );
};

// Snap to green border + subtle scale settle for accepted decisions
export const settleAccept = (el, onComplete) => {
  if (!el) return;
  return gsap.timeline({ onComplete })
    .to(el, {
      borderColor: '#3DD68C',
      backgroundColor: 'rgba(61, 214, 140, 0.15)',
      scale: 1.01,
      duration: 0.15,
      ease: 'power2.out',
    })
    .to(el, {
      scale: 1.0,
      backgroundColor: 'var(--panel)',
      duration: 0.2,
      ease: 'power2.out',
    });
};
