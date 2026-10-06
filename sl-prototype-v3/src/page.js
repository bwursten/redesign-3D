/* ============================================================
   Page: sound, panels, minigames, header, strip, boot
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const campEl = $('#camp');
let has3D = false;

/* ---------------- Sound (synthesized; off by default) ---------------- */
const Sound = (() => {
  let ctx, on = store.get('sound', false), amb = null;
  const ensure = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());
  function tone(f, d, type = 'sine', vol = 0.15, f2) {
    const c = ensure(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + d);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + d);
  }
  function noise(d, freq, vol = 0.2) {
    const c = ensure(), b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start();
  }
  const fx = {
    clunk: () => { tone(140, 0.15, 'square', 0.08); tone(90, 0.2, 'sine', 0.15); },
    squeak: () => tone(900, 0.18, 'sine', 0.1, 1800), pop: () => tone(500, 0.08, 'sine', 0.15, 900),
    splash: () => noise(0.5, 1200, 0.4), hoot: () => { tone(420, 0.35, 'sine', 0.15, 380); setTimeout(() => tone(400, 0.5, 'sine', 0.15, 360), 380); },
    crank: () => { for (let i = 0; i < 8; i++) setTimeout(() => noise(0.04, 3000, 0.15), i * 110); },
    toot: () => { tone(520, 0.2, 'triangle', 0.12); setTimeout(() => tone(660, 0.3, 'triangle', 0.12), 200); },
    thunk: () => { noise(0.08, 400, 0.4); tone(160, 0.12, 'sine', 0.15); }, sizzle: () => noise(0.6, 4000, 0.15), ding: () => tone(1046, 0.4, 'triangle', 0.12)
  };
  function ambient() {
    if (amb) clearInterval(amb);
    amb = setInterval(() => {
      if (!on || document.hidden || document.body.classList.contains('paused')) return;
      const t = has3D ? Camp.state.time : 'day';
      if (Math.random() < 0.6) noise(0.05 + Math.random() * 0.05, 2500 + Math.random() * 2000, 0.06); // campfire crackle
      if (t === 'night' || t === 'dusk') { if (Math.random() < 0.5) for (let i = 0; i < 3; i++) setTimeout(() => tone(4200, 0.05, 'sine', 0.025), i * 70); }
      else if (Math.random() < 0.25) { const f = 2200 + Math.random() * 1200; tone(f, 0.12, 'sine', 0.04, f * 1.4); setTimeout(() => tone(f * 1.2, 0.1, 'sine', 0.04, f), 150); }
    }, 420);
  }
  function render() { const b = $('#soundBtn'); b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'); }
  return {
    toggle() { on = !on; store.set('sound', on); render(); if (on) { ensure().resume(); ambient(); fx.ding(); } track('camp_setting', { setting: 'sound', value: on }); },
    play(n) { if (on && fx[n]) try { ensure(); fx[n](); } catch (e) {} },
    unlockIfOn() { if (on) { ensure().resume(); if (!amb) ambient(); } },
    render
  };
})();

/* ---------------- toasts & hints ---------------- */
let toastT, hintShown = {};
function toast(msg) { const t = $('#campToast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3400); }
function hint(msg) { if (hintShown[msg]) return; hintShown[msg] = 1; const h = $('#campHint'); h.textContent = msg; h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 2600); }

/* ---------------- Building panels ---------------- */
const panel = $('#panel'), panelBody = $('#panelBody'), panelWidgets = {};
let openId = null, lastFocus = null;
const ZONE_FOR = { joke: '#zone-joke', idea: '#zone-idea', arcade: '#zone-arcade', gear: '#zone-gear' };
function card(it, pinned) {
  const sec = it.sec ? SECTIONS[it.sec] : null;
  return `<a class="mini-card${pinned ? ' pinned' : ''}" href="${it.u}" data-item="${pinned ? 'pinned' : 'latest'}">
    <span class="thumb">${it.img ? `<img src="${it.img}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span aria-hidden="true">${pinned ? '⭐' : '📄'}</span></span>
    <span>${pinned ? '<span class="camp-pick">Camp Pick</span><br>' : ''}<span class="mt">${esc(it.t)}</span></span></a>`;
}
function openBuilding(id, opts = {}) {
  const b = BUILDINGS.find((x) => x.id === id); if (!b) return;
  const sec = SECTIONS[b.section];
  if (openId !== id) {
    lastFocus = document.activeElement;
    const promo = opts.fromMarker || opts.source === 'promo' ? PROMOS.find((p) => p.building === id) : null;
    const pinned = promo ? [{ t: promo.t, u: promo.u, img: promo.img }, ...b.pinned.filter((p) => p.u !== promo.u)] : b.pinned;
    panel.style.setProperty('--c', sec.color);
    panelBody.innerHTML = `<h2 id="panelTitle">${b.icon} ${b.name}</h2><p class="blurb">${b.blurb}</p>
      <div class="cards">${pinned.slice(0, 2).map((p) => card(p, true)).join('')}</div>
      <h3>Latest from ${sec.name}</h3><div class="cards">${b.latest.map((p) => card(p)).join('')}</div>
      <h3>Try it here</h3><div class="panel-widget"></div>
      <div class="panel-links"><a href="${sec.url}">Go to ${sec.name} →</a><a href="${ZONE_FOR[b.widget]}" data-jump>Jump to ${sec.name} below ↓</a></div>`;
    if (!panelWidgets[id]) { panelWidgets[id] = document.createElement('div'); mountWidget(b.widget, panelWidgets[id], 'panel'); }
    $('.panel-widget', panelBody).appendChild(panelWidgets[id]);
    $$('.mini-card', panelBody).forEach((a) => a.addEventListener('click', () => track('panel_click', { building: id, item: a.dataset.item, url: a.href })));
    $('[data-jump]', panelBody).addEventListener('click', (e) => { e.preventDefault(); closePanel(); $(ZONE_FOR[b.widget]).scrollIntoView({ behavior: 'smooth', block: 'center' }); track('panel_click', { building: id, item: 'section_jump' }); });
    $('a[href="' + sec.url + '"]', panelBody).addEventListener('click', () => track('panel_click', { building: id, item: 'section_link' }));
    panelBody.scrollTop = 0;
  }
  openId = id; panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('open'));
  if (has3D && !Camp.isWalking) Camp.focusBuilding(id, true);
  if (location.hash !== '#camp-' + id) history.pushState({ camp: id }, '', '#camp-' + id);
  Sound.play('clunk');
  setTimeout(() => $('#panelClose').focus({ preventScroll: true }), 50);
  track('building_open', { building: id, source: opts.source || 'tap' });
}
function closePanel(fromPop) {
  if (!openId) return;
  panel.classList.remove('open'); setTimeout(() => { if (!panel.classList.contains('open')) panel.hidden = true; }, 380);
  const id = openId; openId = null;
  const walking = has3D && Camp.isWalking;
  if (has3D && !walking) Camp.resetView();
  if (!fromPop && location.hash.startsWith('#camp-') && location.hash !== '#camp-walk') history.pushState({}, '', walking ? '#camp-walk' : location.pathname + location.search);
  if (lastFocus && document.contains(lastFocus) && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
  return id;
}
$('#panelClose').addEventListener('click', () => closePanel());
window.addEventListener('popstate', () => {
  const h = location.hash, m = h.match(/^#camp-(\w+)/);
  if (m && m[1] !== 'walk') openBuilding(m[1], { source: 'deep_link' });
  else { closePanel(true); if (h !== '#camp-walk' && has3D && Camp.isWalking) Camp.exitWalk('back'); }
});
panel.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const f = $$('a,button,[tabindex="0"]', panel).filter((x) => x.offsetParent); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#overlay').hidden) return closeOverlay();
  if (openId) closePanel();
  else if (has3D && Camp.isWalking) Camp.exitWalk('esc');
});
$('#campStage').addEventListener('pointerdown', () => { if (openId && innerWidth >= 768) {/* tapping the scene keeps panel; tapping a building switches */ } });

/* ---------------- Overlay minigames & secrets ---------------- */
const overlay = $('#overlay'); let gameStop = null, overlayFocus = null;
function openGame(name, fixed) {
  overlayFocus = document.activeElement;
  overlay.classList.toggle('fixed', !!fixed); overlay.hidden = false;
  const body = $('#overlayBody'), title = $('#overlayTitle');
  if (gameStop) gameStop();
  if (name === 'smores') { title.textContent = '🔥 S’mores Toaster'; gameStop = smores(body); }
  else if (name === 'archery') { title.textContent = '🎯 Archery Range'; gameStop = archery(body); }
  else if (name === 'geocache-shell') { gameStop = null; }
  else if (name === 'cave') { title.textContent = '🪨 You found a hidden cave!'; gameStop = cave(body); track('egg_found', { egg: 'cave', location: 'camp' }); }
  track('minigame_play', { game: name, state: 'start' });
  setTimeout(() => $('#overlayClose').focus(), 30);
}
function closeOverlay() { overlay.hidden = true; if (gameStop) gameStop(); gameStop = null; overlayFocus && overlayFocus.focus && overlayFocus.focus({ preventScroll: true }); }
$('#overlayClose').addEventListener('click', closeOverlay);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

function gameCanvas(body, msg) {
  body.innerHTML = `<canvas width="520" height="300" tabindex="0"></canvas><div class="game-bar"><span class="game-msg" aria-live="polite">${msg}</span><button class="btn small" type="button">Start over</button></div>`;
  const cv = $('canvas', body); return { cv, ctx: cv.getContext('2d'), msg: $('.game-msg', body), reset: $('.btn', body) };
}
function smores(body) {
  const g = gameCanvas(body, 'Press and hold (or hold Space) to toast. Let go at golden-brown!');
  let lvl = 0, hold = false, phase = 'ready', taps = 0, t = 0, raf, dance = 0;
  const cols = [[255, 255, 255], [240, 200, 110], [200, 130, 50], [110, 60, 25], [30, 20, 15]];
  const colAt = (v) => { v = Math.max(0, Math.min(0.999, v)) * (cols.length - 1); const i = v | 0, f = v - i, a = cols[i], b = cols[i + 1]; return `rgb(${a.map((x, k) => x + (b[k] - x) * f | 0)})`; };
  const down = () => { if (phase === 'fire') { taps++; Sound.play('pop'); if (taps >= 8) { phase = 'done'; g.msg.textContent = 'Phew! You blew it out. Charcoal-flavored s’more, anyone?'; } return; } if (phase === 'ready' || phase === 'toasting') { hold = true; phase = 'toasting'; } };
  const up = () => {
    if (!hold) return; hold = false; if (phase !== 'toasting') return;
    if (lvl < 0.3) g.msg.textContent = 'Still gooey and white. Hold it over the fire longer!';
    else if (lvl < 0.62) { phase = 'done'; dance = 1; g.msg.textContent = '✨ PERFECT! Golden-brown marshmallow. It’s doing a happy dance!'; Sound.play('ding'); track('egg_found', { egg: 'smores-perfect', location: 'camp' }); track('minigame_play', { game: 'smores', state: 'finish', result: 'perfect' }); }
    else { phase = 'done'; g.msg.textContent = 'A little crispy! Some campers like it that way.'; track('minigame_play', { game: 'smores', state: 'finish', result: 'crispy' }); }
  };
  g.cv.addEventListener('pointerdown', down); g.cv.addEventListener('pointerup', up); g.cv.addEventListener('pointerleave', up);
  const kd = (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) down(); } }, ku = (e) => { if (e.code === 'Space') up(); };
  g.cv.addEventListener('keydown', kd); g.cv.addEventListener('keyup', ku);
  g.reset.onclick = () => { lvl = 0; phase = 'ready'; taps = 0; dance = 0; g.msg.textContent = 'Press and hold (or hold Space) to toast. Let go at golden-brown!'; };
  const c = g.ctx;
  function frame() {
    raf = requestAnimationFrame(frame); t += 1 / 60;
    if (hold && phase === 'toasting') { lvl += 0.0045; Sound.play(Math.random() < 0.05 ? 'sizzle' : ''); if (lvl > 1.05) { phase = 'fire'; hold = false; taps = 0; g.msg.textContent = '🔥 It caught fire! Tap fast to blow it out!'; } }
    c.fillStyle = '#10233a'; c.fillRect(0, 0, 520, 300);
    for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect((i * 97) % 520, (i * 53) % 140, 2, 2); }
    c.fillStyle = '#6B3E1B'; c.fillRect(170, 262, 180, 18); c.fillStyle = '#7A4B22'; c.fillRect(190, 252, 140, 14);
    [['#F26B21', 60, 110], ['#FFC629', 42, 80], ['#FFF6C2', 20, 46]].forEach(([col, w, h], i) => { const k = 1 + Math.sin(t * (10 + i * 4)) * 0.1; c.fillStyle = col; c.beginPath(); c.moveTo(260 - w, 256); c.quadraticCurveTo(260 - w * 0.6, 256 - h * k * 0.6, 260, 256 - h * k); c.quadraticCurveTo(260 + w * 0.6, 256 - h * k * 0.6, 260 + w, 256); c.fill(); });
    const my = hold ? 150 : 110, mx = 262, bob = dance ? Math.abs(Math.sin(t * 10)) * -30 : 0;
    c.strokeStyle = '#A0703C'; c.lineWidth = 6; c.beginPath(); c.moveTo(20, my + 80); c.lineTo(mx - 10, my + bob); c.stroke();
    c.fillStyle = colAt(lvl); c.fillRect(mx - 22, my - 22 + bob, 44, 40); c.strokeStyle = '#00000033'; c.lineWidth = 2; c.strokeRect(mx - 22, my - 22 + bob, 44, 40);
    if (dance) { c.fillStyle = '#111'; c.fillRect(mx - 10, my - 8 + bob, 5, 5); c.fillRect(mx + 5, my - 8 + bob, 5, 5); c.beginPath(); c.arc(mx, my + 3 + bob, 7, 0, Math.PI); c.stroke(); }
    if (phase === 'fire') { const k = 1 + Math.sin(t * 20) * 0.15; c.fillStyle = '#F26B21'; c.beginPath(); c.moveTo(mx - 24, my - 18); c.quadraticCurveTo(mx, my - 80 * k, mx + 24, my - 18); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText('Taps: ' + taps + ' / 8', 20, 30); }
    c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.fillText('Toastiness', 380, 30); c.fillStyle = '#333'; c.fillRect(380, 40, 120, 12);
    c.fillStyle = '#E8B04A'; c.fillRect(380 + 120 * 0.3, 40, 120 * 0.32, 12); c.fillStyle = colAt(lvl); c.fillRect(380, 56, Math.min(120, 120 * lvl), 6);
  }
  frame(); setTimeout(() => g.cv.focus(), 60);
  return () => cancelAnimationFrame(raf);
}
function archery(body) {
  const g = gameCanvas(body, 'Tap (or press Space) when the sight is on the bullseye. Watch the wind!');
  let t = 0, raf, arrows = [], flying = null, wind = (Math.random() * 2 - 1), shots = 0, score = 0, bulls = 0;
  const TX = 400, TY = 150, c = g.ctx;
  const sight = () => [TX + Math.sin(t * 1.3) * 48 + Math.sin(t * 3.1) * 14, TY + Math.sin(t * 1.7) * 42 + Math.cos(t * 2.3) * 12];
  function shoot() {
    if (flying || shots >= 5) return;
    const [sx, sy] = sight(); flying = { x0: 70, y0: 160, x1: sx + wind * 22, y1: sy + 4, p: 0 }; shots++; Sound.play('pop');
  }
  g.cv.addEventListener('pointerdown', shoot);
  g.cv.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); shoot(); } });
  g.reset.onclick = () => { arrows = []; shots = 0; score = 0; bulls = 0; wind = Math.random() * 2 - 1; g.msg.textContent = 'Tap (or press Space) when the sight is on the bullseye. Watch the wind!'; };
  function frame() {
    raf = requestAnimationFrame(frame); t += 1 / 60;
    c.fillStyle = '#8FD3FF'; c.fillRect(0, 0, 520, 300); c.fillStyle = '#6DBE45'; c.fillRect(0, 230, 520, 70);
    c.fillStyle = '#E2C35A'; c.fillRect(TX - 75, 215, 150, 40);
    [[70, '#fff'], [56, '#E53935'], [42, '#3FA9F5'], [28, '#FFC629'], [12, '#E53935']].forEach(([r, col]) => { c.fillStyle = col; c.beginPath(); c.arc(TX, TY, r, 0, 7); c.fill(); });
    c.fillStyle = '#5B3A1E'; c.fillRect(30, 60, 6, 60); c.fillStyle = '#E53935'; const fl = 30 * wind; c.beginPath(); c.moveTo(36, 62); c.lineTo(36 + Math.abs(fl) + 6, 70); c.lineTo(36, 78); c.fill();
    c.fillStyle = '#111'; c.font = 'bold 13px sans-serif'; c.fillText('Wind ' + (wind > 0.15 ? '→' : wind < -0.15 ? '←' : '·'), 20, 50);
    c.fillText('Arrows: ' + (5 - shots) + '   Score: ' + score, 20, 290);
    arrows.forEach(([x, y]) => { c.fillStyle = '#5B3A1E'; c.fillRect(x - 18, y - 2, 18, 4); c.fillStyle = '#F26B21'; c.fillRect(x - 22, y - 4, 6, 8); });
    if (flying) {
      flying.p += 0.06; const p = Math.min(1, flying.p), x = flying.x0 + (flying.x1 - flying.x0) * p, y = flying.y0 + (flying.y1 - flying.y0) * p - Math.sin(p * Math.PI) * 30;
      c.fillStyle = '#5B3A1E'; c.fillRect(x - 30, y - 2, 30, 4);
      if (p >= 1) {
        arrows.push([flying.x1, flying.y1]); const d = Math.hypot(flying.x1 - TX, flying.y1 - TY);
        const pts = d < 12 ? 10 : d < 28 ? 8 : d < 42 ? 6 : d < 56 ? 4 : d < 70 ? 2 : 0; score += pts; if (pts === 10) { bulls++; Sound.play('ding'); } else Sound.play('thunk');
        g.msg.textContent = pts === 10 ? '🎯 BULLSEYE!' : pts ? `+${pts} points` : 'Missed the target!';
        flying = null; wind = Math.max(-1, Math.min(1, wind + (Math.random() - 0.5) * 0.6));
        if (shots >= 5) { g.msg.textContent = `Done! ${score} points${bulls ? `, ${bulls} bullseye${bulls > 1 ? 's' : ''}!` : '.'}`; track('minigame_play', { game: 'archery', state: 'finish', score }); if (bulls >= 2) track('egg_found', { egg: 'archery-sharpshooter', location: 'camp' }); }
      }
    }
    if (shots < 5 && !flying) { const [sx, sy] = sight(); c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 10, 0, 7); c.moveTo(sx - 16, sy); c.lineTo(sx + 16, sy); c.moveTo(sx, sy - 16); c.lineTo(sx, sy + 16); c.stroke(); }
    c.strokeStyle = '#5B3A1E'; c.lineWidth = 5; c.beginPath(); c.arc(60, 160, 50, -1.2, 1.2); c.stroke();
  }
  frame(); setTimeout(() => g.cv.focus(), 60);
  return () => cancelAnimationFrame(raf);
}
function cave(body) {
  body.innerHTML = `<style>.cv-cr{animation:glow 1.6s ease-in-out infinite alternate}.cv-cr:nth-child(2n){animation-delay:.5s}@keyframes glow{to{opacity:.45}}.bat{transition:transform .6s}.bat.awake{animation:flut .25s linear 12}@keyframes flut{50%{transform:translate(-30px,20px) scaleY(.6)}}</style>
  <svg viewBox="0 0 520 300" style="width:100%;border-radius:12px;background:#15121c" role="img" aria-label="Inside the cave: glowing purple crystals, a sleepy bat hanging from the ceiling, and old cave paintings of a tent and a campfire">
    <path d="M0 0H520V300H0Z" fill="#1d1926"/><path d="M0 0Q260 120 520 0V40Q260 150 0 40Z" fill="#2b2536"/>
    <g fill="#C48A3A" opacity=".9"><path d="M60 200l40-50 40 50z" fill="none" stroke="#C48A3A" stroke-width="5"/><circle cx="190" cy="196" r="14"/><path d="M180 180q10-30 20 0" fill="#E57373"/>
    <g stroke="#C48A3A" stroke-width="4"><line x1="250" y1="160" x2="250" y2="190"/><line x1="250" y1="190" x2="240" y2="210"/><line x1="250" y1="190" x2="260" y2="210"/><circle cx="250" cy="152" r="7" fill="#C48A3A"/><line x1="236" y1="170" x2="264" y2="170"/></g></g>
    <g fill="#B388FF"><polygon class="cv-cr" points="380,300 395,220 410,300"/><polygon class="cv-cr" points="410,300 430,200 450,300" fill="#CE93D8"/><polygon class="cv-cr" points="450,300 462,240 475,300"/><polygon class="cv-cr" points="30,300 40,250 52,300" fill="#80DEEA"/></g>
    <g class="bat" id="bat" style="cursor:pointer;transform-origin:300px 70px"><line x1="300" y1="40" x2="300" y2="58" stroke="#555" stroke-width="2"/><ellipse cx="300" cy="72" rx="12" ry="16" fill="#3b3346"/><path d="M288 66l-20 10 20 6zM312 66l20 10-20 6z" fill="#3b3346"/><text x="316" y="56" fill="#aaa" font-size="14">z z z</text></g>
  </svg><div class="game-bar"><span class="game-msg" aria-live="polite">Crystals, cave paintings… and a sleepy bat. Tap the bat (gently).</span><button class="btn small" type="button" id="batBtn">Wake the bat</button></div>`;
  const wake = () => { const b = $('#bat', body); b.classList.remove('awake'); void b.getBoundingClientRect(); b.classList.add('awake'); $('.game-msg', body).textContent = 'Flap flap flap! The bat did a lap and went back to sleep.'; Sound.play('squeak'); };
  $('#bat', body).addEventListener('click', wake); $('#batBtn', body).addEventListener('click', wake);
  return () => {};
}
$('#footerFire').addEventListener('click', () => openGame('smores', true));

/* ---------------- Static map / fallbacks ---------------- */
function goStatic() {
  campEl.classList.add('static'); campEl.classList.remove('ready'); has3D = false;
  if (typeof Camp !== 'undefined' && Camp.state) Camp.state.dead = true;
  $('#resetBtn').hidden = true;
}
$$('.hotspot').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openBuilding(a.dataset.b, { source: 'static_map' }); }));
$('#simpleBtn').addEventListener('click', () => { goStatic(); track('camp_setting', { setting: 'simple_map', value: true }); });
$('#resetBtn').addEventListener('click', () => { closePanel(); has3D && Camp.resetView(); });

/* ---------------- Camp Map dialog ---------------- */
const campMap = $('#campMap');
$('#campMapList').innerHTML = BUILDINGS.map((b) => `<div class="bld" style="--c:${SECTIONS[b.section].color}"><button type="button" data-b="${b.id}">${b.icon} ${b.name} →</button><div style="font-size:14px">${b.blurb}</div>
  <ul>${[...b.pinned, ...b.latest].map((i) => `<li><a href="${i.u}">${esc(i.t)}</a></li>`).join('')}</ul></div>`).join('');
$('#campMapBtn').addEventListener('click', () => { campMap.showModal(); track('building_open', { building: 'camp_map', source: 'camp_map' }); });
$('#campMapClose').addEventListener('click', () => campMap.close());
$$('#campMapList [data-b]').forEach((b) => b.addEventListener('click', () => { campMap.close(); campEl.scrollIntoView({ behavior: 'smooth' }); openBuilding(b.dataset.b, { source: 'camp_map' }); }));
$$('.campmap-games [data-game]').forEach((b) => b.addEventListener('click', () => { campMap.close(); campEl.scrollIntoView({ behavior: 'smooth' }); openGame(b.dataset.game); }));

/* ---------------- Today at Camp strip ---------------- */
$('#todayGrid').innerHTML = PROMOS.map((p, i) => {
  const sec = SECTIONS[p.sec], b = p.building && BUILDINGS.find((x) => x.id === p.building);
  return `<a class="promo${p.big ? ' big' : ''}" href="${p.u}" style="--c:${sec.color}" data-slot="${p.big ? 'big' : 'sec' + i}" data-building="${p.building || ''}">
    ${p.flag ? `<span class="flag">${p.flag}</span>` : ''}
    <span class="pimg">${p.img ? `<img src="${p.img}" alt="" loading="${p.big ? 'eager' : 'lazy'}" onerror="this.remove()">` : ''}<span aria-hidden="true">${b ? b.icon : '⭐'}</span></span>
    <span class="pbody"><span class="sec-label">${sec.name}</span><h3>${esc(p.t)}</h3>${p.dek ? `<p class="dek">${p.dek}</p>` : ''}
    ${b ? `<span class="in-camp">🏮 Glowing at the ${b.name}</span>` : ''}</span></a>`;
}).join('');
$$('.promo').forEach((a) => {
  const b = a.dataset.building;
  const on = () => b && has3D && Camp.hotMarker(b, true), off = () => b && has3D && Camp.hotMarker(b, false);
  a.addEventListener('mouseenter', on); a.addEventListener('mouseleave', off); a.addEventListener('focus', on); a.addEventListener('blur', off);
  a.addEventListener('click', () => track('hero_click', { slot: a.dataset.slot, url: a.href }));
});

/* ---------------- Zones & shelves ---------------- */
$$('.slot[data-widget]').forEach((s) => mountWidget(s.dataset.widget, s, 'zone'));
$('#shelves').innerHTML = SHELVES.map((s) => `<div class="shelf" style="--c:${SECTIONS[s.sec].color}"><h3>${s.name}</h3><ul>${s.items.map(([t, u]) => `<li><a href="${u}">${esc(t)}</a></li>`).join('')}</ul><a class="more" href="${s.u}">More ${s.name} →</a></div>`).join('') +
  `<div class="ad"><span class="ad-label">Advertisement</span><div class="ad-box ad-300">300×250</div></div>`;

/* ---------------- Header ---------------- */
[['#subHeader', 'header'], ['#subBand', 'promo-band'], ['#subFooter', 'footer'], ['#subCover', 'promo-band']].forEach(([s, c]) => { const a = $(s); a.href = SUBSCRIBE(c); a.addEventListener('click', () => track('subscribe_click', { placement: c })); });
let wiggles = 0; const wig = setInterval(() => { if (document.body.classList.contains('paused') || reduceMotion()) return; const b = $('#subHeader'); b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle'); if (++wiggles >= 3) clearInterval(wig); }, 12000);
$('#searchBtn').addEventListener('click', () => { const p = $('#searchPanel'); p.hidden = !p.hidden; $('#searchBtn').setAttribute('aria-expanded', !p.hidden); if (!p.hidden) $('#q').focus(); });
$('#menuBtn').addEventListener('click', () => { const n = $('.main-nav'); n.classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', n.classList.contains('open')); });
$('#searchPanel').addEventListener('submit', (e) => {
  const q = $('#q').value.trim().toLowerCase(); track('search_submit', {});
  if (q === 'bigfoot') { e.preventDefault(); campEl.scrollIntoView({ behavior: 'smooth' }); if (has3D) Camp.summonBigfoot(); else toast('👣 Bigfoot sightings work best in 3D mode!'); track('egg_found', { egg: 'search-bigfoot', location: 'page' }); }
  else if (q === 'do a barrel roll') { e.preventDefault(); document.body.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: reduceMotion() ? 1 : 1000 }); track('egg_found', { egg: 'search-barrel-roll', location: 'page' }); }
});
const LOGO_COLORS = ['#FFC629', '#E53935', '#F26B21', '#9BE15D', '#3FA9F5', '#1E4FA0', '#7B4BFF', '#1B1B1B', '#FFFFFF', '#FFC629'];
let logoTaps = 0, logoTimer;
$('#logo').addEventListener('click', (e) => {
  e.preventDefault(); // prototype: logo taps play the Color Pop egg instead of navigating
  const l = $('#logo'); logoTaps++; l.style.color = LOGO_COLORS[logoTaps % LOGO_COLORS.length];
  l.classList.remove('pop', 'spin'); void l.offsetWidth; l.classList.add(logoTaps % 10 === 0 ? 'spin' : 'pop'); Sound.play('pop');
  if (logoTaps % 10 === 0) track('egg_found', { egg: 'logo-rainbow-spin', location: 'page' });
  clearTimeout(logoTimer); logoTimer = setTimeout(() => (logoTaps = 0), 4000);
});
$('#videoPoster').addEventListener('click', () => track('video_play', { video: 'channel' }));

/* ---------------- Pause & sound ---------------- */
function setPaused(p) {
  document.body.classList.toggle('paused', p); store.set('paused', p);
  $('#pauseBtn').textContent = p ? '▶' : '⏸'; $('#pauseBtn').setAttribute('aria-pressed', p); $('#pauseBtn').setAttribute('aria-label', p ? 'Play camp animations' : 'Pause camp animations');
  $('#pauseAll').textContent = p ? '▶ Play animations' : '⏸ Pause animations'; $('#pauseAll').setAttribute('aria-pressed', p);
  if (has3D) Camp.setPaused(p);
}
$('#pauseBtn').addEventListener('click', () => { setPaused(!document.body.classList.contains('paused')); track('camp_setting', { setting: 'pause', value: document.body.classList.contains('paused') }); });
$('#pauseAll').addEventListener('click', () => $('#pauseBtn').click());
$('#soundBtn').addEventListener('click', () => Sound.toggle());
Sound.render();


/* ---------------- Walk Mode hooks (v3.0) ---------------- */
let walkReturnFocus = null;
function onWalkChange(on, info) {
  const hud = $('#walkHud');
  if (on) {
    walkReturnFocus = document.activeElement;
    hud.hidden = false; $('#coach').classList.remove('gone');
    $('#coachText').textContent = matchMedia('(pointer:coarse)').matches ? 'Tap the ground to walk. Swipe to look around.' : 'Click the ground to walk. Drag to look around.';
    if (location.hash !== '#camp-walk') history.pushState({ walk: 1 }, '', '#camp-walk');
    setTimeout(() => $('#walkBack').focus({ preventScroll: true }), 80);
    const h = $('#campHint'); h.textContent = 'Walking mode. Press Escape to return to the map.'; h.classList.add('show'); setTimeout(() => h.classList.remove('show'), 2600);
  } else {
    hud.hidden = true; $('#lfCounter').hidden = $('#lfCounter').querySelector('b').textContent === '0';
    if (location.hash === '#camp-walk') history.replaceState({}, '', location.pathname + location.search);
    setTimeout(() => (walkReturnFocus && document.contains(walkReturnFocus) && walkReturnFocus !== document.body ? walkReturnFocus : $('#exploreBtn')).focus({ preventScroll: true }), 1100);
  }
}
const exitWalkFrom = (reason) => { closeOverlay(); closePanel(); Camp.exitWalk(reason); };
$('#walkBack').addEventListener('click', () => exitWalkFrom('button'));
$('#miniMap').addEventListener('click', () => exitWalkFrom('minimap'));
$('#coachDizzy').addEventListener('click', () => exitWalkFrom('dizzy'));
$('#exploreBtn').addEventListener('click', () => has3D && Camp.enterWalkEntrance('explore_button'));
const STAMPS = ['🌲', '⛺', '🔥', '🦉', '🧭', '🐟'];
function openGeocache() {
  openGame('geocache-shell');
  $('#overlayTitle').textContent = '📦 You found the geocache!';
  $('#overlayBody').innerHTML = `<p style="margin:0 0 8px">Inside the ammo can: a toy dinosaur 🦖, a shiny marble 🔮, a trail patch 🏕️… and the logbook.</p>
    <div class="logbook"><h4>Camp Scout Life Geocache · Logbook</h4><ol id="logList">
      <li>🦊 Trail Fox was here! Found it on a rainy day.</li><li>🍳 Camp Cook. Left a marble, took a patch.</li><li>🛶 Captain Canoe. Took the long way around the pond.</li><li>🦉 Night Owl. Found it with a flashlight!</li></ol></div>
    <p style="margin:10px 0 6px;font-weight:700">Sign the logbook with a trail stamp:</p>
    <div class="stamps">${STAMPS.map((s) => `<button type="button" class="stamp-btn" aria-label="Stamp ${s}">${s}</button>`).join('')}</div>
    <p class="proto-note" style="margin:8px 0 0">Nothing you do here is saved or shared. Your stamp only shows during this visit.</p>`;
  $$('.stamp-btn', $('#overlayBody')).forEach((b) => b.addEventListener('click', () => {
    if ($('#logList .mine')) $('#logList .mine').remove();
    const li = document.createElement('li'); li.className = 'mine'; li.textContent = `${b.textContent} You (this visit). Signed the logbook!`; $('#logList').appendChild(li);
    Sound.play('thunk'); toast('Stamped! Geocachers always sign the log.'); track('minigame_play', { game: 'geocache', state: 'signed' });
  }));
}

/* ---------------- Tier detection & boot ---------------- */
const params = new URLSearchParams(location.search);
function detectTier() {
  const q = params.get('tier'); if (q) return q;
  if (reduceMotion()) return 'static';
  if (navigator.connection && navigator.connection.saveData) return 'static';
  try { const c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'static'; } catch (e) { return 'static'; }
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return 'static';
  const coarse = matchMedia('(pointer:coarse)').matches && innerWidth < 1024;
  if (coarse || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /CrOS/.test(navigator.userAgent)) return 'lite';
  return 'full';
}
const tier = detectTier();
$('#ctlTier').value = params.get('tier') || 'auto';
$('#protoInfo').textContent = 'Running tier: ' + tier;
$('#ctlTier').addEventListener('change', (e) => { const u = new URL(location.href); e.target.value === 'auto' ? u.searchParams.delete('tier') : u.searchParams.set('tier', e.target.value); location.href = u.toString(); });
$('#ctlTime').addEventListener('change', (e) => has3D && Camp.setTime(e.target.value === 'auto' ? autoTimeOfDay() : e.target.value));
$('#ctlWeather').addEventListener('change', (e) => has3D && Camp.setWeather(e.target.value === 'auto' ? 'clear' : e.target.value));
$('#ctlBigfoot').addEventListener('click', () => { if (has3D) { campEl.scrollIntoView({ behavior: 'smooth' }); Camp.summonBigfoot(); } });
const autoTimeOfDay = () => { const h = new Date().getHours(); return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night'; };
campEl.classList.add('t-' + autoTimeOfDay());

function boot3D() {
  if (tier === 'static' || !window.THREE) { goStatic(); track('camp_ready', { tier: 'static' }); return; }
  try {
    const r = Camp.init(campEl, { tier, time: params.get('time') || 'auto', weather: params.get('weather') || 'auto', bigfoot: params.has('bigfoot') });
    has3D = true; $('#ctlTime').value = params.get('time') || 'auto'; $('#protoInfo').textContent = `Running tier: ${tier} · ${r.time} · ${r.weather}`;
    if (store.get('paused', false)) setPaused(true);
    requestAnimationFrame(() => requestAnimationFrame(() => campEl.classList.add('ready')));
    const m = location.hash.match(/^#camp-(\w+)/); if (m) setTimeout(() => openBuilding(m[1], { source: 'deep_link' }), 400);
    setTimeout(() => !Camp.isWalking && hint(matchMedia('(pointer:coarse)').matches ? 'Tap a building to go inside, or tap the ground to explore on foot!' : 'Click a building to go inside, or click the ground to explore on foot!'), 1200);
  } catch (err) { console.error(err); goStatic(); }
}
if (store.get('paused', false)) setPaused(true);
// The static map paints first (LCP); 3D loads after the page is interactive.
if (document.readyState === 'complete') setTimeout(boot3D, 50); else window.addEventListener('load', () => (window.requestIdleCallback || setTimeout)(boot3D, { timeout: 600 }));
