/* ============ init after CMS hydration ============ */

const initMarquees = () => {
  document.querySelectorAll('.marquee-track').forEach(track => {
    if (track.dataset.cloned) return;
    const originals = [...track.children];
    if (!originals.length) return;
    while (track.children.length < 8) {
      originals.forEach(node => track.appendChild(node.cloneNode(true)));
    }
    [...track.children].forEach(node => {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    });
    track.dataset.cloned = '1';
  });
};

const initNav = () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.nav');
  if (!toggle || !nav || toggle.dataset.bound) return;
  toggle.dataset.bound = '1';
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
};

const initForm = () => {
  const form = document.querySelector('.contact-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  const note = form.querySelector('.form-note');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    note.className = 'form-note';
    note.textContent = 'Sending…';

    const endpoint = form.getAttribute('action') || 'send.php';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok !== false) {
        note.className = 'form-note success';
        note.textContent = data.message || 'Thanks — we\'ll reply within 24 hours.';
        form.reset();
      } else {
        throw new Error(data.error || 'send-failed');
      }
    } catch (err) {
      note.className = 'form-note error';
      note.textContent = 'Something went wrong. Please email us directly.';
    }
  });
};

const initParallax = () => {
  const heroBg = document.querySelector('.hero-bg img');
  if (!heroBg || heroBg.dataset.bound) return;
  heroBg.dataset.bound = '1';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) {
      heroBg.style.transform = `translate3d(0, ${y * 0.15}px, 0) scale(1.05)`;
    }
  }, { passive: true });
};

const initHeader = () => {
  const header = document.getElementById('site-header');
  if (!header || header.dataset.bound) return;
  header.dataset.bound = '1';
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
};

const initAOS = () => {
  if (!window.AOS) return;
  AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
};

const postCMS = () => {
  initMarquees();
  initNav();
  initForm();
  if (window.AOS) AOS.refreshHard();
};

const bootstrap = () => {
  initHeader();
  initNav();
  initAOS();
  initMarquees();
  initForm();
  initParallax();
  /* CMS may have finished before this script registered its listener.
     Check flag; else wait for cms:ready. */
  if (window.__CMS_READY) postCMS();
  else document.addEventListener('cms:ready', postCMS, { once: true });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();
