// Countdown to the ceremony + gentle fade-ins as sections scroll into view.

(function countdown() {
  const el = document.querySelector('.countdown');
  if (!el) return;

  // Jan 2, 2027, 1:00 PM Eastern (EST = UTC-5)
  const target = new Date(el.dataset.target).getTime();
  const done = document.querySelector('.countdown__done');
  const parts = {
    days: el.querySelector('[data-unit="days"]'),
    hours: el.querySelector('[data-unit="hours"]'),
    minutes: el.querySelector('[data-unit="minutes"]'),
    seconds: el.querySelector('[data-unit="seconds"]'),
  };
  const pad = (n) => String(n).padStart(2, '0');

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

  const timer = setInterval(tick, 1000);
  tick();
})();

(function fadeIns() {
  const items = document.querySelectorAll('.fade');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
})();
