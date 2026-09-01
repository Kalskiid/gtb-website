/* ============ CMS hydration ============
   Loads /data/*.json and populates elements marked with data-cms="section.path".
   Repeatable lists render into data-cms-list="section.path" containers. */

(async () => {
  const FILES = ['site','hero','why-us','services','suppliers','own-sites','telemarketing','contact'];
  const KEY   = f => f.replace(/-/g, '_');

  const store = {};
  await Promise.all(FILES.map(async f => {
    try {
      const r = await fetch(`data/${f}.json`, { cache: 'no-cache' });
      if (r.ok) store[KEY(f)] = await r.json();
    } catch {}
  }));

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get = (obj, path) => (path === '.' || path === '') ? obj : path.split('.').reduce((o,k) => (o == null ? undefined : o[k]), obj);
  const val = path => get(store, path);

  /* --- scalar hydration --- */
  document.querySelectorAll('[data-cms]').forEach(el => {
    const path = el.dataset.cms;
    const v = val(path);
    if (v == null || v === '') return;
    const target = el.dataset.cmsAttr;
    if (target === 'html') el.innerHTML = v;
    else if (target)       el.setAttribute(target, v);
    else                   el.textContent = v;

    /* mailto:/tel: auto-href from value */
    const hrefPrefix = el.dataset.cmsHrefPrefix;
    if (hrefPrefix && el.tagName === 'A') {
      const src = el.dataset.cmsHrefSource;
      const hrefVal = src ? val(src) : v;
      if (hrefVal) el.setAttribute('href', hrefPrefix + String(hrefVal).replace(/^(mailto:|tel:)/, ''));
    }
  });

  /* --- list hydration ---
     Template tokens: {{field}}, {{@raw:field}} (unsafe HTML), {{.}} scalar item */
  const renderTpl = (src, item) =>
    src.replace(/\{\{\s*(@raw:)?([\w.]+|\.)\s*\}\}/g, (_, raw, key) => {
      const v = get(item, key);
      if (v == null) return '';
      return raw ? String(v) : esc(v);
    });

  document.querySelectorAll('[data-cms-list]').forEach(container => {
    const path = container.dataset.cmsList;
    const items = val(path);
    if (!Array.isArray(items) || items.length === 0) return;
    const tpl = document.querySelector(container.dataset.cmsTemplate || '');
    if (!tpl) return;
    const src = tpl.innerHTML;
    container.innerHTML = items.map(item => renderTpl(src, item)).join('');
  });

  /* --- own-sites: nested per-site blocks (stacked layout with own marquee) --- */
  const sitesRoot = document.querySelector('[data-cms-sites]');
  if (sitesRoot && store.own_sites?.sites?.length) {
    sitesRoot.innerHTML = store.own_sites.sites.map(site => `
      <article class="site-block" data-aos="fade-up">
        <div class="site-block-copy">
          <a href="${esc(site.url||'#')}" target="_blank" rel="noopener" class="site-block-logo-link">
            ${site.logo ? `<img src="${esc(site.logo)}" alt="${esc((site.name||'')+(site.tld||''))}" class="site-block-logo" onerror="this.style.display='none'" />` : ''}
          </a>
          <p class="site-block-cat">${esc(site.category||'')}</p>
          <h3 class="site-block-title">${esc(site.name||'')}<span>${esc(site.tld||'')}</span></h3>
          <p class="site-block-desc">${esc(site.description||'')}</p>
          <a href="${esc(site.url||'#')}" target="_blank" rel="noopener" class="btn btn-primary btn-lg">${esc(site.cta_label||'Visit Site ↗')}</a>
        </div>
        <div class="site-block-brands">
          <p class="site-block-brands-label">${esc(site.brands_label||'Featured brands')}</p>
          <div class="marquee site-brand-marquee">
            <div class="marquee-track">
              ${(site.brands||[]).map(b => `<span class="marquee-item"><img src="${esc(b.logo||'')}" alt="${esc(b.name||'')}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'marquee-text',textContent:this.alt}))"/></span>`).join('')}
            </div>
          </div>
        </div>
      </article>
    `).join('');
  }

  /* footer copyright with {year} */
  const cpEl = document.querySelector('[data-cms-copyright]');
  if (cpEl && store.site?.footer?.copyright) {
    cpEl.textContent = store.site.footer.copyright.replace(/\{year\}/g, new Date().getFullYear());
  }

  /* signal script.js to rerun marquee-clone + AOS refresh with new DOM.
     Set a flag too — script.js may bind after this fires. */
  window.__CMS_READY = true;
  window.__CMS_STORE = store;
  document.dispatchEvent(new CustomEvent('cms:ready', { detail: store }));
})();
