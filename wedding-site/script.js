// Countdown, guest list + RSVP, scroll reveals, hero parallax, light snowfall.

// Address of the RSVP service (rsvp/Code.gs, deployed as a Google Apps
// Script web app). It ends in /exec. Leave empty until it's set up.
const RSVP_URL = 'https://script.google.com/macros/s/AKfycby_ORdmQHnFMniBen1Hx0FFjcboGvhcsPy9reW9cPSVothBprlIqkOYFEYIqJzFVfRvtA/exec';
const CONTACT_EMAIL = 'ezekielgblount@gmail.com';

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

/* ---------- Guest list + RSVP ---------- */
(async function guestsAndRsvp() {
  const $ = (id) => document.getElementById(id);
  const joinNames = (names) => names.length <= 1 ? names.join('')
    : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  const norm = (str) => str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '');
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };

  const form = $('rsvp-form');
  const listEl = $('guest-parties');
  const testMode = /[?&]test\b/.test(location.search);
  let current = null;

  /* Load the guest list (guests.json, shared with the RSVP service) */
  let parties = [];
  try {
    const res = await fetch('guests.json', { cache: 'no-cache' });
    parties = (await res.json()).parties || [];
  } catch (err) {
    if (listEl) listEl.appendChild(make('li', 'rsvp__nomatch', "The guest list didn't load. Refresh the page to try again."));
  }

  /* Guest list */
  if (listEl) {
    parties.forEach((party) => {
      const li = make('li', 'party');
      const btn = make('button', 'party__btn');
      btn.type = 'button';
      const text = make('span');
      text.appendChild(make('span', 'party__names', joinNames(party.members)));
      btn.appendChild(text);
      btn.appendChild(make('span', 'party__cta', 'RSVP'));
      btn.setAttribute('aria-label', 'RSVP for ' + joinNames(party.members));
      btn.addEventListener('click', () => {
        choose(party);
        document.getElementById('rsvp').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  if (!form) return;
  if (testMode) $('rsvp-test').hidden = false;

  const steps = {
    find: form.querySelector('[data-step="find"]'),
    details: form.querySelector('[data-step="details"]'),
    done: form.querySelector('[data-step="done"]'),
  };
  function show(step) {
    Object.keys(steps).forEach((k) => { steps[k].hidden = k !== step; });
  }

  /* Step 1: find your name (full names, first names, or nicknames) */
  const search = $('rsvp-search');
  const matches = $('rsvp-matches');
  const noMatch = $('rsvp-nomatch');

  search.addEventListener('input', () => {
    const q = norm(search.value.trim());
    matches.innerHTML = '';
    noMatch.hidden = true;
    if (q.length < 2) return;
    const words = q.split(/\s+/);
    const found = parties.filter((p) => {
      const names = norm(p.members.concat(p.aka || []).join(' '));
      const tokens = names.split(/\s+/);
      return words.every((w) => tokens.some((n) => n.startsWith(w))) || names.includes(q);
    });
    if (!found.length) { noMatch.hidden = false; return; }
    found.slice(0, 6).forEach((party) => {
      const li = make('li');
      const btn = make('button', 'rsvp__match');
      btn.type = 'button';
      btn.appendChild(make('span', 'rsvp__match-names', joinNames(party.members)));
      btn.appendChild(make('span', 'rsvp__match-cta', "That's us"));
      btn.addEventListener('click', () => choose(party));
      li.appendChild(btn);
      matches.appendChild(li);
    });
  });
  // Enter picks the first match instead of submitting
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = matches.querySelector('button');
      if (first) first.click();
    }
  });

  /* Step 2: Accept or Decline for each person */
  const peopleEl = $('rsvp-people');
  const respondent = $('rsvp-respondent');
  const errorEl = $('rsvp-error');
  const submitBtn = $('rsvp-submit');

  function choose(party) {
    current = party;
    $('rsvp-party-names').textContent = joinNames(party.members);
    peopleEl.innerHTML = '';
    party.members.forEach((name, i) => {
      const row = make('div', 'person');
      row.setAttribute('role', 'radiogroup');
      row.setAttribute('aria-label', name);
      row.appendChild(make('span', 'person__name', name));
      const opts = make('div', 'person__opts');
      [['yes', 'Accept'], ['no', 'Decline']].forEach(([value, label]) => {
        const lab = make('label', 'person__opt person__opt--' + value);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'person-' + i;
        radio.value = value;
        radio.id = 'rsvp-person-' + i + '-' + value;
        radio.dataset.name = name;
        lab.appendChild(radio);
        lab.appendChild(make('span', null, label));
        opts.appendChild(lab);
      });
      row.appendChild(opts);
      peopleEl.appendChild(row);
    });
    respondent.innerHTML = '';
    party.members.forEach((name) => respondent.appendChild(new Option(name, name)));
    $('rsvp-respondent-wrap').hidden = party.members.length === 1;
    errorEl.hidden = true;
    show('details');
    steps.details.querySelector('.rsvp__party').scrollIntoView({ block: 'nearest' });
  }

  $('rsvp-change').addEventListener('click', () => {
    current = null;
    show('find');
    search.focus();
  });
  $('rsvp-again').addEventListener('click', () => {
    current = null;
    search.value = '';
    matches.innerHTML = '';
    show('find');
    search.focus();
  });

  form.addEventListener('input', (e) => { if (e.target !== search) errorEl.hidden = true; });

  function fail(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!current) return;
    errorEl.hidden = true;

    const picked = [...peopleEl.querySelectorAll('input:checked')];
    const missing = current.members.filter((n) => !picked.some((r) => r.dataset.name === n));
    if (missing.length) {
      return fail(current.members.length === 1
        ? 'Please choose Accept or Decline.'
        : 'Please choose Accept or Decline for ' + joinNames(missing) + '.');
    }
    const coming = picked.filter((r) => r.value === 'yes').map((r) => r.dataset.name);
    const declined = picked.filter((r) => r.value === 'no').map((r) => r.dataset.name);
    const attending = coming.length > 0;

    const email = $('rsvp-email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('That email address doesn\'t look right. Check it, or leave it blank.');

    if (!RSVP_URL) {
      return fail('Online RSVPs open soon. In the meantime, email us at ' + CONTACT_EMAIL + '.');
    }

    const payload = {
      partyId: current.id,
      attending,
      coming,
      respondent: respondent.value || current.members[0],
      email,
      note: $('rsvp-note').value.trim(),
      test: testMode,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      // text/plain keeps this a "simple" request, which Apps Script accepts
      const res = await fetch(RSVP_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === 'not_on_list') throw new Error("We couldn't find your party on the guest list. Email us at " + CONTACT_EMAIL + '.');
        throw new Error('Something went wrong saving your RSVP. Please try again.');
      }
      const who = payload.respondent;
      let msg;
      if (!attending) msg = `Thanks for letting us know, ${who}. We'll miss you.`;
      else if (!declined.length) msg = `Thanks, ${who}! We have ${joinNames(coming)} down as coming. We can't wait to celebrate with you.`;
      else msg = `Thanks, ${who}! We have ${joinNames(coming)} down as coming, and ${joinNames(declined)} as unable to make it.`;
      $('rsvp-done-title').textContent = attending ? 'Thank you!' : "We'll miss you";
      $('rsvp-done-msg').textContent = msg + (testMode ? ' (Test only: nothing was saved.)' : '');
      form.reset();
      show('done');
      steps.done.focus();
    } catch (err) {
      fail(err.message && !/fetch|network|json/i.test(err.message)
        ? err.message
        : "We couldn't send your RSVP. Check your connection and try again, or email us at " + CONTACT_EMAIL + '.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send RSVP';
    }
  });
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

/* ---------- Our story: gold line draws down as you scroll ---------- */
(function storyLine() {
  const line = document.querySelector('.timeline');
  if (!line) return;
  if (reduceMotion) { line.style.setProperty('--progress', 1); return; }
  let ticking = false;
  function update() {
    ticking = false;
    const r = line.getBoundingClientRect();
    const p = (window.innerHeight * 0.65 - r.top) / r.height;
    line.style.setProperty('--progress', Math.max(0, Math.min(1, p)).toFixed(3));
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
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
