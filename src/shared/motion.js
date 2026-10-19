import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion =
  typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: true, addEventListener() {} };
const interactiveSelector = [
  'button:not(:disabled)',
  'a',
  'summary',
  '[role="button"]',
  '.calendar-event',
  '.booking-choice',
  '.booking-date',
  '.booking-slot',
  '.mode-card',
  '.entity-grid > .surface',
].join(',');
const revealSelector = [
  '.page-heading > *',
  '.stats-grid > *',
  '.entity-grid > *',
  '.professional-results > *',
  '.calendar-panel',
  '.booking-choices > *',
  '.booking-summary',
  '.availability-overview > *',
  '.availability-group-grid > *',
  '.schedule-panel',
  '.empty-state',
].join(',');

let routeContext;
let shellAnimated = false;
let initialized = false;

const canAnimate = () => !reducedMotion.matches;
const uniqueVisible = (elements) =>
  [...new Set(elements)].filter((element) => {
    if (!(element instanceof HTMLElement) || element.hidden) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

function animateShell() {
  if (shellAnimated || !canAnimate()) return;
  const shell = document.querySelector('.admin-layout, .booking-layout');
  if (!shell) return;
  shellAnimated = true;
  const navigation = uniqueVisible(
    shell.querySelectorAll(
      '.brand, .workspace-identity, .nav-section, .nav-item, .sidebar-bottom > *',
    ),
  );
  const chrome = uniqueVisible(
    shell.querySelectorAll(
      '.topbar > *, .portal-topbar > *, .mobile-tabbar, .app-footer > *',
    ),
  );
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (navigation.length)
    timeline.from(navigation, {
      autoAlpha: 0,
      x: -18,
      duration: 0.42,
      stagger: 0.025,
    });
  if (chrome.length)
    timeline.from(
      chrome,
      { autoAlpha: 0, y: -12, duration: 0.36, stagger: 0.035 },
      navigation.length ? '-=0.24' : 0,
    );
}

function revealOnScroll(elements) {
  const belowFold = elements.filter(
    (element) => element.getBoundingClientRect().top > innerHeight * 0.82,
  );
  if (!belowFold.length) return;
  gsap.set(belowFold, { autoAlpha: 0, y: 34, scale: 0.975 });
  ScrollTrigger.batch(belowFold, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.62,
        stagger: 0.07,
        ease: 'back.out(1.25)',
        clearProps: 'transform,opacity,visibility',
      }),
  });
}

export function animateView(
  root = document.querySelector('#main-content, .booking-surface'),
) {
  animateShell();
  if (!root || !canAnimate()) return;
  routeContext?.revert();
  routeContext = gsap.context(() => {
    const elements = uniqueVisible(root.querySelectorAll(revealSelector));
    const initial = elements
      .filter(
        (element) => element.getBoundingClientRect().top <= innerHeight * 0.82,
      )
      .slice(0, 18);
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline.fromTo(
      root,
      { autoAlpha: 0, y: 24, scale: 0.987 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.46,
        clearProps: 'transform,opacity,visibility',
      },
    );
    if (initial.length) {
      timeline.fromTo(
        initial,
        { autoAlpha: 0, y: 28, scale: 0.96 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.56,
          stagger: 0.045,
          ease: 'back.out(1.18)',
          clearProps: 'transform,opacity,visibility',
        },
        '-=0.26',
      );
    }
    revealOnScroll(elements);
  }, root);
}

export function animateThemeChange(applyTheme) {
  if (!canAnimate()) {
    applyTheme();
    return;
  }
  const app = document.querySelector('#app');
  gsap.to(app, {
    autoAlpha: 0.78,
    scale: 0.994,
    duration: 0.12,
    ease: 'power2.in',
    onComplete: () => {
      applyTheme();
      gsap.to(app, {
        autoAlpha: 1,
        scale: 1,
        duration: 0.34,
        ease: 'back.out(1.5)',
        clearProps: 'transform,opacity,visibility',
      });
    },
  });
}

export function animateDisclosure(panel, open) {
  if (!panel) return;
  gsap.killTweensOf(panel);
  if (!canAnimate()) {
    panel.hidden = !open;
    return;
  }
  if (open) {
    panel.hidden = false;
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: -8, scaleY: 0.94 },
      {
        autoAlpha: 1,
        y: 0,
        scaleY: 1,
        duration: 0.28,
        ease: 'power3.out',
        transformOrigin: 'top center',
        clearProps: 'transform,opacity,visibility',
      },
    );
    return;
  }
  gsap.to(panel, {
    autoAlpha: 0,
    y: -6,
    scaleY: 0.96,
    duration: 0.18,
    ease: 'power2.in',
    transformOrigin: 'top center',
    onComplete: () => {
      panel.hidden = true;
      gsap.set(panel, { clearProps: 'transform,opacity,visibility' });
    },
  });
}

export function animateDialog(dialog) {
  if (!dialog || !canAnimate()) return;
  gsap.fromTo(
    dialog,
    { autoAlpha: 0, y: 42, scale: 0.88, rotateX: -5 },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      duration: 0.52,
      ease: 'back.out(1.55)',
      clearProps: 'transform,opacity,visibility',
    },
  );
}

export function animateToast(toast) {
  if (!canAnimate()) return;
  gsap.fromTo(
    toast,
    { autoAlpha: 0, x: 28, y: 18, scale: 0.82 },
    {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.48,
      ease: 'back.out(1.8)',
    },
  );
}

export function animateToastOut(toast) {
  if (!canAnimate()) return Promise.resolve();
  return new Promise((resolve) => {
    gsap.to(toast, {
      autoAlpha: 0,
      x: 22,
      scale: 0.92,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: resolve,
    });
  });
}

function interactiveTarget(event) {
  const target = event.target.closest?.(interactiveSelector);
  return target && !target.closest('[aria-disabled="true"]') ? target : null;
}

function hoverIn(event) {
  if (!canAnimate() || !matchMedia('(hover: hover)').matches) return;
  const target = interactiveTarget(event);
  if (!target || target.contains(event.relatedTarget)) return;
  const horizontal = target.matches('.nav-item, .nav-subitem');
  gsap.to(target, {
    x: horizontal ? 5 : 0,
    y: horizontal ? 0 : -3,
    scale: target.matches('.entity-grid > .surface') ? 1.012 : 1.025,
    duration: 0.34,
    ease: 'power3.out',
    overwrite: 'auto',
  });
}

function hoverOut(event) {
  const target = interactiveTarget(event);
  if (!target || target.contains(event.relatedTarget)) return;
  gsap.to(target, {
    x: 0,
    y: 0,
    scale: 1,
    duration: 0.34,
    ease: 'power3.out',
    overwrite: 'auto',
    clearProps: 'transform',
  });
}

function press(event) {
  if (!canAnimate()) return;
  const target = interactiveTarget(event);
  if (!target) return;
  gsap.to(target, {
    scale: 0.965,
    duration: 0.1,
    ease: 'power2.out',
    overwrite: 'auto',
  });
}

function release(event) {
  if (!canAnimate()) return;
  const target = interactiveTarget(event);
  if (!target) return;
  gsap.to(target, {
    scale: 1,
    duration: 0.38,
    ease: 'elastic.out(1, 0.45)',
    overwrite: 'auto',
    clearProps: 'transform',
  });
}

export function initializeMotion() {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;
  document.addEventListener('pointerover', hoverIn);
  document.addEventListener('pointerout', hoverOut);
  document.addEventListener('pointerdown', press);
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      routeContext?.revert();
      gsap.globalTimeline.clear();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }
  });
}
