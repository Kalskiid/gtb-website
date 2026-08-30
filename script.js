/* ============ AOS init ============ */
document.addEventListener('DOMContentLoaded', () => {
  if (window.AOS) {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
    });
  }

  /* ---------- Year ---------- */
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Sticky header shadow on scroll ---------- */
  const header = document.getElementById('site-header');
  const onScroll = () => {
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav toggle ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ---------- Marquee: duplicate items for seamless loop ---------- */
  document.querySelectorAll('.marquee-track').forEach(track => {
    const originals = [...track.children];
    if (!originals.length) return;
    originals.forEach(node => {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    });
  });

  /* ---------- Subtle hero parallax ---------- */
  const heroBg = document.querySelector('.hero-bg img');
  if (heroBg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroBg.style.transform = `translate3d(0, ${y * 0.15}px, 0) scale(1.05)`;
      }
    }, { passive: true });
  }

  /* ---------- Contact form (Formspree AJAX) ---------- */
  const form = document.querySelector('.contact-form');
  const note = form?.querySelector('.form-note');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      note.className = 'form-note';
      note.textContent = 'Sending…';

      const endpoint = form.getAttribute('action');
      const isPlaceholder = !endpoint || endpoint.includes('your-endpoint');

      if (isPlaceholder) {
        // Demo mode: no real endpoint configured.
        setTimeout(() => {
          note.className = 'form-note success';
          note.textContent = 'Demo mode: configure your Formspree endpoint in index.html to enable sending.';
          form.reset();
        }, 600);
        return;
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form),
        });
        if (res.ok) {
          note.className = 'form-note success';
          note.textContent = 'Thanks — we\'ll reply within 24 hours.';
          form.reset();
        } else {
          throw new Error('Bad response');
        }
      } catch {
        note.className = 'form-note error';
        note.textContent = 'Something went wrong. Please email sales@gtb-wholesale.com directly.';
      }
    });
  }
});
