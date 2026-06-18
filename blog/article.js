// ===== VedSphere — shared article behaviour =====
(function () {
  // nav background on scroll
  const header = document.getElementById('header');
  const onScroll = () => header && header.classList.toggle('navbg', window.scrollY > 20);
  onScroll();

  // mobile menu
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
  }

  // reading progress + back-to-top
  const bar = document.getElementById('progress');
  const top = document.getElementById('toTop');
  const tick = () => {
    onScroll();
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
    if (bar) bar.style.width = pct + '%';
    if (top) top.classList.toggle('show', (h.scrollTop || 0) > 600);
  };
  tick();
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick, { passive: true });
  if (top) top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // scroll reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // share buttons (copy link fallback)
  document.querySelectorAll('[data-share="copy"]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard && navigator.clipboard.writeText(location.href);
      const old = b.getAttribute('aria-label');
      b.setAttribute('aria-label', 'Link copied!');
      setTimeout(() => b.setAttribute('aria-label', old || 'Copy link'), 1600);
    });
  });
})();
