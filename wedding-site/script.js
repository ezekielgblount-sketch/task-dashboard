// Countdown, scroll reveals, a gentle hero parallax, and light snowfall.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Countdown to Jan 2, 2027, 1:00 PM Eastern ---------- */
(function countdown() {
  const el = document.querySelector('.countdown');
  if (!el) return;

  const target = new Date(el.dataset.target).getTime();
  const done = document.querySelector('.countdown__done');
  const parts = {
    days: el.querySelector('[data-unit="days"]'),
    hours: el.querySelector('[data-unit="hours"]'),
    minutes: el.querySelector('[data-unit="minutes"]'),
    seconds: el.querySelector('[data-unit="seconds"]'),
  };
  const pad = (n) => String(n).padStart(2, '0');
  let timer;

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      el.hidden = true;
      if (done) done.hidden = false;
      clearInterval(timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    parts.days.textContent = Math.floor(s / 86400);
    parts.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    parts.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    parts.seconds.textContent = pad(s % 60);
  }

  timer = setInterval(tick, 1000);
  tick();
})();

/* ---------- Reveal content as it scrolls into view ---------- */
(function reveals() {
  const items = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));

  // At the very bottom of the page, show anything still waiting
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      items.forEach((el) => el.classList.add('is-in'));
    }
  }, { passive: true });
})();

/* ---------- Hero: slow parallax on the photo ---------- */
(function parallax() {
  const hero = document.querySelector('.hero');
  const img = document.querySelector('.hero__img');
  if (!hero || !img || reduceMotion) return;

  const wide = window.matchMedia('(min-width: 900px)');
  let ticking = false;
  function update() {
    ticking = false;
    if (!wide.matches) { img.style.transform = ''; return; }
    const y = window.scrollY;
    if (y < hero.offsetHeight) {
      img.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
    }
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();

/* ---------- Hero: light snowfall ---------- */
(function snow() {
  const canvas = document.querySelector('.hero__snow');
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr, flakes = [], running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(70, w / 18));
    flakes = Array.from({ length: count }, () => makeFlake(true));
  }

  function makeFlake(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r: 0.8 + Math.random() * 2,
      speed: 0.25 + Math.random() * 0.55,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.004 + Math.random() * 0.01,
      alpha: 0.35 + Math.random() * 0.5,
    };
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.speed;
      f.sway += f.swaySpeed;
      f.x += Math.sin(f.sway) * 0.35;
      if (f.y > h + 10) Object.assign(f, makeFlake(false));
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  // Only animate while the hero is on screen
  new IntersectionObserver(([entry]) => {
    const wasRunning = running;
    running = entry.isIntersecting;
    if (running && !wasRunning) requestAnimationFrame(frame);
  }).observe(canvas);

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
