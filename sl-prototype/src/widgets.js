/* ============================================================
   Widgets: each mounts into a zone slot OR a building panel.
   Same module, both placements (§7.1). Shared state per visit.
   ============================================================ */
const store = {
  get(k, d) { try { const v = localStorage.getItem('slcamp:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('slcamp:' + k, JSON.stringify(v)); } catch (e) {} }
};
function track(event, params) { console.log('%c[analytics] ' + event, 'color:#1F5C3A;font-weight:bold', params || {}); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const shared = { jokeLines: JOTD.lines, jokeRated: store.get('rated', {}), jokeKey: 'jotd', groans: 0, listeners: new Set() };
function emitShared() { shared.listeners.forEach((fn) => fn()); }

function widgetShell(el, { id, title, icon, color, foot }) {
  el.innerHTML = `<div class="widget" style="--c:${color}" data-wid="${id}">
    <div class="w-head"><span class="ico" aria-hidden="true">${icon}</span><span>${title}</span></div>
    <div class="w-play"></div>
    <div class="w-foot">${foot}</div></div>`;
  return el.querySelector('.widget');
}

/* ---------------- Joke ---------------- */
function mountJoke(el, placement) {
  const w = widgetShell(el, { id: 'joke', title: 'Joke of the Day', icon: '😂', color: '#F26B21',
    foot: `<a href="https://jokes.scoutlife.org/" data-out>More jokes →</a><a href="https://scoutlife.org/contact-us/" data-out>Send us your joke →</a>` });
  const play = w.querySelector('.w-play');
  play.innerHTML = `<div class="joke-box" aria-live="polite"></div>
    <div class="topics" role="group" aria-label="Find a joke by topic">${Object.keys(JOKES).map((t) => `<button type="button">${t}</button>`).join('')}</div>
    <div class="meter" role="group" aria-label="Rate this joke: Laugh-o-Meter"><span>Groan</span>
      ${['😩', '😐', '🙂', '😄', '🤣'].map((f, i) => `<button type="button" data-r="${i + 1}" aria-label="${['Groan', 'Meh', 'Funny', 'Really funny', 'LOL'][i]}" aria-pressed="false">${f}</button>`).join('')}<span>LOL</span></div>`;
  const box = play.querySelector('.joke-box');
  const render = () => {
    box.innerHTML = shared.jokeLines.map(([who, line]) => `<p>${who ? `<b>${esc(who)}:</b> ` : ''}${esc(line)}</p>`).join('') +
      (shared.jokeKey === 'jotd' ? `<p class="joke-credit">${JOTD.credit}</p>` : '');
    const r = shared.jokeRated[shared.jokeKey];
    play.querySelectorAll('.meter button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.r === r)));
  };
  shared.listeners.add(render); render();
  play.querySelectorAll('.topics button').forEach((b) => b.addEventListener('click', () => {
    const list = JOKES[b.textContent];
    let j; do { j = rnd(list); } while (list.length > 1 && j === shared.jokeLines);
    shared.jokeLines = j; shared.jokeKey = b.textContent + list.indexOf(j); shared.groans = 0;
    box.classList.remove('flip'); void box.offsetWidth; box.classList.add('flip');
    emitShared(); track('widget_interact', { widget: 'joke', action: 'topic:' + b.textContent, placement });
  }));
  play.querySelectorAll('.meter button').forEach((b) => b.addEventListener('click', () => {
    const r = +b.dataset.r;
    shared.jokeRated[shared.jokeKey] = r; store.set('rated', shared.jokeRated);
    track('widget_interact', { widget: 'joke', action: 'rate:' + r, placement });
    if (r === 1) {
      shared.groans++;
      if (shared.groans >= 5) { shared.groans = 0; w.classList.remove('melt'); void w.offsetWidth; w.classList.add('melt'); track('egg_found', { egg: 'joke-melt', location: placement }); }
    } else shared.groans = 0;
    emitShared();
  }));
  wireOut(w, 'joke', placement);
}

/* ---------------- Idea Machine (Boredom Buster) ---------------- */
function mountIdea(el, placement) {
  const w = widgetShell(el, { id: 'idea', title: 'The Idea Machine', icon: '⚙️', color: '#B7791F',
    foot: `<a href="https://scoutlife.org/section/hobbies-projects/funstuff/" data-out>More fun stuff to do →</a>` });
  const play = w.querySelector('.w-play');
  const icons = Object.values(IDEA_ICONS);
  play.innerHTML = `<p style="margin:0;font-size:15px">Bored? Turn the crank and the machine will cook up a project.</p>
    <div class="machine"><span class="steam"></span><span class="gear-ico" aria-hidden="true">⚙️</span>
      <div class="windows" aria-hidden="true">${[0, 1, 2].map(() => `<div class="win"><div class="reel"><span>${rnd(icons)}</span></div></div>`).join('')}</div>
      <div class="crank-row"><span class="crank" aria-hidden="true">🔧</span><button class="btn alt" type="button">CRANK IT!</button></div>
    </div><div class="idea-out" aria-live="polite"></div>`;
  const machine = play.querySelector('.machine'), out = play.querySelector('.idea-out'), btn = play.querySelector('.btn');
  btn.addEventListener('click', () => {
    if (machine.classList.contains('go')) return;
    const idea = rnd(IDEAS), ico = IDEA_ICONS[idea.type];
    const allSame = Math.random() < 0.18;
    const finals = allSame ? [ico, ico, ico] : [rnd(icons), rnd(icons), ico];
    if (!allSame && finals[0] === finals[1] && finals[1] === finals[2]) finals[0] = icons[(icons.indexOf(finals[0]) + 1) % icons.length];
    out.innerHTML = ''; machine.classList.remove('dance');
    const reels = play.querySelectorAll('.reel');
    reels.forEach((r, i) => {
      const seq = Array.from({ length: 10 + i * 4 }, () => rnd(icons)).concat(finals[i]);
      r.innerHTML = seq.map((s) => `<span>${s}</span>`).join('');
      r.style.transition = 'none'; r.style.transform = 'translateY(0)';
      void r.offsetWidth;
      const dur = reduceMotion() ? 0.01 : 0.9 + i * 0.35;
      r.style.transition = `transform ${dur}s cubic-bezier(.2,.7,.3,1.05)`;
      r.style.transform = `translateY(-${(seq.length - 1) * 54 - 0}px)`;
    });
    if (!reduceMotion()) machine.classList.add('go');
    Sound.play('crank');
    setTimeout(() => {
      machine.classList.remove('go');
      out.innerHTML = `<a class="ticket" href="${idea.u}" data-out><div class="tm">💡 Here’s an idea! · ⏱ ${idea.time}</div><div class="tt">${esc(idea.t)}</div><div class="ticket-cta">Let’s do it →</div></a>
        <button type="button" class="link-btn" style="min-height:36px">Try another!</button>`;
      out.querySelector('.link-btn').onclick = () => btn.click();
      wireOut(out, 'idea', placement);
      if (allSame) { machine.classList.add('dance'); Sound.play('toot'); track('egg_found', { egg: 'idea-dance', location: placement }); }
    }, reduceMotion() ? 50 : 1900);
    track('widget_interact', { widget: 'idea', action: 'crank', placement });
  });
  wireOut(w, 'idea', placement);
}

/* ---------------- Arcade cabinet ---------------- */
function mountArcade(el, placement) {
  const w = widgetShell(el, { id: 'arcade', title: 'Scout Life Arcade', icon: '🕹️', color: '#2B7FD0',
    foot: `<a href="https://scoutlife.org/section/games/mobile-games/" data-out>See all games →</a>` });
  const play = w.querySelector('.w-play');
  play.innerHTML = `<div class="cab"><div class="cabinet">
      <div class="marquee" aria-live="polite"></div>
      <div class="screen"><canvas width="160" height="120" aria-hidden="true"></canvas></div>
      <div class="controls"><button class="ctl" type="button" aria-label="Previous game">◀</button>
        <div class="joy" role="img" aria-label="Joystick"><i></i></div>
        <button class="ctl" type="button" aria-label="Next game">▶</button>
        <a class="start" data-out>PRESS START</a></div></div>
      <div class="arcade-desc"><p style="margin:0">Flip through our favorite games with the arrows, then hit <b>PRESS START</b> to play.</p><p style="margin:0;font-size:14px;color:#666">Tip: some joysticks do more than you’d think…</p></div></div>`;
  const cv = play.querySelector('canvas'), ctx = cv.getContext('2d');
  const marquee = play.querySelector('.marquee'), start = play.querySelector('.start');
  let idx = 0, t = 0, mini = null, raf = 0, visible = true;
  const set = (i) => { idx = (i + GAMES.length) % GAMES.length; marquee.textContent = GAMES[idx].t; start.href = GAMES[idx].u; };
  set(0);
  const [prev, next] = play.querySelectorAll('.ctl');
  prev.onclick = () => { set(idx - 1); track('widget_interact', { widget: 'arcade', action: 'prev', placement }); };
  next.onclick = () => { set(idx + 1); track('widget_interact', { widget: 'arcade', action: 'next', placement }); };
  function px(x, y, wd, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, wd, h); }
  function drawPreview() {
    const g = GAMES[idx]; t++;
    px(0, 0, 160, 120, g.c1);
    for (let i = 0; i < 160; i += 8) px((i - t) % 160 + (i - t < 0 ? 160 : 0), 100, 6, 2, g.c2);
    px(0, 102, 160, 18, '#00000055');
    const bx = 30 + Math.sin(t / 20) * 50 + 50, by = 80 - Math.abs(Math.sin(t / 12)) * (g.sprite === 'bounce' ? 50 : 24);
    if (g.sprite === 'bike') { px(bx - 10, 92, 8, 8, '#111'); px(bx + 6, 92, 8, 8, '#111'); px(bx - 6, 84, 16, 4, g.c2); px(bx, 74, 6, 10, '#fff'); }
    else if (g.sprite === 'puck') { px(bx, 50 + Math.sin(t / 9) * 30, 10, 10, g.c2); px(10, 40, 6, 30, '#fff'); px(144, 40 + Math.sin(t / 15) * 20, 6, 30, '#FF2E93'); }
    else { px(bx, by, 12, 12, g.c2); px(bx + 3, by + 3, 3, 3, '#111'); }
    ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; if ((t >> 5) % 2) ctx.fillText('PRESS START', 52, 20);
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible || document.body.classList.contains('paused')) return;
    if (mini) mini.step(); else drawPreview();
  }
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(cv);
  loop();
  // Joystick: track rotation; a full circle starts the hidden mini-game
  const joy = play.querySelector('.joy'), knob = joy.querySelector('i');
  let dragging = false, lastA = null, total = 0;
  joy.addEventListener('pointerdown', (e) => { dragging = true; joy.setPointerCapture(e.pointerId); lastA = null; total = 0; });
  joy.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = joy.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.min(14, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`;
    if (mini) { mini.move(Math.cos(a) * d / 14); return; }
    if (lastA != null && Math.hypot(dx, dy) > 8) { let da = a - lastA; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; total += da; }
    lastA = a;
    if (Math.abs(total) > Math.PI * 2) { total = 0; startMini(); }
  });
  const end = () => { dragging = false; knob.style.transform = ''; if (mini) mini.move(0); };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  // Keyboard alternative: press ← → ← → on a focused cabinet
  let seq = '';
  w.tabIndex = -1;
  w.addEventListener('keydown', (e) => {
    if (mini && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { mini.move(e.key === 'ArrowLeft' ? -1 : 1); e.preventDefault(); return; }
    seq = (seq + (e.key === 'ArrowLeft' ? 'L' : e.key === 'ArrowRight' ? 'R' : 'x')).slice(-4);
    if (seq === 'LRLR') startMini();
  });
  w.addEventListener('keyup', () => mini && mini.move(0));
  function startMini() {
    if (mini) return;
    track('egg_found', { egg: 'arcade-acorns', location: placement });
    marquee.textContent = 'ACORN CATCH!';
    let bx = 80, vx = 0, acorns = [], score = 0, frames = 0;
    mini = {
      move(v) { vx = v * 3; },
      step() {
        frames++;
        bx = Math.max(10, Math.min(150, bx + vx));
        if (frames % 22 === 0) acorns.push({ x: 10 + Math.random() * 140, y: 0 });
        px(0, 0, 160, 120, '#1A1440');
        acorns.forEach((a) => { a.y += 1.6; px(a.x - 3, a.y - 3, 6, 6, '#A0703C'); px(a.x - 3, a.y - 5, 6, 2, '#5a3a14'); });
        acorns = acorns.filter((a) => { if (a.y > 104 && a.y < 112 && Math.abs(a.x - bx) < 12) { score++; Sound.play('pop'); return false; } return a.y < 124; });
        px(bx - 12, 106, 24, 8, '#FFC629'); px(bx - 12, 104, 2, 4, '#FFC629'); px(bx + 10, 104, 2, 4, '#FFC629');
        ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.fillText('ACORNS ' + score, 4, 10); ctx.fillText(Math.max(0, 10 - (frames / 60 | 0)) + 's', 140, 10);
        if (frames > 600) {
          px(0, 0, 160, 120, '#1A1440'); ctx.fillStyle = '#39FF14'; ctx.font = '16px monospace'; ctx.fillText('NICE!', 56, 56);
          ctx.font = '8px monospace'; ctx.fillStyle = '#fff'; ctx.fillText(score + ' acorns caught', 40, 74);
          if (frames > 780) { mini = null; set(idx); }
        }
      }
    };
  }
  wireOut(w, 'arcade', placement);
}

/* ---------------- Gear Guide carousel ---------------- */
function mountGear(el, placement) {
  const w = widgetShell(el, { id: 'gear', title: 'Quartermaster’s Gear Guide', icon: '🎒', color: '#1F5C3A',
    foot: `<a href="https://scoutlife.org/section/outdoors/guygear/" data-out>All gear guides →</a><a href="https://scoutlife.org/section/outdoors/ask-the-gear-guy/" data-out>Ask the Gear Guy →</a>` });
  const play = w.querySelector('.w-play');
  const icons = ['🏕️', '👜', '🧦', '🔥', '👟'];
  play.innerHTML = `<div class="gtrack" tabindex="0" aria-label="Gear guides">${GEAR.map((g, i) => `<a class="gcard" href="${g.u}" data-out>
      <span class="gtype">${g.type}</span><span class="gicon" aria-hidden="true">${icons[i]}</span><span class="gt">${esc(g.t)}</span>${g.q ? `<span class="gq">Q: ${esc(g.q)}</span>` : ''}</a>`).join('')}</div>
    <div class="gnav"><button class="arr" type="button" aria-label="Previous">◀</button><div class="dots">${GEAR.map(() => '<i></i>').join('')}</div><button class="arr" type="button" aria-label="Next">▶</button></div>`;
  const track_ = play.querySelector('.gtrack'), dots = play.querySelectorAll('.dots i');
  const [prev, next] = play.querySelectorAll('.arr');
  const step = () => track_.querySelector('.gcard').offsetWidth + 12;
  const upd = () => { const i = Math.round(track_.scrollLeft / step()); dots.forEach((d, k) => d.classList.toggle('on', k === i)); };
  track_.addEventListener('scroll', upd, { passive: true }); upd();
  prev.onclick = () => { track_.scrollBy({ left: -step(), behavior: 'smooth' }); track('widget_interact', { widget: 'gear', action: 'prev', placement }); };
  next.onclick = () => {
    const atEnd = track_.scrollLeft + track_.clientWidth >= track_.scrollWidth - 4;
    if (atEnd) { backpackBurst(w); track('egg_found', { egg: 'backpack-burst', location: placement }); }
    else track_.scrollBy({ left: step(), behavior: 'smooth' });
    track('widget_interact', { widget: 'gear', action: 'next', placement });
  };
  wireOut(w, 'gear', placement);
}
function backpackBurst(host) {
  const items = ['🎒', '🔦', '🧭', '🥾', '🪢', '⛺', '🧢', '🥫'];
  const r = host.getBoundingClientRect();
  items.forEach((it, i) => {
    const s = document.createElement('span'); s.className = 'burst'; s.textContent = it;
    s.style.left = r.width / 2 + 'px'; s.style.top = r.height / 2 + 'px';
    const a = (i / items.length) * Math.PI * 2;
    s.style.setProperty('--dx', Math.cos(a) * 140 + 'px'); s.style.setProperty('--dy', Math.sin(a) * 120 + 'px'); s.style.setProperty('--r', (Math.random() * 360 | 0) + 'deg');
    host.appendChild(s); setTimeout(() => s.remove(), 1300);
  });
  Sound.play('pop');
}

function wireOut(root, id, placement) {
  root.querySelectorAll('[data-out]').forEach((a) => {
    if (a._wired) return; a._wired = true;
    a.addEventListener('click', () => track('widget_clickthrough', { widget: id, destination: a.href, placement }));
  });
}

const WIDGETS = { joke: mountJoke, idea: mountIdea, arcade: mountArcade, gear: mountGear };
function mountWidget(type, el, placement) { WIDGETS[type](el, placement); track('widget_view', { widget: type, placement }); }
