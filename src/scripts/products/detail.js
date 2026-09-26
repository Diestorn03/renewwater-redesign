// Product detail: the configuration radios rewrite the WhatsApp quote links; the phone quote bar shows while the
// in-page quote card is off screen (after a little scroll).
import { onPage } from '../engine.js';

onPage(() => {
  const root = document.querySelector('.pd');
  if (!root) return;
  const links = [...document.querySelectorAll('[data-quote-link]')];
  const bar = document.getElementById('pd-bar');
  const cta = document.getElementById('pd-cta');

  const onChange = (e) => {
    const name = e.target.dataset.quote;
    if (e.target.name !== 'config' || !name) return;
    links.forEach((a) => {
      const [base, query = ''] = a.href.split('?text=');
      const ref = decodeURIComponent(query).match(/ \(ref: [\w-]+\)$/)?.[0] ?? '';
      a.href = `${base}?text=${encodeURIComponent(root.dataset.quoteTpl.replace('{name}', name) + ref)}`; // same encoding as buildWa
    });
  };
  root.addEventListener('change', onChange);

  let ctaVisible = false;
  const sync = () => {
    const on = !ctaVisible && window.scrollY > 240;
    bar.classList.toggle('is-on', on);
    bar.setAttribute('aria-hidden', String(!on));
    bar.querySelectorAll('a').forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
  };
  const io = new IntersectionObserver(([e]) => { ctaVisible = e.isIntersecting; sync(); });
  io.observe(cta);
  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    root.removeEventListener('change', onChange);
    window.removeEventListener('scroll', onScroll);
    cancelAnimationFrame(raf);
    io.disconnect();
  };
});
