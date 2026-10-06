/* ============================================================
   CAMP SCOUT LIFE v4: stylized 3D diorama (vanilla Three.js r149)
   Placeholder voxel art is built in code for the prototype; in
   production these become MagicaVoxel/Blockbench GLB assets
   placed from a layout JSON (§14.1).
   ============================================================ */
const Camp = (() => {
  const T = THREE;
  let renderer, scene, camera, root, stage, labelsEl, tier = 'full';
  let sun, hemi, fireLight, waterMesh, staticMesh;
  const S = { az: Math.PI / 4, tAz: Math.PI / 4, zoom: 1, tZoom: 1, focus: new T.Vector3(0, 0, 1), tFocus: new T.Vector3(0, 0, 1),
    paused: false, visible: true, active: false, dirty: true, time: 'day', weather: 'clear', panelOpen: false };
  const ELEV = 0.62, DIST = 80;
  const clickables = [], anims = [], labels = [], glowMats = [], nightOnly = [], duskNight = [];
  const voxels = [], voxelActions = [];
  const matCache = {};
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); return matCache[k] || (matCache[k] = new T.MeshLambertMaterial({ color: c, ...o })); };
  const BOX = new T.BoxGeometry(1, 1, 1);
  const rng = ((a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(11);

  /* ==========================================================
     v4 STYLIZED WORLD: smooth terrain, rounded props, swaying
     foliage, PBR-ish lighting, sky dome, shaded water.
     All placeholder art is generated in code; production art
     would be authored in Blender and loaded as GLB (§14.1).
     ========================================================== */
  if (T.ColorManagement) T.ColorManagement.legacyMode = false;
  const smatCache = {};
  const smat = (c, o = {}) => { const k = c + JSON.stringify(o); return smatCache[k] || (smatCache[k] = new T.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o })); };
  const gcache = {}; const G = (k, f) => gcache[k] || (gcache[k] = f());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const PLANE = new T.PlaneGeometry(1, 1);
  const SPH = new T.SphereGeometry(1, 16, 12);
  const CAPS = new T.CapsuleGeometry(1, 1, 4, 10);
  const CYL = new T.CylinderGeometry(1, 1, 1, 14);
  function radialTex(inner, outer) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(0.4, inner.replace(/[\d.]+\)$/, (m) => parseFloat(m) * 0.45 + ')')); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); }
  const glowTex = radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const blobTex = radialTex('rgba(0,0,0,0.9)', 'rgba(0,0,0,0)');
  const glowSprites = [];
  function glow(x, y, z, size, color, parent, base = 1, always = false) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: base }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); (parent || scene).add(s); s.userData.base = base; if (!always) glowSprites.push(s); return s;
  }
  const blobMat = () => new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: tier === 'full' ? 0.32 : 0.5 });
  function blob(parent, x, y, z, r) { const m = new T.Mesh(PLANE, blobMat()); m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.set(x, y + 0.03, z); m.renderOrder = 1; parent.add(m); return m; }
  const mtx = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));

  /* --- Merger: batches static geometry into one mesh with per-face click actions --- */
  class Merger {
    constructor() { this.parts = []; this.names = [null]; this.ids = {}; }
    add(geo, m, color, action, colorFn) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m);
      const p = g.attributes.position, n = p.count, ca = new Float32Array(n * 3), c = new T.Color(color), tmp = new T.Color();
      for (let i = 0; i < n; i++) { const cc = colorFn ? colorFn(p.getX(i), p.getY(i), p.getZ(i), tmp.copy(c)) : c; ca[i * 3] = cc.r; ca[i * 3 + 1] = cc.g; ca[i * 3 + 2] = cc.b; }
      let id = 0; if (action) id = this.ids[action] || (this.ids[action] = this.names.push(action) - 1);
      this.parts.push({ pos: p.array, nor: g.attributes.normal.array, col: ca, id });
    }
    build(material) {
      let n = 0; this.parts.forEach((p) => (n += p.pos.length));
      const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n), fa = new Uint16Array(n / 9);
      let o = 0; this.parts.forEach((p) => { pos.set(p.pos, o); nor.set(p.nor, o); col.set(p.col, o); fa.fill(p.id, o / 9, (o + p.pos.length) / 9); o += p.pos.length; });
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeBoundingSphere();
      const m = new T.Mesh(g, material); m.userData.faceActions = fa; m.userData.actionNames = this.names; return m;
    }
  }
  let SM, FM; // static + foliage mergers
  function rboxGeo(w, h, d, r = 0.08) {
    r = Math.max(0.005, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
    return G(`rb${w.toFixed(2)},${h.toFixed(2)},${d.toFixed(2)},${r.toFixed(3)}`, () => {
      const iw = Math.max(0.01, w - 2 * r), id = Math.max(0.01, d - 2 * r), c = Math.max(0.002, Math.min(r, iw / 2 - 0.002, id / 2 - 0.002)), x0 = -iw / 2, z0 = -id / 2, s = new T.Shape();
      s.moveTo(x0 + c, z0); s.lineTo(x0 + iw - c, z0); s.quadraticCurveTo(x0 + iw, z0, x0 + iw, z0 + c); s.lineTo(x0 + iw, z0 + id - c); s.quadraticCurveTo(x0 + iw, z0 + id, x0 + iw - c, z0 + id);
      s.lineTo(x0 + c, z0 + id); s.quadraticCurveTo(x0, z0 + id, x0, z0 + id - c); s.lineTo(x0, z0 + c); s.quadraticCurveTo(x0, z0, x0 + c, z0);
      const depth = Math.max(0.002, h - 2 * r), g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 3 });
      g.rotateX(-Math.PI / 2); g.translate(0, -depth / 2, 0); return g;
    });
  }
  function rb(cx, y, cz, w, h, d, color, action, ry = 0, r = 0.08, M = SM, rx = 0, rz = 0) { M.add(rboxGeo(w, h, d, r), mtx(cx, y + h / 2, cz, rx, ry, rz), color, action); }
  function box(cx, y, cz, sx, sy, sz, c, action, ry) { rb(cx, y, cz, sx, sy, sz, c, action, ry || 0, Math.min(0.1, Math.min(sx, sy, sz) * 0.25)); }
  function cyl(x, y, z, rt, rbot, h, color, action, seg = 12, M = SM) { M.add(G(`cy${rt},${rbot},${seg}`, () => new T.CylinderGeometry(rt, rbot, 1, seg)), mtx(x, y, z, 0, 0, 0, 1, h, 1), color, action); }
  const UP = new T.Vector3(0, 1, 0);
  function cylBetween(a, b, r1, r2, color, action, seg = 10, M = SM) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b), d = B.clone().sub(A), L = d.length();
    const q = new T.Quaternion().setFromUnitVectors(UP, d.normalize()), mid = A.clone().add(B).multiplyScalar(0.5);
    M.add(G(`cb${r1},${r2},${seg}`, () => new T.CylinderGeometry(r2, r1, 1, seg)), new T.Matrix4().compose(mid, q, new T.Vector3(1, L, 1)), color, action);
  }
  function noisyIco(detail, amt, seed, smooth) {
    return G(`ni${detail},${amt},${seed},${smooth}`, () => {
      const g = new T.IcosahedronGeometry(1, detail), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.sin(x * 12.9898 * (seed + 1) + y * 78.233 + z * 37.719) * 43758.5453, n = 1 + (h - Math.floor(h) - 0.5) * amt; p.setXYZ(i, x * n, y * n, z * n); }
      if (!smooth) g.computeVertexNormals(); return g;
    });
  }
  function ball(x, y, z, r, color, action, sx = 1, sy = 1, sz = 1, M = SM, colorFn, geo) { M.add(geo || G('ico1', () => new T.IcosahedronGeometry(1, 2)), mtx(x, y, z, 0, 0, 0, r * sx, r * sy, r * sz), color, action, colorFn); }
  function rock(x, y, z, r, color, action, sy = 0.7) { SM.add(noisyIco(1, 0.35, (Math.abs(x * 7 + z * 13) | 0) % 5, false), mtx(x, y, z, 0, rng() * 6, 0, r, r * sy, r), color, action); }
  function prismGeo(w, h, d) { return G(`pr${w},${h},${d}`, () => { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; }); }
  const shade = (base, h, lo = 0.7, hi = 0.42) => (x, y, z, c) => c.multiplyScalar(lo + hi * clamp((y - base) / h, 0, 1));
  function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; if (rep) { t.wrapS = T.RepeatWrapping; } t.anisotropy = 4; return t; }
  function part(g, sx, sy, sz, x, y, z, c, m) { const me = new T.Mesh(rboxGeo(sx, sy, sz, Math.min(sx, sy, sz) * 0.22), m || smat(c)); me.position.set(x, y, z); me.castShadow = tier === 'full'; g.add(me); return me; }
  function mk(g, geo, c, x, y, z, sx, sy, sz, m) { const me = new T.Mesh(geo, m || smat(c)); me.position.set(x, y, z); me.scale.set(sx, sy ?? sx, sz ?? sx); me.castShadow = tier === 'full'; g.add(me); return me; }
  function clickable(obj, action) { obj.traverse((o) => { o.userData.action = action; }); clickables.push(obj); return obj; }
  const swayU = { value: 0 };
  function swayMat(kind) {
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: kind === 'grass' ? T.DoubleSide : T.FrontSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = swayU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', kind === 'grass'
        ? `#include <begin_vertex>
           #ifdef USE_INSTANCING
             float ph = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.5;
           #else
             float ph = 0.0;
           #endif
           transformed.x += sin(uTime * 2.2 + ph) * 0.12 * position.y; transformed.z += cos(uTime * 1.7 + ph) * 0.08 * position.y;`
        : `#include <begin_vertex>
           float hh = max(0.0, position.y - 1.2); float ph = position.x * 0.35 + position.z * 0.27;
           transformed.x += sin(uTime * 1.5 + ph) * 0.045 * hh; transformed.z += cos(uTime * 1.2 + ph) * 0.03 * hh;`);
    };
    m.customProgramCacheKey = () => 'sway-' + kind; return m;
  }

  /* ---------- terrain data ---------- */
  const N = 18, H = {}, TYPE = {}, used = new Set();
  const key = (x, z) => x + ',' + z;
  const POND = [-9, 8.5], POND_R = 3.4;
  const BLD = { campfire: [0, 0], gametent: [9.5, -6], crafthut: [-9.5, -6], quartermaster: [9.5, 7.5] };
  const FLAT = [[-14, -13, 3.8], [12.5, -12.5, 3.2], [14, 2.5, 2.4]];
  const TRAIL = [[9.5, -10.5, 9.5, -14.5], [9.5, -14.5, 5, -15.5], [5, -15.5, -5.5, -15.5]];
  function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - t * dx, pz - az - t * dz); }
  const spokes = [[0, 6.5, 0, 18], [9.5, -3.2, 6.1, -2.25], [-8.9, -3.8, -6.0, -2.5], [8.7, 10.4, 4.35, 4.85], [-8, 6.6, -5.6, 3.4], [0, -6.5, 0, -8.5]];
  const HS = {}, FM_ = {};
  const hash2 = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
  function vnoise(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v); }
  function bil(map, x, z, def) {
    const fx = x - 0.5, fz = z - 0.5, x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const g = (a, b) => { const v = map[key(clamp(a, -N, N - 1), clamp(b, -N, N - 1))]; return v == null ? def : v; };
    return lerp(lerp(g(x0, z0), g(x0 + 1, z0), tx), lerp(g(x0, z0 + 1), g(x0 + 1, z0 + 1), tx), tz);
  }
  function groundY(x, z) {
    let h = bil(HS, x, z, 0) + (vnoise(x * 0.35, z * 0.35) - 0.5) * 0.45 * bil(FM_, x, z, 1);
    const pd = Math.hypot(x - POND[0], z - POND[1]); if (pd < POND_R + 1.2) h -= 1.15 * (1 - sstep(POND_R - 1.2, POND_R + 1.2, pd));
    return h;
  }
  function buildTerrain() {
    SM = new Merger(); FM = new Merger();
    for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) {
      const px = x + 0.5, pz = z + 0.5, d = Math.hypot(px, pz), edge = Math.max(Math.abs(px), Math.abs(pz));
      let h = 0, t = 'grass';
      const pd = Math.hypot(px - POND[0], pz - POND[1]);
      if (pd < POND_R) { h = -1; t = 'water'; }
      else if (pd < POND_R + 1.3) t = 'sand';
      else if (Math.abs(d - 6.5) < 0.85 || spokes.some((s) => segDist(px, pz, ...s) < 0.75)) t = 'path';
      if (t === 'grass' && TRAIL.some((s) => segDist(px, pz, ...s) < 0.6)) t = 'trail';
      if (t === 'grass' && edge > 14.5 && !(Math.abs(px) < 3 && pz > 0)) h = edge > 16 && rng() > 0.35 ? 2.2 : 1.3;
      if (t === 'grass' && edge > 13.5 && edge <= 14.5 && rng() > 0.7 && !(Math.abs(px) < 3 && pz > 0)) h = 0.8;
      if (FLAT.some(([fx, fz, fr]) => Math.hypot(px - fx, pz - fz) < fr)) h = Math.min(h, 0);
      H[key(x, z)] = h; TYPE[key(x, z)] = t;
      const nearB = Object.values(BLD).some(([bx, bz]) => Math.hypot(px - bx, pz - bz) < 4.6) || FLAT.some(([fx, fz, fr]) => Math.hypot(px - fx, pz - fz) < fr + 0.5);
      FM_[key(x, z)] = nearB || t !== 'grass' ? 0 : 1;
    }
    let A = {}; Object.keys(H).forEach((k) => (A[k] = Math.max(0, H[k])));
    for (let pass = 0; pass < 2; pass++) {
      const B = {}; for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) { let s = 0, n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = A[key(x + a, z + b)]; if (v != null) { s += v; n++; } } B[key(x, z)] = s / n; }
      A = B;
    }
    Object.assign(HS, A);
    const F2 = {}; for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) { let s = 0, n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = FM_[key(x + a, z + b)]; if (v != null) { s += v; n++; } } F2[key(x, z)] = s / n; }
    Object.assign(FM_, F2);
  }
  function reserve(cx, cz, rx, rz) { for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) used.add(key(x, z)); }

  /* ---------- buildings ---------- */
  function campfire() {
    const [x, z] = BLD.campfire, A = 'b:campfire', y = groundY(x, z);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rock(x + Math.cos(a) * 1.45, y + 0.12, z + Math.sin(a) * 1.45, 0.34, i % 2 ? '#A7A39C' : '#8F8B85', A); }
    cyl(x, y + 0.03, z, 1.1, 1.15, 0.06, '#4A3B30', A, 18);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; cylBetween([x + Math.cos(a) * 0.6, y + 0.05, z + Math.sin(a) * 0.6], [x + Math.cos(a) * 0.05, y + 0.9, z + Math.sin(a) * 0.05], 0.09, 0.06, i % 2 ? '#6B3E1B' : '#7A4B22', A, 7); }
    [[3.3, 0, 0, 1], [-3.3, 0, 0, 1], [0, -3.3, 1, 0]].forEach(([dx, dz, ax, az]) => {
      const bx = x + dx, bz = z + dz, by = groundY(bx, bz) + 0.3;
      cylBetween([bx - ax * 1.25, by, bz - az * 1.25], [bx + ax * 1.25, by, bz + az * 1.25], 0.3, 0.3, '#8B5A2B', A, 12);
      [-1, 1].forEach((s) => cylBetween([bx + s * ax * 1.26, by, bz + s * az * 1.26], [bx + s * ax * 1.27, by, bz + s * az * 1.27], 0.29, 0.29, '#D9B07A', A, 12));
    });
    cylBetween([x + 0.9, y + 0.3, z + 2.9], [x + 1.6, y + 0.5, z + 2.0], 0.03, 0.025, '#A0703C', 'smores', 6);
    rb(x + 1.66, y + 0.4, z + 1.92, 0.24, 0.28, 0.24, '#FFFFFF', 'smores', 0.5, 0.1);
    const fire = new T.Group(); fire.position.set(x, y + 0.25, z); scene.add(fire);
    const FLAME = G('flame', () => new T.LatheGeometry([[0, 0], [0.55, 0.08], [0.85, 0.28], [0.7, 0.55], [0.38, 0.8], [0.12, 0.95], [0, 1.05]].map(([a, b]) => new T.Vector2(a, b)), 12));
    const flames = [['#F26B21', 0.42, 0.95], ['#FFB02E', 0.3, 0.75], ['#FFF3B0', 0.16, 0.5]].map(([c, s, h], i) => { const m = mk(fire, FLAME, c, 0, 0, 0, s, h, s, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.93 })); m.castShadow = false; return m; });
    clickable(fire, A);
    const fg = glow(x, y + 0.9, z, 4.5, '#FF8A30', null, 0.65, true);
    fireLight = new T.PointLight('#FF9A3C', 1.2, 14, 1.6); fireLight.position.set(x, y + 1.6, z); scene.add(fireLight);
    const sparks = Array.from({ length: tier === 'full' ? 10 : 5 }, () => { const s = mk(scene, SPH, null, x, 1, z, 0.05, 0.05, 0.05, new T.MeshBasicMaterial({ color: '#FFD27A' })); s.castShadow = false; s.userData.v = rng(); return s; });
    anims.push((dt, t) => {
      flames.forEach((f, i) => { const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + (Math.random() - 0.5) * 0.08; f.scale.y = [0.95, 0.75, 0.5][i] * k; f.scale.x = f.scale.z = [0.42, 0.3, 0.16][i] * (1.05 - (k - 1) * 0.6); f.rotation.y = t * (0.6 + i); f.rotation.z = Math.sin(t * 5 + i) * 0.08; });
      fireLight.intensity = S.fireBase * (0.9 + Math.random() * 0.2); fg.material.opacity = 0.35 + S.fireBase * 0.18 + Math.random() * 0.05;
      sparks.forEach((s) => { s.userData.v += dt * 0.6; if (s.userData.v > 1) { s.userData.v = 0; s.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.8, z + (Math.random() - 0.5) * 0.6); } s.position.y = y + 0.8 + s.userData.v * 3.2; s.position.x += Math.sin(t * 3 + s.id) * 0.004; s.scale.setScalar(0.06 * (1 - s.userData.v) + 0.01); });
    });
    smokeSource(x, y + 1.5, z, 0.6);
    reserve(x, z, 4, 4); blockCircle(x, z, 2.0);
  }
  function gameTent() {
    const [x, z] = BLD.gametent, A = 'b:gametent', y = groundY(x, z), g = new T.Group(); g.position.set(x, y, z); scene.add(g);
    const stripes = canvasTex(512, 64, (c) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#FFF7EA' : '#E8473C'; c.fillRect(i * 32, 0, 32, 64); } c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, 56, 512, 8); }, true);
    const cm = new T.MeshStandardMaterial({ map: stripes, roughness: 0.95, side: T.DoubleSide });
    cyl(x, y + 0.06, z, 3.2, 3.3, 0.14, '#B08A5A', A, 28);
    const wall = new T.Mesh(new T.CylinderGeometry(2.9, 3.0, 1.9, 32, 1, true), cm); wall.position.y = 1.07; g.add(wall);
    const roof = new T.Mesh(new T.ConeGeometry(3.55, 2.7, 32, 1, true), cm); roof.position.y = 2.0 + 1.35; g.add(roof);
    [wall, roof].forEach((m) => { m.castShadow = m.receiveShadow = tier === 'full'; });
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; mk(g, SPH, i % 2 ? '#FFF7EA' : '#E8473C', Math.cos(a) * 3.45, 1.95, Math.sin(a) * 3.45, 0.24, 0.18, 0.24); }
    rb(x, y + 0.13, z + 2.92, 1.3, 1.65, 0.24, '#3A1F4F', A, 0, 0.12);
    [-0.75, 0.75].forEach((s) => cylBetween([x + s, y + 0.13, z + 3.05], [x + s * 0.55, y + 1.8, z + 3.05], 0.05, 0.05, '#FFF7EA', A, 6));
    cylBetween([x, y + 4.5, z], [x, y + 6.0, z], 0.06, 0.05, '#5B3A1E', A, 6); ball(x, y + 6.05, z, 0.12, '#FFC629', A);
    const pen = new T.Mesh(new T.ConeGeometry(0.32, 1.2, 8), smat('#FFC629')); pen.rotation.z = -Math.PI / 2; pen.position.set(0.65, 5.75, 0); g.add(pen);
    anims.push((dt, t) => { pen.rotation.x = Math.sin(t * 4) * 0.4; });
    const lights = []; const cols = ['#FF2E93', '#00E5FF', '#FFE600', '#39FF14'];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, l = mk(g, SPH, null, Math.cos(a) * 3.62, 1.72, Math.sin(a) * 3.62, 0.08, 0.08, 0.08, new T.MeshBasicMaterial({ color: cols[i % 4] })); l.castShadow = false; lights.push(l); if (i % 4 === 0) glow(x + Math.cos(a) * 3.62, y + 1.72, z + Math.sin(a) * 3.62, 0.9, cols[i % 4], null, 0.8); }
    anims.push((dt, t) => lights.forEach((l, i) => (l.visible = ((t * 3 | 0) + i) % 3 !== 0)));
    clickable(g, A);
    reserve(x, z, 3.5, 3.2); blockCircle(x, z, 3.4);
  }
  function craftHut() {
    const [x, z] = BLD.crafthut, A = 'b:crafthut', y = groundY(x, z);
    rb(x, y - 0.25, z, 5.4, 0.55, 4.4, '#9E9A92', A, 0, 0.14);
    for (let r = 0; r < 6; r++) rb(x, y + 0.28 + r * 0.45, z, 5, 0.47, 4, r % 2 ? '#C08A50' : '#B07A42', A, 0, 0.1);
    [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]].forEach(([dx, dz]) => rb(x + dx, y + 0.25, z + dz, 0.3, 2.8, 0.3, '#7A4B22', A, 0, 0.08));
    const top = y + 0.28 + 6 * 0.45, rise = 1.6, half = 2.95, L = Math.hypot(half, rise) + 0.3, th = Math.atan2(rise, half);
    SM.add(prismGeo(5.0, rise - 0.1, 3.96), mtx(x, top, z), '#B07A42', A);
    SM.add(rboxGeo(L, 0.22, 4.9, 0.07), mtx(x - half / 2, top + rise / 2 + 0.05, z, 0, 0, th), '#8A3B2E', A);
    SM.add(rboxGeo(L, 0.22, 4.9, 0.07), mtx(x + half / 2, top + rise / 2 + 0.05, z, 0, 0, -th), '#94443A', A);
    cylBetween([x, top + rise + 0.12, z - 2.5], [x, top + rise + 0.12, z + 2.5], 0.13, 0.13, '#6E2E24', A, 8);
    rb(x + 0.7, y + 0.25, z + 2.0, 1.1, 1.95, 0.14, '#6B3E1B', A, 0, 0.05); ball(x + 1.05, y + 1.2, z + 2.1, 0.07, '#FFC629', A);
    rb(x - 1.3, y + 0.95, z + 2.0, 1.4, 1.1, 0.12, '#5A3A1A', A, 0, 0.04);
    const gm = new T.MeshStandardMaterial({ color: '#FFE9A8', emissive: '#FFB84D', emissiveIntensity: 0, roughness: 0.4 }); glowMats.push(gm);
    const w1 = new T.Mesh(rboxGeo(1.15, 0.85, 0.06, 0.02), gm); w1.position.set(x - 1.3, y + 1.5, z + 2.07); w1.userData.action = A; scene.add(w1); clickables.push(w1);
    glow(x - 1.3, y + 1.5, z + 2.3, 2.6, '#FFC46B', null, 0.8);
    rb(x - 1.3, y + 0.75, z + 2.2, 1.4, 0.25, 0.3, '#7A4B22', A, 0, 0.05);
    [['#E53935', -1.8], ['#FFD54F', -1.45], ['#AB47BC', -1.1], ['#FF8A65', -0.8]].forEach(([c, dx]) => ball(x + dx, y + 1.08, z + 2.2, 0.12, c, A));
    rb(x + 3.2, y + 0.85, z + 2.5, 2, 0.14, 1.1, '#A0703C', A, 0, 0.05);
    [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]].forEach(([dx, dz]) => cyl(x + 3.2 + dx, y + 0.43, z + 2.5 + dz, 0.06, 0.06, 0.85, '#7A4B22', A, 6));
    rb(x + 2.8, y + 0.99, z + 2.5, 0.45, 0.5, 0.45, '#E53935', A, 0, 0.06);
    SM.add(prismGeo(0.65, 0.32, 0.6), mtx(x + 2.8, y + 1.49, z + 2.5, 0, Math.PI / 2, 0), '#6B3E1B', A);
    ball(x + 2.8, y + 1.25, z + 2.73, 0.06, '#222', A);
    rb(x + 3.7, y + 0.99, z + 2.4, 0.5, 0.06, 0.18, '#B0BEC5', A, 0.3, 0.02);
    reserve(x, z, 4.5, 3.2); blockRect(x, z, 2.6, 2.1); blockRect(x + 3.2, z + 2.5, 1, 0.6);
  }
  function quartermaster() {
    const [x, z] = BLD.quartermaster, A = 'b:quartermaster', y = groundY(x, z);
    rb(x, y - 0.25, z, 6.6, 0.55, 4.9, '#9E9A92', A, 0, 0.14);
    rb(x, y + 0.2, z, 5.7, 3.1, 4.1, '#6B3E1B', A, 0, 0.05);
    for (let r = 0; r < 6; r++) {
      const yy = y + 0.5 + r * 0.5, c = r % 2 ? '#7A4B22' : '#8A5A2E';
      [-2.2, 2.2].forEach((dz) => cylBetween([x - 3.35, yy, z + dz], [x + 3.35, yy, z + dz], 0.26, 0.26, c, A, 10));
      [-3.0, 3.0].forEach((dx) => cylBetween([x + dx, yy + 0.25, z - 2.55], [x + dx, yy + 0.25, z + 2.55], 0.26, 0.26, r % 2 ? '#8A5A2E' : '#7A4B22', A, 10));
    }
    const top = y + 3.4, rise = 1.7, half = 2.9, L = Math.hypot(half, rise) + 0.35, th = Math.atan2(rise, half);
    SM.add(prismGeo(5.0, rise - 0.1, 6.0), mtx(x, top, z, 0, Math.PI / 2, 0), '#7A4B22', A);
    SM.add(rboxGeo(7.4, 0.24, L, 0.08), mtx(x, top + rise / 2 + 0.05, z + half / 2, th, 0, 0), '#2E7D32', A);
    SM.add(rboxGeo(7.4, 0.24, L, 0.08), mtx(x, top + rise / 2 + 0.05, z - half / 2, -th, 0, 0), '#2A7330', A);
    cylBetween([x - 3.7, top + rise + 0.12, z], [x + 3.7, top + rise + 0.12, z], 0.14, 0.14, '#1F5C3A', A, 8);
    for (let k = 0; k < 5; k++) rb(x + 1.8, top - 0.6 + k * 0.62, z - 0.8, 0.95 - (k % 2) * 0.08, 0.6, 0.95 - (k % 2) * 0.08, k % 2 ? '#8F8B85' : '#A7A39C', A, k * 0.2, 0.1);
    smokeSource(x + 1.8, top + 2.6, z - 0.8, 0.45);
    rb(x - 0.8, y + 0.25, z + 2.42, 1.2, 2.1, 0.16, '#4E2F12', A, 0, 0.05); ball(x - 0.38, y + 1.25, z + 2.55, 0.07, '#FFC629', A);
    const gm = new T.MeshStandardMaterial({ color: '#FFE9A8', emissive: '#FFB84D', emissiveIntensity: 0, roughness: 0.4 }); glowMats.push(gm);
    [[1.4, 2.5]].forEach(([dx, dz]) => { rb(x + dx, y + 1.0, z + dz - 0.02, 1.3, 1.0, 0.12, '#4E2F12', A, 0, 0.04); const w = new T.Mesh(rboxGeo(1.05, 0.75, 0.06, 0.02), gm); w.position.set(x + dx, y + 1.5, z + dz + 0.05); w.userData.action = A; scene.add(w); clickables.push(w); glow(x + dx, y + 1.5, z + dz + 0.3, 2.4, '#FFC46B', null, 0.8); });
    rb(x + 0.4, y + 0.02, z + 3.25, 6.2, 0.2, 1.6, '#B08A5A', A, 0, 0.05);
    [-2.6, 3.2].forEach((dx) => cyl(x + dx, y + 1.5, z + 3.9, 0.11, 0.11, 2.9, '#7A4B22', A, 8));
    rb(x + 1.6, y + 0.22, z + 3.35, 1.4, 0.65, 0.6, '#8B5A2B', A, 0, 0.05);
    [['#E53935', 1.2], ['#3FA9F5', 1.6], ['#FFC629', 2.0]].forEach(([c, dx]) => rb(x + dx, y + 0.87, z + 3.35, 0.32, 0.32, 0.32, c, A, 0.3, 0.06));
    cylBetween([x + 2.75, y + 0.2, z + 3.0], [x + 2.9, y + 2.5, z + 2.6], 0.05, 0.05, '#C08A52', A, 6); SM.add(rboxGeo(0.34, 0.8, 0.08, 0.04), mtx(x + 2.77, y + 0.6, z + 2.98, 0, 0, -0.06), '#C08A52', A);
    const lm = new T.MeshStandardMaterial({ color: '#FFE08A', emissive: '#FFB84D', emissiveIntensity: 0, roughness: 0.4 }); glowMats.push(lm);
    const lan = new T.Mesh(rboxGeo(0.32, 0.42, 0.32, 0.08), lm); lan.position.set(x - 1.75, y + 2.0, z + 2.6); lan.userData.action = A; scene.add(lan); clickables.push(lan);
    glow(x - 1.75, y + 2.0, z + 2.7, 2.2, '#FFC46B', null, 0.9);
    reserve(x, z, 4, 3.6); blockRect(x, z, 3.4, 2.6);
  }
  function scenery() {
    // Flagpole
    const fx = 0, fz = -9.5, fy = groundY(fx, fz);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; rock(fx + Math.cos(a) * 0.55, fy + 0.1, fz + Math.sin(a) * 0.55, 0.22, '#A7A39C'); }
    cylBetween([fx, fy, fz], [fx, fy + 7.2, fz], 0.08, 0.06, '#EEEEEE', null, 8); ball(fx, fy + 7.25, fz, 0.13, '#FFC629');
    const fl = canvasTex(256, 150, (c) => { c.fillStyle = '#1F5C3A'; c.fillRect(0, 0, 256, 150); c.fillStyle = '#FFC629'; c.fillRect(0, 104, 256, 18); c.font = 'bold 66px Georgia'; c.fillText('SL', 82, 84); });
    const fgeo = new T.PlaneGeometry(2.4, 1.4, 12, 5); fgeo.translate(1.2, 0, 0);
    const flag = new T.Mesh(fgeo, new T.MeshStandardMaterial({ map: fl, side: T.DoubleSide, roughness: 0.9 })); flag.position.set(fx + 0.08, fy + 6.5, fz); flag.castShadow = tier === 'full'; scene.add(flag);
    const base = fgeo.attributes.position.array.slice();
    anims.push((dt, t) => { const p = fgeo.attributes.position; for (let i = 0; i < p.count; i++) { const bx = base[i * 3]; p.setZ(i, Math.sin(bx * 2.2 - t * 5) * 0.18 * bx / 2.4); } p.needsUpdate = true; fgeo.computeVertexNormals(); });
    reserve(fx, fz, 1, 1); blockRect(fx, fz, 0.6, 0.6);
    // Entrance arch with sign
    const ey = groundY(0, 15.5);
    [-2.2, 2.2].forEach((dx) => { cyl(dx, ey + 1.9, 15.5, 0.24, 0.28, 3.8, '#6B3E1B', null, 10); rock(dx, ey + 0.1, 15.5, 0.45, '#8F8B85'); });
    cylBetween([-2.9, ey + 3.55, 15.5], [2.9, ey + 3.55, 15.5], 0.22, 0.22, '#7A4B22', null, 10);
    rb(0, ey + 2.35, 15.5, 3.6, 0.85, 0.16, '#8B5A2B', null, 0, 0.06);
    [-1.4, 1.4].forEach((dx) => cylBetween([dx, ey + 3.2, 15.5], [dx, ey + 3.35, 15.5], 0.02, 0.02, '#C08A52', null, 4));
    const signTex = canvasTex(512, 120, (c) => { c.fillStyle = '#8B5A2B'; c.fillRect(0, 0, 512, 120); c.fillStyle = '#FFF4DC'; c.font = 'bold 58px Georgia'; c.textAlign = 'center'; c.fillText('CAMP SCOUT LIFE', 256, 80); });
    [1, -1].forEach((s) => { const sp = new T.Mesh(new T.PlaneGeometry(3.4, 0.78), new T.MeshStandardMaterial({ map: signTex, roughness: 0.9 })); sp.position.set(0, ey + 2.775, 15.5 + s * 0.085); if (s < 0) sp.rotation.y = Math.PI; scene.add(sp); });
    reserve(0, 15.5, 3, 1); blockRect(-2.2, 15.5, 0.3, 0.3); blockRect(2.2, 15.5, 0.3, 0.3);
    // Archery range
    const ax = 12.5, az = -12.5, ay = groundY(ax, az);
    [-1.4, 1.4].forEach((dx) => rb(ax + dx, ay, az, 1.4, 0.8, 0.9, '#E2C35A', 'archery', 0, 0.18));
    const tt = canvasTex(256, 256, (c) => { [['#FFFFFF', 128], ['#222222', 104], ['#3FA9F5', 80], ['#E53935', 56], ['#FFC629', 30]].forEach(([col, r]) => { c.fillStyle = col; c.beginPath(); c.arc(128, 128, r, 0, 7); c.fill(); }); });
    const tgt = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshStandardMaterial({ map: tt, roughness: 0.9 })); tgt.position.set(ax, ay + 1.85, az + 0.2); tgt.userData.action = 'archery'; scene.add(tgt); clickables.push(tgt);
    SM.add(G('cyrim', () => new T.CylinderGeometry(1.05, 1.05, 0.2, 28)), mtx(ax, ay + 1.85, az + 0.08, Math.PI / 2, 0, 0), '#D9C49A', 'archery');
    cylBetween([ax - 0.6, ay, az - 0.4], [ax - 0.2, ay + 1.9, az], 0.05, 0.05, '#6B3E1B', 'archery', 6); cylBetween([ax + 0.6, ay, az - 0.4], [ax + 0.2, ay + 1.9, az], 0.05, 0.05, '#6B3E1B', 'archery', 6);
    reserve(ax, az, 2.5, 1.5); blockRect(ax, az, 2.2, 0.6);
    // Hidden cave: rocky mound with a dark mouth facing +x
    const cx = -14, cz = -13, cy = groundY(cx, cz);
    [[0, 0, 2.5, 1.0], [-1.2, 0.9, 1.9, 0.8], [1.0, -1.1, 1.8, 0.8], [-1.0, -1.2, 1.7, 0.85], [1.1, 1.3, 1.6, 0.8], [0, 0, 1.4, 1.3], [-1.6, 0, 1.5, 0.9]].forEach(([dx, dz, r, sy], i) => rock(cx + dx, cy + 0.3 + (i === 5 ? 1.6 : 0), cz + dz, r, ['#8F8B85', '#9C978F', '#7F7A74'][i % 3], 'cave', sy));
    const mouth = mk(scene, SPH, null, cx + 2.15, cy + 0.75, cz, 0.35, 0.85, 0.62, new T.MeshBasicMaterial({ color: '#120F17' })); mouth.userData.action = 'cave'; clickables.push(mouth); mouth.castShadow = false;
    const cm = new T.MeshBasicMaterial({ color: '#B388FF' }); const crystal = mk(scene, G('oct', () => new T.OctahedronGeometry(1, 0)), null, cx + 2.35, cy + 0.35, cz - 0.3, 0.14, 0.3, 0.14, cm); crystal.userData.action = 'cave'; clickables.push(crystal);
    glow(cx + 2.4, cy + 0.4, cz - 0.3, 1.4, '#B388FF', null, 0.7, true);
    anims.push((dt, t) => cm.color.setHSL(0.75 + Math.sin(t * 2) * 0.05, 0.9, 0.7 + Math.sin(t * 3) * 0.1));
    reserve(cx, cz, 3, 3); blockRect(cx, cz, 2.5, 2.5);
    // Trash can (raccoon spot)
    const ty = groundY(4.2, 3.3);
    cyl(4.2, ty + 0.48, 3.3, 0.38, 0.34, 0.96, '#6B7780', 'raccoon', 16); [0.25, 0.7].forEach((h) => cyl(4.2, ty + h, 3.3, 0.4, 0.4, 0.05, '#55606A', 'raccoon', 16));
    reserve(4.2, 3.3, 1, 1); blockRect(4.2, 3.3, 0.4, 0.4); reserve(14, 2.5, 2.2, 2.2);
    // Pond extras: lily pads, canoe, scattered rocks
    [[-9.8, 7.6], [-8.2, 9.6], [-10.6, 9.4], [-7.6, 7.4]].forEach(([lx, lz], i) => { cyl(lx, -0.27, lz, 0.38, 0.38, 0.03, '#4C9A3A', null, 12); if (i === 1) ball(lx + 0.1, -0.2, lz, 0.1, '#F8BBD0'); });
    const cny = groundY(-9.8, 12.6);
    SM.add(G('canoe', () => new T.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), mtx(-9.8, cny + 0.32, 12.6, 0, 0.2, 0, 1.5, 0.35, 0.42), '#C0392B');
    [[6.5, 13], [-13, 3], [13, -3], [-4, -12], [3, 12.5], [-12.8, 12.8]].forEach(([rx, rz], i) => rock(rx, groundY(rx, rz) + 0.05, rz, 0.35 + (i % 3) * 0.15, '#A7A39C'));
  }

  /* ---------- trees, grass, flowers ---------- */
  const treeSpots = [];
  function trees() {
    const dens = tier === 'full' ? 1 : 0.55;
    for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) {
      const k = key(x, z); if (TYPE[k] !== 'grass' || used.has(k)) continue;
      const px = x + 0.5, pz = z + 0.5, edge = Math.max(Math.abs(px), Math.abs(pz));
      const front = px + pz > 6 && edge < 14;
      const p = (edge > 12.5 ? (front ? 0.18 : 0.33) : edge > 9.5 ? (front ? 0.01 : 0.05) : 0.01) * dens;
      if (rng() > p) continue;
      let near = false; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (used.has('t' + key(x + a, z + b))) near = true;
      if (near) continue;
      used.add('t' + k); const pine = rng() > 0.45, s = 0.85 + rng() * 0.35, jx = px + (rng() - 0.5) * 0.4, jz = pz + (rng() - 0.5) * 0.4, y = groundY(jx, jz);
      treeSpots.push([jx, jz, y, pine, s]); tree(jx, y, jz, pine, s);
    }
  }
  function tree(x, y, z, pine, s) {
    if (pine) {
      blockRect(x, z, 1.2, 1.2);
      cyl(x, y + 0.8 * s, z, 0.13 * s, 0.24 * s, 1.6 * s, '#6B4423', null, 7);
      const g = ['#2E6B3A', '#357A42', '#2A6236'][rng() * 3 | 0];
      [[1.6, 1.9, 1.2], [1.25, 1.7, 2.2], [0.85, 1.5, 3.1], [0.45, 1.0, 3.9]].forEach(([r, h, yy]) => FM.add(G('cone9', () => new T.ConeGeometry(1, 1, 9, 1)), mtx(x, y + yy * s + h * s / 2 - 0.3 * s, z, 0, rng() * 3, 0, r * s, h * s, r * s), g, null, shade(y + yy * s - 0.3 * s, h * s, 0.62, 0.5)));
    } else {
      BLOCK.add(key(Math.floor(x), Math.floor(z)));
      cyl(x, y + 1.0 * s, z, 0.16 * s, 0.26 * s, 2.0 * s, '#7A5230', null, 8);
      cylBetween([x, y + 1.4 * s, z], [x + 0.6 * s, y + 2.2 * s, z + 0.3 * s], 0.08 * s, 0.05 * s, '#7A5230', null, 6);
      const g = ['#4E9F3D', '#5AAE45', '#46953A'][rng() * 3 | 0], sh = shade(y + 1.3 * s, 2.8 * s, 0.6, 0.55);
      ball(x, y + 2.7 * s, z, 1.35 * s, g, null, 1, 0.9, 1, FM, sh, noisyIco(2, 0.18, 1, true));
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + rng(); ball(x + Math.cos(a) * 0.85 * s, y + (2.2 + rng() * 0.9) * s, z + Math.sin(a) * 0.85 * s, (0.75 + rng() * 0.3) * s, g, null, 1, 0.9, 1, FM, sh, noisyIco(2, 0.2, i + 2, true)); }
    }
  }
  function groundCover() {
    // grass tufts (instanced, wind sway) + flowers
    const pos = [], col = [], nor = [], base = new T.Color('#62B046'), tip = new T.Color('#BFE584');
    for (let b = 0; b < 4; b++) { const a = b * 1.6, lean = 0.08, h = 0.35 + (b % 2) * 0.12, ca = Math.cos(a), sa = Math.sin(a), w = 0.05;
      [[-w, 0, 0], [w, 0, 0], [lean, h, 0]].forEach(([px, py, pz]) => { pos.push(px * ca, py, -px * sa); });
      col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b); for (let k = 0; k < 3; k++) nor.push(0, 1, 0); }
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new T.Float32BufferAttribute(col, 3)); bg.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    const n = tier === 'full' ? 2200 : 800, im = new T.InstancedMesh(bg, swayMat('grass'), n), m4 = new T.Matrix4(); let c = 0, tries = 0;
    while (c < n && tries++ < n * 6) {
      const x = rng() * 35 - 17.5, z = rng() * 35 - 17.5, k = key(Math.floor(x), Math.floor(z));
      if (TYPE[k] !== 'grass' || (BLOCK.has(k) && rng() > 0.25)) continue;
      const s = 0.55 + rng() * 0.6; im.setMatrixAt(c++, m4.compose(new T.Vector3(x, groundY(x, z), z), new T.Quaternion().setFromEuler(new T.Euler(0, rng() * 6.3, 0)), new T.Vector3(s, s, s)));
    }
    im.count = c; scene.add(im); im.receiveShadow = tier === 'full';
    const fl = new T.InstancedMesh(G('flower', () => new T.CylinderGeometry(1, 0.6, 1, 5)), new T.MeshStandardMaterial({ roughness: 0.7, emissive: '#222222' }), tier === 'full' ? 260 : 90), fc = ['#FFD54F', '#FFFFFF', '#F48FB1', '#CE93D8', '#FF8A65'].map((h) => new T.Color(h)); c = 0; tries = 0;
    while (c < fl.count && tries++ < 4000) {
      const x = rng() * 34 - 17, z = rng() * 34 - 17, k = key(Math.floor(x), Math.floor(z)); if (TYPE[k] !== 'grass' || BLOCK.has(k)) continue;
      fl.setMatrixAt(c, m4.compose(new T.Vector3(x, groundY(x, z) + 0.1, z), new T.Quaternion().setFromEuler(new T.Euler(0, rng() * 6, 0)), new T.Vector3(0.11, 0.035, 0.11))); fl.setColorAt(c++, fc[c % fc.length]);
    }
    fl.count = c; scene.add(fl);
    // tree contact shadows
    const bl = new T.InstancedMesh(PLANE, blobMat(), treeSpots.length);
    treeSpots.forEach(([x, z, y, pine, s], i) => bl.setMatrixAt(i, m4.compose(new T.Vector3(x, y + 0.04, z), new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0)), new T.Vector3(3.2 * s, 3.2 * s, 1))));
    bl.renderOrder = 1; scene.add(bl);
    Object.entries(BLD).forEach(([id, [x, z]]) => blob(scene, x, groundY(x, z), z, id === 'campfire' ? 2.2 : 4.4));
  }
  function terrainMesh() {
    const seg = tier === 'full' ? 144 : 96, g = new T.PlaneGeometry(2 * N, 2 * N, seg, seg); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new T.Color(), tmp = new T.Color();
    const C = { g1: new T.Color('#6FBF4A'), g2: new T.Color('#93CF5A'), hill: new T.Color('#5A9E40'), path: new T.Color('#D9B57C'), sand: new T.Color('#EED9A0'), trail: new T.Color('#B49B6A'), deep: new T.Color('#3F7F72') };
    const ind = (t) => { const m = {}; Object.keys(TYPE).forEach((k) => (m[k] = TYPE[k] === t ? 1 : 0)); return m; };
    const IP = ind('path'), IS = ind('sand'), IW = ind('water'), IT = ind('trail'), AO = {};
    treeSpots.forEach(([x, z, , , s]) => { for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const X = Math.floor(x) + a, Z = Math.floor(z) + b, d = Math.hypot(X + 0.5 - x, Z + 0.5 - z); AO[key(X, Z)] = Math.max(AO[key(X, Z)] || 0, clamp(1 - d / (2.2 * s), 0, 1)); } });
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = groundY(x, z); p.setY(i, y);
      c.copy(C.g1).lerp(C.g2, vnoise(x * 0.5, z * 0.5) * 0.8).lerp(C.hill, clamp(y * 0.35, 0, 0.6));
      c.lerp(tmp.copy(C.path).multiplyScalar(0.93 + 0.14 * vnoise(x * 2.3, z * 2.3)), sstep(0.3, 0.7, bil(IP, x, z, 0)));
      c.lerp(C.trail, sstep(0.3, 0.75, bil(IT, x, z, 0)) * 0.85);
      c.lerp(C.sand, sstep(0.2, 0.65, bil(IS, x, z, 0) + bil(IW, x, z, 0)));
      if (y < -0.3) c.lerp(C.deep, clamp((-0.3 - y) / 0.7, 0, 1));
      c.multiplyScalar(1 - 0.28 * bil(AO, x, z, 0));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); m.receiveShadow = tier === 'full'; m.userData.ground = true; scene.add(m); clickables.push(m);
    // Diorama skirt: grass lip, soil layers, rock base
    const pos = [], cols = [], nors = [], idx = [], rows = [[0, '#5FA843'], [-0.22, '#5FA843'], [-0.32, '#A0703C'], [-1.6, '#7A5230'], [-3.4, '#5E5650']];
    const edges = [[(t) => [-N + t * 2 * N, N], [0, 0, 1]], [(t) => [N, N - t * 2 * N], [1, 0, 0]], [(t) => [N - t * 2 * N, -N], [0, 0, -1]], [(t) => [-N, -N + t * 2 * N], [-1, 0, 0]]];
    const SEG = 72; edges.forEach(([f, n]) => {
      const start = pos.length / 3;
      for (let i = 0; i <= SEG; i++) { const [x, z] = f(i / SEG), top = groundY(x, z); rows.forEach(([dy, hex], r) => { const yy = r < 3 ? top + dy : dy; pos.push(x, Math.min(yy, top), z); const cc = new T.Color(hex).multiplyScalar(0.9 + 0.1 * vnoise(x, yy * 3)); cols.push(cc.r, cc.g, cc.b); nors.push(...n); }); }
      for (let i = 0; i < SEG; i++) for (let r = 0; r < rows.length - 1; r++) { const a = start + i * rows.length + r, b = a + rows.length; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    });
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); sg.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); sg.setAttribute('normal', new T.Float32BufferAttribute(nors, 3)); sg.setIndex(idx);
    scene.add(new T.Mesh(sg, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide })));
  }

  /* ---------- water (shader) ---------- */
  function water() {
    const wm = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uDeep: { value: new T.Color('#1C78B0') }, uShallow: { value: new T.Color('#86DAE6') }, uR: { value: POND_R + 0.75 }, uSky: { value: new T.Color('#FFFFFF') } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; uniform vec3 uDeep, uShallow, uSky; uniform float uR; varying vec2 vP;
        void main(){ float d = length(vP) / uR; vec3 c = mix(uDeep, uShallow, smoothstep(0.25, 1.0, d));
          float w = sin(vP.x * 3.1 + uTime * 1.3) * sin(vP.y * 2.7 - uTime * 1.1) + 0.5 * sin((vP.x + vP.y) * 5.0 + uTime * 2.0);
          c += uSky * 0.16 * smoothstep(0.9, 1.4, w);
          float foam = smoothstep(0.84, 0.97, d) * (0.55 + 0.45 * sin(d * 46.0 - uTime * 2.2));
          c = mix(c, vec3(1.0), foam * 0.55);
          float a = mix(0.82, 0.95, d) * (1.0 - smoothstep(0.985, 1.0, d));
          gl_FragColor = vec4(c, a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
    });
    waterMesh = new T.Mesh(new T.CircleGeometry(POND_R + 0.75, 56), wm); waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(POND[0], -0.3, POND[1]); waterMesh.renderOrder = 2; scene.add(waterMesh);
    anims.push((dt, t) => { wm.uniforms.uTime.value = t; });
  }

  /* ---------- static batch build ---------- */
  function bakeVoxels() {
    terrainMesh(); groundCover();
    staticMesh = SM.build(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    staticMesh.castShadow = staticMesh.receiveShadow = tier === 'full'; scene.add(staticMesh); clickables.push(staticMesh);
    const fol = FM.build(swayMat('foliage')); fol.castShadow = tier === 'full'; fol.receiveShadow = tier === 'full'; scene.add(fol);
    anims.push((dt, t) => { swayU.value = t; });
  }

  /* ---------- smoke ---------- */
  const smokes = [];
  function smokeSource(x, y, z, rate) { smokes.push({ x, y, z, rate, acc: 0, pool: [] }); }
  function initSmoke() {
    smokes.forEach((s) => {
      for (let i = 0; i < (tier === 'full' ? 8 : 4); i++) { const m = mk(scene, SPH, null, s.x, -10, s.z, 0.3, 0.3, 0.3, new T.MeshStandardMaterial({ color: '#E6E6E6', transparent: true, opacity: 0, roughness: 1, depthWrite: false })); m.castShadow = false; m.userData.life = 1; s.pool.push(m); }
      anims.push((dt) => {
        s.acc += dt; if (s.acc > s.rate) { s.acc = 0; const p = s.pool.find((q) => q.userData.life >= 1); if (p) { p.userData.life = 0; p.position.set(s.x, s.y, s.z); } }
        s.pool.forEach((p) => { if (p.userData.life >= 1) return; p.userData.life += dt / 3.2; p.position.y += dt * 1.0; p.position.x -= dt * 0.35; p.scale.setScalar(0.22 + p.userData.life * 0.6); p.material.opacity = 0.55 * (1 - p.userData.life); });
      });
    });
  }

  /* ---------- people & critters (rounded, simple faces) ---------- */
  const skin = ['#F1C27D', '#C68642', '#8D5524', '#FFDBAC', '#E0AC69'];
  function scout(shirt, cap) {
    const g = new T.Group(), sk = skin[rng() * skin.length | 0];
    const l1 = new T.Group(), l2 = new T.Group(), a1 = new T.Group(), a2 = new T.Group();
    [[l1, -0.1], [l2, 0.1]].forEach(([p, x]) => { p.position.set(x, 0.46, 0); g.add(p); mk(p, CAPS, '#3B5A3B', 0, -0.2, 0, 0.085, 0.13, 0.085); mk(p, SPH, '#3E2A1A', 0, -0.42, 0.04, 0.09, 0.06, 0.12); });
    mk(g, CAPS, shirt, 0, 0.74, 0, 0.2, 0.11, 0.16);
    const nk = mk(g, G('cone3', () => new T.ConeGeometry(1, 1, 3)), '#C62828', 0, 0.86, 0.15, 0.11, 0.16, 0.04); nk.rotation.x = Math.PI;
    [[a1, -0.25], [a2, 0.25]].forEach(([p, x]) => { p.position.set(x, 0.9, 0); g.add(p); mk(p, CAPS, shirt, 0, -0.15, 0, 0.065, 0.09, 0.065); mk(p, SPH, sk, 0, -0.33, 0, 0.065); });
    mk(g, SPH, sk, 0, 1.15, 0, 0.21);
    [-0.07, 0.07].forEach((x) => mk(g, SPH, '#1B1B1B', x, 1.18, 0.185, 0.028, 0.034, 0.02));
    mk(g, SPH, '#E57373', 0, 1.09, 0.19, 0.03, 0.015, 0.015);
    mk(g, CYL, cap, 0, 1.32, 0, 0.28, 0.03, 0.28); mk(g, CYL, cap, 0, 1.4, 0, 0.17, 0.14, 0.17);
    blob(g, 0, 0, 0, 0.4);
    g.userData = { l1, l2, a1, a2 }; scene.add(g); return g;
  }
  function people() {
    const n = tier === 'full' ? 4 : 2, shirts = ['#C9A36B', '#1E4FA0', '#C9A36B', '#1E4FA0'], caps = ['#1F5C3A', '#FFC629', '#C62828', '#1E4FA0'];
    for (let i = 0; i < n; i++) {
      const g = scout(shirts[i], caps[i]); const off = i / n * Math.PI * 2, sp = (0.12 + i * 0.02) * (i % 2 ? 1 : -1);
      anims.push((dt, t) => { const a = off + t * sp, x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5; g.position.set(x, groundY(x, z), z); g.rotation.y = -a + (sp > 0 ? 0 : Math.PI); const s = Math.sin(t * 8 + i); g.userData.l1.rotation.x = s * 0.5; g.userData.l2.rotation.x = -s * 0.5; g.userData.a1.rotation.x = -s * 0.4; g.userData.a2.rotation.x = s * 0.4; });
    }
    [[3.3, 0, -Math.PI / 2], [-3.3, 0.5, Math.PI / 2], [0.4, -3.3, 0]].slice(0, tier === 'full' ? 3 : 2).forEach(([x, z, r], i) => {
      const g = scout(shirts[i + 1], caps[i + 1]), gy = groundY(x, z); g.position.set(x, gy + 0.12, z); g.rotation.y = r; g.userData.l1.rotation.x = g.userData.l2.rotation.x = -1.45;
      g.children.filter((c) => c.geometry === PLANE).forEach((b) => (b.position.y = -0.1));
      anims.push((dt, t) => { g.userData.a1.rotation.x = -0.7 + Math.sin(t * 2 + i) * 0.15; g.position.y = gy + 0.12 + Math.abs(Math.sin(t * 3 + i * 2)) * 0.02; });
    });
  }
  let raccoon, lid, lidClosed = false, fish, bigfoot, squirrel, owl;
  function critters() {
    const ty = groundY(4.2, 3.3);
    raccoon = new T.Group(); mk(raccoon, SPH, '#8A8A8A', 0, 0.22, 0, 0.26, 0.22, 0.36); mk(raccoon, SPH, '#9A9A9A', 0, 0.42, 0.38, 0.2, 0.18, 0.19);
    mk(raccoon, SPH, '#262626', 0, 0.45, 0.5, 0.17, 0.06, 0.08); mk(raccoon, SPH, '#F5F5F5', 0, 0.37, 0.55, 0.08, 0.05, 0.06); mk(raccoon, SPH, '#111', 0, 0.38, 0.6, 0.035);
    [-0.12, 0.12].forEach((x) => { const e = mk(raccoon, G('cone6', () => new T.ConeGeometry(1, 1, 6)), '#5E5E5E', x, 0.62, 0.36, 0.06, 0.1, 0.05); });
    [0, 1, 2, 3].forEach((i) => mk(raccoon, SPH, i % 2 ? '#333' : '#A5A5A5', 0, 0.3 + i * 0.03, -0.42 - i * 0.14, 0.1, 0.1, 0.1));
    raccoon.position.set(4.2, ty + 0.85, 3.3); raccoon.rotation.x = -0.9; scene.add(raccoon); clickable(raccoon, 'raccoon');
    raccoon.userData = { mode: 'rummage', t: 0, y0: ty };
    lid = new T.Mesh(G('cyl16', () => new T.CylinderGeometry(1, 1, 1, 16)), smat('#7B8790', { metalness: 0.3, roughness: 0.5 })); lid.scale.set(0.43, 0.07, 0.43); lid.position.set(4.65, ty + 1.03, 3.3); lid.rotation.z = 0.9; lid.castShadow = tier === 'full'; scene.add(lid); clickable(lid, 'lid');
    anims.push((dt, t) => {
      const r = raccoon.userData; r.t += dt;
      if (r.mode === 'rummage') { raccoon.position.y = ty + 0.85 + Math.abs(Math.sin(t * 5)) * 0.12; raccoon.rotation.z = Math.sin(t * 7) * 0.15; }
      else if (r.mode === 'freeze') { if (r.t > 1) { r.mode = 'run'; r.t = 0; raccoon.rotation.set(0, Math.PI * 0.85, 0); } }
      else if (r.mode === 'run') { raccoon.position.x -= dt * 4; raccoon.position.z -= dt * 6; raccoon.position.y = groundY(raccoon.position.x, raccoon.position.z) + Math.abs(Math.sin(r.t * 14)) * 0.15; if (r.t > 2.5) { r.mode = 'gone'; r.t = 0; raccoon.visible = false; } }
      else if (r.mode === 'gone' && r.t > 18 && !lidClosed) { r.mode = 'rummage'; raccoon.visible = true; raccoon.position.set(4.2, ty + 0.85, 3.3); raccoon.rotation.set(-0.9, 0, 0); }
    });
    fish = new T.Group(); mk(fish, SPH, '#F26B21', 0, 0, 0, 0.12, 0.16, 0.3); const tail = mk(fish, G('cone4', () => new T.ConeGeometry(1, 1, 4)), '#FFC629', 0, 0, -0.34, 0.03, 0.18, 0.16); tail.rotation.x = Math.PI / 2; [-0.08, 0.08].forEach((x) => mk(fish, SPH, '#111', x, 0.05, 0.18, 0.025));
    fish.visible = false; scene.add(fish); clickable(fish, 'fish'); fish.userData = { t: 0, next: 2, jumping: false, flip: 0 };
    anims.push((dt) => {
      const f = fish.userData; f.t += dt;
      if (!f.jumping && f.t > f.next) { f.jumping = true; f.t = 0; f.x = POND[0] + (rng() - 0.5) * 3; f.z = POND[1] + (rng() - 0.5) * 2.4; f.dir = rng() * Math.PI * 2; fish.visible = true; ripple(f.x, f.z); }
      if (f.jumping) {
        const p = f.t / 1.1; fish.position.set(f.x + Math.cos(f.dir) * p * 1.6, -0.3 + Math.sin(p * Math.PI) * (f.flip ? 2.6 : 1.6), f.z + Math.sin(f.dir) * p * 1.6);
        fish.rotation.set(-Math.cos(p * Math.PI) * 1.1 + (f.flip ? p * Math.PI * 4 : 0), -f.dir + Math.PI / 2, 0);
        if (p >= 1) { f.jumping = false; f.t = 0; f.next = 3 + rng() * 5; fish.visible = false; ripple(fish.position.x, fish.position.z, f.flip ? 3 : 1); f.flip = 0; }
      }
    });
    const oaks = treeSpots.filter((s) => !s[3]);
    const st = oaks.find((s) => Math.hypot(s[0] + 4, s[1] - 11) < 7) || oaks[0] || treeSpots[0];
    const perch = (s) => new T.Vector3(s[0] + 0.3, s[2] + 1.05 * s[4], s[1] + 0.3);
    squirrel = new T.Group(); mk(squirrel, SPH, '#A0522D', 0, 0.12, 0, 0.11, 0.12, 0.16); mk(squirrel, SPH, '#A0522D', 0, 0.26, 0.14, 0.1);
    const stail = new T.Group(); squirrel.add(stail); stail.position.set(0, 0.15, -0.14); mk(stail, CAPS, '#C0703D', 0, 0.2, -0.05, 0.08, 0.14, 0.08);
    mk(squirrel, SPH, '#111', 0.05, 0.3, 0.23, 0.02); mk(squirrel, SPH, '#111', -0.05, 0.3, 0.23, 0.02);
    squirrel.position.copy(perch(st)); scene.add(squirrel); clickable(squirrel, 'squirrel');
    squirrel.userData = { home: squirrel.position.clone(), mode: 'idle', t: 0 };
    const other = treeSpots.filter((s) => s !== st).sort((a, b) => Math.hypot(a[0] - st[0], a[1] - st[1]) - Math.hypot(b[0] - st[0], b[1] - st[1]))[0];
    anims.push((dt, t) => {
      const q = squirrel.userData; q.t += dt;
      if (q.mode === 'idle') { squirrel.rotation.y = Math.sin(t * 1.3) * 0.6; squirrel.children[2].rotation.x = Math.sin(t * 6) * 0.2; }
      if (q.mode === 'run') { const p = Math.min(1, q.t / 1.6); squirrel.position.lerpVectors(q.from, q.to, p); squirrel.position.y = q.from.y + Math.sin(p * Math.PI) * 0.6 - (p < 0.5 ? p : 1 - p) * 1.2; if (p >= 1) q.mode = 'idle'; }
    });
    squirrel.userData.other = perch(other);
    owl = new T.Group(); mk(owl, SPH, '#8D6E63', 0, 0.3, 0, 0.24, 0.3, 0.22); mk(owl, SPH, '#D7CCC8', 0, 0.26, 0.12, 0.15, 0.2, 0.12);
    const head = new T.Group(); head.position.y = 0.68; owl.add(head); mk(head, SPH, '#A1887F', 0, 0, 0, 0.22, 0.19, 0.2);
    [-0.09, 0.09].forEach((x) => { mk(head, SPH, '#FFF59D', x, 0.02, 0.16, 0.07, 0.07, 0.03); mk(head, SPH, '#111', x, 0.02, 0.19, 0.035, 0.035, 0.02); const e = mk(head, G('cone4', () => new T.ConeGeometry(1, 1, 4)), '#8D6E63', x * 1.3, 0.2, 0, 0.05, 0.12, 0.05); });
    mk(head, G('cone4', () => new T.ConeGeometry(1, 1, 4)), '#FFB300', 0, -0.05, 0.2, 0.03, 0.06, 0.03).rotation.x = Math.PI;
    const ot = oaks.find((s) => s[0] < -9 && Math.abs(s[1]) < 7) || oaks[1] || treeSpots[1];
    owl.position.set(ot[0] + 0.95 * ot[4], ot[2] + 2.05 * ot[4], ot[1] + 0.95 * ot[4]); owl.rotation.y = 0.8; scene.add(owl); clickable(owl, 'owl'); nightOnly.push(owl); owl.userData.head = head;
    bigfoot = new T.Group(); mk(bigfoot, CAPS, '#5D4037', 0, 1.6, 0, 0.55, 0.45, 0.4); [-0.28, 0.28].forEach((x) => mk(bigfoot, CAPS, '#4E342E', x, 0.5, 0, 0.18, 0.3, 0.2));
    mk(bigfoot, SPH, '#5D4037', 0, 2.6, 0.05, 0.38, 0.38, 0.34); mk(bigfoot, SPH, '#A1887F', 0, 2.55, 0.3, 0.22, 0.17, 0.08); [-0.1, 0.1].forEach((x) => mk(bigfoot, SPH, '#111', x, 2.66, 0.36, 0.04));
    const arm = new T.Group(); arm.position.set(0.62, 2.15, 0); bigfoot.add(arm); mk(arm, CAPS, '#4E342E', 0, -0.5, 0, 0.15, 0.4, 0.15); bigfoot.userData = { arm, mode: 'off', t: 0 };
    mk(bigfoot, CAPS, '#4E342E', -0.62, 1.65, 0, 0.15, 0.4, 0.15);
    bigfoot.position.set(-15.5, groundY(-15.5, 2.5), 2.5); bigfoot.rotation.y = Math.PI / 3; bigfoot.visible = false; scene.add(bigfoot); clickable(bigfoot, 'bigfoot');
    anims.push((dt, t) => {
      const b = bigfoot.userData; if (b.mode === 'off') return; b.t += dt;
      if (b.mode === 'peek') { const s = Math.max(0, Math.sin(b.t * 0.9)); bigfoot.position.x = -16.2 + s * 1.6; if (b.t > 40) { b.mode = 'off'; bigfoot.visible = false; } }
      if (b.mode === 'wave') { b.arm.rotation.z = Math.PI * 0.8 + Math.sin(b.t * 10) * 0.4; if (b.t > 2) { b.mode = 'leave'; b.t = 0; } }
      if (b.mode === 'leave') { bigfoot.position.x -= dt * 2; bigfoot.position.y -= dt * 0.6; if (b.t > 1.5) { b.mode = 'off'; bigfoot.visible = false; footprints(); } }
    });
    for (let i = 0; i < (tier === 'full' ? 3 : 2); i++) {
      const b = new T.Group(); mk(b, SPH, '#37474F', 0, 0, 0, 0.12, 0.1, 0.22); mk(b, SPH, '#455A64', 0, 0.06, 0.18, 0.08); const w1 = new T.Group(), w2 = new T.Group(); b.add(w1, w2);
      mk(w1, SPH, '#546E7A', -0.3, 0, 0, 0.3, 0.03, 0.12); mk(w2, SPH, '#546E7A', 0.3, 0, 0, 0.3, 0.03, 0.12);
      scene.add(b); const r = 9 + i * 3, sp = 0.25 + i * 0.07, off = i * 2;
      anims.push((dt, t) => { const a = t * sp + off; b.position.set(Math.cos(a) * r, 10 + i * 1.5 + Math.sin(t + i) * 0.5, Math.sin(a) * r); b.rotation.y = -a; const f = Math.sin(t * 12 + i) * 0.6; w1.rotation.z = f; w2.rotation.z = -f; });
    }
    const n = tier === 'full' ? 50 : 20, pos = new Float32Array(n * 3), seeds = Array.from({ length: n }, () => [rng() * 30 - 15, rng() * 30 - 15, rng() * 6]);
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const ff = new T.Points(fg, new T.PointsMaterial({ color: '#FFF59D', map: glowTex, size: 14, sizeAttenuation: false, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    scene.add(ff); duskNight.push(ff);
    anims.push((dt, t) => { if (!ff.visible) return; seeds.forEach(([x, z, s], i) => { pos[i * 3] = x + Math.sin(t * 0.5 + s) * 1.5; pos[i * 3 + 1] = groundY(x, z) + 1 + Math.sin(t * 0.8 + s * 2) * 0.8 + 0.6; pos[i * 3 + 2] = z + Math.cos(t * 0.4 + s) * 1.5; }); fg.attributes.position.needsUpdate = true; ff.material.opacity = 0.6 + Math.sin(t * 6) * 0.4; });
  }
  const ripples = [];
  function ripple(x, z, big = 1) {
    let r = ripples.find((q) => q.userData.life >= 1);
    if (!r) { if (ripples.length > 8) return; r = new T.Mesh(new T.RingGeometry(0.3, 0.4, 28), new T.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, side: T.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.renderOrder = 3; scene.add(r); ripples.push(r); }
    r.userData = { life: 0, big }; r.position.set(x, -0.27, z);
  }
  function footprints() { for (let i = 0; i < 6; i++) { const x = -14 + i * 1.1, z = 3 + (i % 2) * 0.6, f = mk(scene, SPH, '#3E2723', x, groundY(x, z) + 0.01, z, 0.18, 0.02, 0.3); f.castShadow = false; } }
  anims.push((dt) => ripples.forEach((r) => { if (r.userData.life >= 1) { r.visible = false; return; } r.visible = true; r.userData.life += dt / 1.4; r.scale.setScalar(1 + r.userData.life * 3 * r.userData.big); r.material.opacity = 0.8 * (1 - r.userData.life); }));

  /* ---------- weather ---------- */
  let clouds = [], rain, rainbow, sky, stars;
  function weatherInit() {
    for (let i = 0; i < 4; i++) {
      const g = new T.Group(), m = new T.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.92, roughness: 1 });
      for (let j = 0; j < 7; j++) { const r = 1.1 + rng() * 1.1; mk(g, SPH, null, (j - 3) * 1.1 + rng() * 0.5, rng() * 0.6 + (j > 1 && j < 5 ? 0.5 : 0), rng() * 1.6 - 0.8, r, r * 0.75, r, m).castShadow = false; }
      g.position.set(rng() * 36 - 18, 19 + rng() * 3, -14 - rng() * 8); g.userData.m = m; scene.add(g); clouds.push(g);
    }
    anims.push((dt) => clouds.forEach((c, i) => { if (!c.visible) return; c.position.x += dt * (0.6 + i * 0.15); if (c.position.x > 24) c.position.x = -24; }));
    const n = tier === 'full' ? 700 : 260, rp = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = rng() * 36 - 18, y = rng() * 16, z = rng() * 36 - 18; rp.set([x, y, z, x - 0.05, y - 0.6, z], i * 6); }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#CFE8FF', transparent: true, opacity: 0.55 })); scene.add(rain);
    anims.push((dt) => { if (!rain.visible) return; for (let i = 0; i < n; i++) { let y = rp[i * 6 + 1] - dt * 18; if (y < 0) { y += 16; if (Math.hypot(rp[i * 6] - POND[0], rp[i * 6 + 2] - POND[1]) < POND_R && rng() > 0.6) ripple(rp[i * 6], rp[i * 6 + 2], 0.4); } rp[i * 6 + 1] = y; rp[i * 6 + 4] = y - 0.6; } rg.attributes.position.needsUpdate = true; });
    rainbow = new T.Group(); rainbow.position.set(-11, -2, -11); rainbow.rotation.y = Math.PI / 4; scene.add(rainbow);
    ['#E53935', '#FB8C00', '#FFD600', '#43A047', '#1E88E5', '#7E57C2'].forEach((c, b) => { const m = new T.Mesh(new T.TorusGeometry(19 - b * 0.85, 0.44, 8, 64, Math.PI), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false })); rainbow.add(m); });
    // Sky dome + stars (shown in Walk Mode; the diorama uses the CSS sky behind the canvas)
    sky = new T.Mesh(new T.SphereGeometry(170, 32, 16), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color() }, hor: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color('#FFF4D6') }, sunAmt: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, hor, sunCol; uniform vec3 sunDir; uniform float sunAmt; varying vec3 vD;
        void main(){ float h = vD.y; vec3 c = mix(hor, top, smoothstep(-0.02, 0.6, h)); c = mix(c, hor * 0.85, smoothstep(0.0, -0.25, h));
          float s = max(dot(vD, normalize(sunDir)), 0.0); c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.22) * sunAmt;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
    }));
    sky.visible = false; sky.renderOrder = -1; scene.add(sky);
    const sp = new Float32Array(600 * 3); for (let i = 0; i < 600; i++) { const u = rng() * 2 * Math.PI, v = 0.08 + rng() * 0.9; sp.set([Math.cos(u) * Math.cos(v) * 160, Math.sin(v) * 160, Math.sin(u) * Math.cos(v) * 160], i * 3); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
    stars = new T.Points(sg, new T.PointsMaterial({ color: '#FFFFFF', map: glowTex, size: 5, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false })); stars.visible = false; scene.add(stars);
  }
  function skyOn(on) { sky.visible = on; stars.visible = on && S.time === 'night'; }
  function setWeather(w) {
    S.weather = w;
    clouds.forEach((c, i) => { c.visible = w !== 'clear' && w !== 'rainbow' ? true : i < 1; c.userData.m.color.set(w === 'rain' ? '#A4AEB8' : '#FFFFFF'); });
    rain.visible = w === 'rain'; rainbow.visible = w === 'rainbow';
    root.classList.toggle('w-rain', w === 'rain'); S.dirty = true; applyLight();
  }

  /* ---------- day / night ---------- */
  const LOOK = {
    morning: { sky: '#FFE2C2', gnd: '#5B7A3A', hi: 0.8, sun: '#FFC48A', si: 1.7, sp: [22, 10, 14], fire: 0.8, glow: 0.25, top: '#86B9E8', hor: '#FFD7AE' },
    day: { sky: '#EAF4FF', gnd: '#6B8A45', hi: 0.85, sun: '#FFF1DA', si: 1.9, sp: [14, 26, 18], fire: 0.5, glow: 0, top: '#3F8FDB', hor: '#CDEBFF' },
    dusk: { sky: '#E8A8B8', gnd: '#3A3A30', hi: 0.65, sun: '#FF9050', si: 1.3, sp: [-22, 8, 10], fire: 2.2, glow: 1, top: '#3B2B6B', hor: '#F59E62' },
    night: { sky: '#8C9CE0', gnd: '#222838', hi: 0.6, sun: '#A9BCFF', si: 0.6, sp: [-10, 22, -6], fire: 3, glow: 1.3, top: '#0B1330', hor: '#2A3A6E' }
  };
  function setTime(t) {
    S.time = t; if (scene && scene.fog) scene.fog.color.set(FOG[t]);
    root.classList.remove('t-morning', 't-day', 't-dusk', 't-night'); root.classList.add('t-' + t); applyLight();
    nightOnly.forEach((o) => (o.visible = t === 'night')); duskNight.forEach((o) => (o.visible = t === 'night' || t === 'dusk'));
    if (sky) skyOn(sky.visible);
    S.dirty = true;
  }
  function applyLight() {
    if (!hemi) return; const L = LOOK[S.time], wet = S.weather === 'rain';
    hemi.color.set(L.sky); hemi.groundColor.set(L.gnd); hemi.intensity = L.hi * (wet ? 0.85 : 1);
    sun.color.set(L.sun); sun.intensity = L.si * (wet ? 0.45 : 1); sun.position.set(...L.sp);
    S.fireBase = L.fire; glowMats.forEach((m) => (m.emissiveIntensity = L.glow * 1.4));
    glowSprites.forEach((s) => (s.material.opacity = Math.min(1, L.glow * s.userData.base)));
    if (sky) { const u = sky.material.uniforms; u.top.value.set(wet ? '#7C8A99' : L.top); u.hor.value.set(wet ? '#B9C3CC' : L.hor); u.sunDir.value.set(...L.sp); u.sunAmt.value = wet ? 0 : S.time === 'night' ? 0.25 : 1; u.sunCol.value.set(S.time === 'night' ? '#DDE6FF' : '#FFF4D6'); }
    if (waterMesh) waterMesh.material.uniforms.uSky.value.set(S.time === 'night' ? '#6C7AB8' : '#FFFFFF');
  }
  const autoTime = () => { const h = new Date().getHours(); return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night'; };
  const autoWeather = () => { const r = Math.random(); return r < 0.55 ? 'clear' : r < 0.8 ? 'clouds' : r < 0.92 ? 'rain' : 'rainbow'; };

  /* ---------- markers (promo ↔ building) ---------- */
  const markers = {};
  function marker(id, color) {
    const [x, z] = BLD[id], g = new T.Group();
    mk(g, rboxGeo(0.5, 0.6, 0.5, 0.12), null, 0, 0, 0, 1, 1, 1, new T.MeshBasicMaterial({ color: '#FFE7A0' })).castShadow = false;
    mk(g, rboxGeo(0.62, 0.1, 0.62, 0.04), '#4E2F12', 0, 0.35, 0); mk(g, rboxGeo(0.62, 0.1, 0.62, 0.04), '#4E2F12', 0, -0.35, 0);
    mk(g, CYL, '#4E2F12', 0, 0.8, 0, 0.03, 0.8, 0.03); const fl = mk(g, rboxGeo(0.7, 0.4, 0.05, 0.02), color, 0.38, 1.0, 0);
    glow(0, 0, 0, 2.2, '#FFC46B', g, 0.85);
    const top = { campfire: 3.6, gametent: 7.2, crafthut: 6.6, quartermaster: 6.6 }[id];
    g.position.set(x + (id === 'campfire' ? 1.8 : -1.6), top, z); scene.add(g); clickable(g, 'marker:' + id);
    markers[id] = { g };
    anims.push((dt, t) => { const mk_ = markers[id]; g.position.y = top + Math.sin(t * 2 + x) * 0.25 + (mk_.hot ? Math.abs(Math.sin(t * 8)) * 0.9 : 0); g.rotation.y = t * 0.6; });
  }

  /* ---------- labels (wooden signs = buttons; hidden buttons for critters) ---------- */
  function addLabel(el, pos, obj) { labelsEl.appendChild(el); labels.push({ el, pos, obj }); }
  function makeLabels() {
    BUILDINGS.forEach((b) => {
      const el = document.createElement('button'); el.className = 'sign'; el.type = 'button'; el.style.setProperty('--c', SECTIONS[b.section].color);
      el.innerHTML = `${b.icon} ${b.name}`; el.dataset.b = b.id; el.setAttribute('aria-label', `Open ${b.name}: ${SECTIONS[b.section].name}`);
      el.addEventListener('click', () => openBuilding(b.id, { source: 'sign' }));
      const [x, z] = BLD[b.id], y = { campfire: 2.2, gametent: 5.2, crafthut: 5.2, quartermaster: 5.4 }[b.id];
      addLabel(el, new T.Vector3(x, y, z + (b.id === 'campfire' ? 0 : 1)));
    });
    [['raccoon', 'Trash can (something’s rummaging)', [4.2, 1.4, 3.3]], ['fish', 'Pond (watch for jumping fish)', [POND[0], 0.4, POND[1]]], ['squirrel', 'Squirrel in a tree', null, () => squirrel],
      ['owl', 'Owl in a tree', null, () => owl], ['smores', 'S’mores stick: toast a marshmallow', [1.5, 0.6, 2.2]], ['archery', 'Archery range', [12.5, 1.4, -12.5]], ['cave', 'Rocky hill (hollow?)', [-12.5, 2, -13]], ['bigfoot', 'Big hairy shape at the treeline', null, () => bigfoot], ['ladder', 'Rope ladder up to a treehouse', [12.2, 1.5, 2.5]], ['geocache', 'Geocache at the end of a hidden trail', [-5.5, 0.6, -15.5]],
      ['lostbox', 'Lost & Found box', [BLD.quartermaster[0] - 2.4, 1, BLD.quartermaster[1] + 3.2]],
      ...LF.map((g) => ['lf:' + g.userData.lf.id, 'Lost item: ' + g.userData.lf.name, null, () => g]),
      ['bat', 'Sleepy bat on the cave ceiling', null, () => (caveGroup.visible ? bat : null)], ['caveexit', 'Cave exit', null, () => (caveGroup.visible ? caveGroup.children.find((c) => c.userData.action === 'caveexit') : null)]]
      .forEach(([a, txt, p, getObj]) => {
        const el = document.createElement('button'); el.className = 'hidden-btn'; el.type = 'button'; el.textContent = txt;
        el.addEventListener('click', () => doAction(a)); addLabel(el, p ? new T.Vector3(...p) : null, getObj);
      });
  }
  const v3 = new T.Vector3();
  function updateLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    labels.forEach((l) => {
      let o = l.obj && l.obj();
      if (l.obj && (!o || !o.visible)) { l.el.hidden = true; return; }
      if (o) o.getWorldPosition(v3); else v3.copy(l.pos);
      if (cam === pcam && (v3.distanceTo(pcam.position) > (l.el.classList.contains('sign') ? 30 : 14) || W.inCave !== (v3.x > 40))) { l.el.hidden = true; return; }
      v3.project(cam);
      if (v3.z > 1 || v3.z < -1) { l.el.hidden = true; return; }
      l.el.hidden = false;
      l.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px,${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%,${l.el.classList.contains('sign') ? '-100%' : '-50%'})`;
    });
  }

  /* ---------- interaction ---------- */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects(clickables.filter((c) => c.visible), true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      if (h.object.userData.faceActions) { if (W.inCave) continue; const id = h.object.userData.faceActions[h.faceIndex]; if (id) return { action: h.object.userData.actionNames[id], point: h.point }; return { ground: true, point: h.point }; }
      if (h.object.userData.ground) { if (W.inCave) continue; return { ground: true, point: h.point }; }
      if (h.object.userData.action) return { action: h.object.userData.action, point: h.point };
    }
    return null;
  }
  function doAction(a, point) {
    if (!a) return;
    if (W.mode === 'walk' && walkAction(a, point || W.pos)) return;
    if (a === 'ladder') return toast('🌳 There’s a treehouse up there! You’ll need to walk there to climb up. Click the ground to explore on foot.');
    if (a === 'geocache') return toast('📦 Something’s hidden at the end of a trail… explore on foot to open it!');
    if (a === 'lostbox') return toast('📦 The Lost & Found box. Campers have lost things all over camp… explore on foot to find them!');
    if (['cavefloor', 'caveexit', 'crystal', 'bat'].includes(a) || a.startsWith('lf:')) return;
    if (a.startsWith('b:')) return openBuilding(a.slice(2), { source: 'tap' });
    if (a.startsWith('marker:')) return openBuilding(a.slice(7), { source: 'marker', fromMarker: true });
    const r = raccoon.userData;
    switch (a) {
      case 'raccoon': if (r.mode === 'rummage') { r.mode = 'freeze'; r.t = 0; raccoon.rotation.set(0, 0, 0); raccoon.position.y = 1.1; Sound.play('squeak'); found('raccoon', '🦝 You spooked the raccoon! He took a hot dog with him.'); } else if (r.mode === 'gone') toast('The trash can is quiet… for now.'); break;
      case 'lid': lidClosed = !lidClosed; lid.rotation.z = lidClosed ? 0 : 0.9; lid.position.x = lidClosed ? 4.2 : 4.65; Sound.play('clunk'); if (lidClosed && r.mode === 'gone') found('lid', '🗑️ Click-clunk! Lid shut. No more snacks for that raccoon.'); if (!lidClosed && r.mode === 'gone') r.t = 15; S.dirty = true; break;
      case 'fish': if (fish.userData.jumping) { fish.userData.flip = 1; Sound.play('splash'); found('fish', '🐟 Nice catch! The fish did a flip.'); } else { ripple(POND[0], POND[1], 2); toast('Keep watching the pond…'); } break;
      case 'squirrel': { const q = squirrel.userData; if (q.mode !== 'idle') break; const tgt = squirrel.position.distanceTo(q.home) < 0.5 ? q.other : q.home; q.from = squirrel.position.clone(); q.to = tgt; q.mode = 'run'; q.t = 0; Sound.play('squeak'); found('squirrel', '🐿️ Zoom! The squirrel raced to another tree.'); break; }
      case 'owl': owl.userData.spin = 1; found('owl', '🦉 Hoo-hoo! The owl is watching you.'); Sound.play('hoot'); break;
      case 'bigfoot': if (bigfoot.userData.mode === 'peek') { bigfoot.userData.mode = 'wave'; bigfoot.userData.t = 0; bigfoot.position.x = -14.6; found('bigfoot', '👣 BIGFOOT waved at you! Nobody will believe this.'); } break;
      default: openGame(a);
    }
  }
  function found(id, msg) { toast(msg); track('egg_found', { egg: id, location: 'camp' }); }

  function bindInput() {
    const cv = renderer.domElement, ptrs = new Map(); let down = null, moved = 0, pinch0 = 0, zoom0 = 1, lastHover = 0;
    cv.addEventListener('pointerdown', (e) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); S.active = true; Sound.unlockIfOn();
      if (W.mode !== 'off') { if (ptrs.size === 1) { down = { x: e.clientX, y: e.clientY, yaw: W.yaw, pitch: W.pitch, walk: true }; moved = 0; cv.setPointerCapture(e.pointerId); } W.lastInput = performance.now(); return; }
      if (ptrs.size === 1) { down = { x: e.clientX, y: e.clientY, az: S.tAz, f: S.tFocus.clone(), type: e.pointerType }; moved = 0; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = S.tZoom; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (W.mode !== 'off') {
        if (down && down.walk && ptrs.size === 1) { const dx = e.clientX - down.x, dy = e.clientY - down.y; moved = Math.max(moved, Math.hypot(dx, dy)); if (moved > 6) { cv.classList.add('dragging'); W.yaw = down.yaw + dx * 0.005; W.pitch = Math.max(-0.6, Math.min(0.6, down.pitch + dy * 0.004)); W.lastLook = W.lastInput = performance.now(); hideCoach(); } }
        else if (e.pointerType === 'mouse' && performance.now() - lastHover > 90) { lastHover = performance.now(); const r = pick(e.clientX, e.clientY); cv.classList.toggle('hot', !!(r && r.action && r.action !== 'cavefloor')); }
        return;
      }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; S.tZoom = clampZoom(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0); moved = 99; return; }
      if (down && ptrs.size === 1) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y; moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved > 6) {
          cv.classList.add('dragging');
          S.tAz = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, down.az - dx * 0.006));
          if (down.type === 'mouse' && !S.panelOpen) { const f = fwd(S.tAz); S.tFocus.copy(down.f).addScaledVector(f, dy * 0.04 / S.zoom); clampFocus(); }
          if (!S.rotatedOnce) { S.rotatedOnce = true; track('camp_interact', { action: 'rotate' }); }
        }
      } else if (e.pointerType === 'mouse' && performance.now() - lastHover > 90) { lastHover = performance.now(); const r = pick(e.clientX, e.clientY); cv.classList.toggle('hot', !!(r && r.action)); cv.title = r && r.ground ? 'Click to explore on foot' : ''; }
    });
    const up = (e) => {
      ptrs.delete(e.pointerId); cv.classList.remove('dragging');
      if (down && moved < 6 && e.type === 'pointerup') {
        const r = pick(e.clientX, e.clientY);
        if (W.mode === 'walk') { if (r && r.action) doAction(r.action, r.point); else if (r && r.ground) walkTo(r.point.x, r.point.z); }
        else if (W.mode === 'off' && r) { if (r.action) { doAction(r.action, r.point); track('camp_interact', { action: 'tap', target: r.action }); } else if (r.ground) enterWalk(r.point.x, r.point.z, 'ground_click'); }
      }
      if (ptrs.size === 0) down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      if (W.mode !== 'off') { e.preventDefault(); return; }
      if (!S.active) { hint('Click the camp first to zoom with your mouse wheel'); return; }
      e.preventDefault(); S.tZoom = clampZoom(S.tZoom * Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    document.addEventListener('pointerdown', (e) => { if (!root.contains(e.target)) S.active = false; });
    root.addEventListener('keydown', (e) => {
      if (e.target.closest('.panel,.overlay,input,select') || W.mode !== 'off') return;
      if ((e.key === 'w' || e.key === 'W') && !e.target.closest('.walk-hud')) { enterWalkEntrance('keyboard'); return; }
      if (e.key === 'ArrowLeft') { S.tAz = Math.max(0.05, S.tAz - 0.15); e.preventDefault(); }
      if (e.key === 'ArrowRight') { S.tAz = Math.min(Math.PI / 2 - 0.05, S.tAz + 0.15); e.preventDefault(); }
      if (e.key === '+' || e.key === '=') S.tZoom = clampZoom(S.tZoom * 1.2);
      if (e.key === '-') S.tZoom = clampZoom(S.tZoom / 1.2);
    });
  }
  const clampZoom = (z) => Math.max(0.85, Math.min(2.8, z));
  const fwd = (az) => new T.Vector3(-Math.sin(az), 0, -Math.cos(az));
  const right = (az) => new T.Vector3(Math.cos(az), 0, -Math.sin(az));
  function clampFocus() { S.tFocus.x = Math.max(-12, Math.min(12, S.tFocus.x)); S.tFocus.z = Math.max(-12, Math.min(12, S.tFocus.z)); }

  /* ---------- camera ---------- */
  let viewH = 26;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    const asp = w / h; viewH = Math.max(21, 44 / asp);
    camera.left = -viewH * asp / 2; camera.right = viewH * asp / 2; camera.top = viewH / 2; camera.bottom = -viewH / 2; camera.updateProjectionMatrix(); if (pcam) { pcam.aspect = asp; pcam.updateProjectionMatrix(); } S.dirty = true;
  }
  function updateCamera(dt) {
    const k = 1 - Math.pow(0.0015, dt);
    const before = S.az + S.zoom + S.focus.x + S.focus.z;
    S.az += (S.tAz - S.az) * k; S.zoom += (S.tZoom - S.zoom) * k; S.focus.lerp(S.tFocus, k);
    camera.position.set(S.focus.x + Math.sin(S.az) * Math.cos(ELEV) * DIST, S.focus.y + Math.sin(ELEV) * DIST, S.focus.z + Math.cos(S.az) * Math.cos(ELEV) * DIST);
    camera.lookAt(S.focus); if (camera.zoom !== S.zoom) { camera.zoom = S.zoom; camera.updateProjectionMatrix(); }
    if (Math.abs(before - (S.az + S.zoom + S.focus.x + S.focus.z)) > 1e-5) S.dirty = true;
    const off = Math.abs(S.tAz - Math.PI / 4) > 0.05 || Math.abs(S.tZoom - 1) > 0.05 || S.tFocus.distanceTo(DEFAULT_FOCUS) > 0.3;
    document.getElementById('resetBtn').hidden = !off;
  }
  const DEFAULT_FOCUS = new T.Vector3(0, 0, 1);
  function focusBuilding(id, panelOpen) {
    const [x, z] = BLD[id], w = stage.clientWidth, mobile = w < 768;
    S.tZoom = mobile ? 1.55 : 1.8; S.panelOpen = panelOpen;
    const p = new T.Vector3(x, 1.5, z), worldW = viewH * (w / stage.clientHeight) / S.tZoom;
    if (panelOpen && !mobile) p.addScaledVector(right(S.tAz), worldW * Math.min(0.42, 520 / w) / 2);
    if (panelOpen && mobile) p.addScaledVector(fwd(S.tAz), -(viewH / S.tZoom) * 0.33 / Math.sin(ELEV));
    S.tFocus.copy(p);
  }
  function resetView() { S.tAz = Math.PI / 4; S.tZoom = 1; S.tFocus.copy(DEFAULT_FOCUS); S.panelOpen = false; track('camp_setting', { setting: 'reset_view' }); }

  /* ---------- loop, tiers, perf ---------- */
  let last = performance.now(), tAcc = 0, fpsFrames = 0, fpsTime = 0, slow = 0, skip = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!S.visible || document.hidden || S.dead) return;
    if (tier === 'lite') { skip = !skip; if (skip) return; }
    const walking = W.mode !== 'off';
    if (walking) walkUpdate(tier === 'lite' ? dt * 2 : dt); else updateCamera(tier === 'lite' ? dt * 2 : dt);
    const animate = !S.paused;
    if (animate) { tAcc += tier === 'lite' ? dt * 2 : dt; anims.forEach((f) => f(tier === 'lite' ? dt * 2 : dt, tAcc)); if (owl.userData.spin) { owl.userData.spin = Math.max(0, owl.userData.spin - dt * 0.6); owl.userData.head.rotation.y = Math.sin((1 - owl.userData.spin) * Math.PI * 2) * 2.2; } }
    if (animate || S.dirty || walking) { renderer.render(scene, cam); updateLabels(); S.dirty = false; }
    fpsFrames++; fpsTime += dt;
    if (fpsTime > 3) { const fps = fpsFrames / fpsTime * (tier === 'lite' ? 2 : 1); fpsFrames = 0; fpsTime = 0; if (fps < 24 && animate) slow++; else slow = 0; if (slow >= 2) { slow = 0; stepDown(); } }
  }
  function stepDown() {
    if (tier === 'full') { tier = 'lite'; renderer.shadowMap.enabled = false; renderer.setPixelRatio(1); scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); track('camp_tier_change', { from: 'full', to: 'lite' }); }
    else if (tier === 'lite' && W.mode !== 'off') { exitWalk('perf'); toast('Walking got a little slow on this device, so we flew back to the map.'); }
    else if (tier === 'lite') { track('camp_tier_change', { from: 'lite', to: 'static' }); goStatic(); }
  }

  /* ==========================================================
     WALK MODE (v3.0): first-person exploration (§6.11)
     ========================================================== */
  let pcam, cam;
  const EYE = 1.4, WALK_SPEED = 2.5, CAVE = new T.Vector3(60, 0, 60);
  const W = { mode: 'off', pos: new T.Vector3(), y: EYE, yaw: 0, pitch: -0.06, speed: 0, path: [], arrive: null, lastInput: 0, lastLook: 0, warned: false,
    inCave: false, onTree: false, spy: false, swoop: null, climb: null, moved: false, keys: new Set(), dist: 0, start: 0, prox: 0, mini: 0, promptKey: '', caveCool: false, sqCool: 0, fishCool: 0 };
  const BLOCK = new Set();
  const cellOf = (x, z) => [Math.floor(x), Math.floor(z)];
  function blockRect(cx, cz, rx, rz) { for (let x = Math.floor(cx - rx); x < Math.ceil(cx + rx); x++) for (let z = Math.floor(cz - rz); z < Math.ceil(cz + rz); z++) BLOCK.add(key(x, z)); }
  function blockCircle(cx, cz, r) { for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r) BLOCK.add(key(x, z)); }
  const walkable = (x, z) => x >= -N && z >= -N && x < N && z < N && TYPE[key(x, z)] !== 'water' && !BLOCK.has(key(x, z));
  function canStand(x, z) {
    if (W.inCave) return x > 56.4 && x < 63.6 && z > 57.4 && z < 62.6;
    if (Math.abs(x) > 17.3 || Math.abs(z) > 17.3) return false;
    const r = 0.28; return [[-r, -r], [r, -r], [-r, r], [r, r]].every(([a, b]) => walkable(...cellOf(x + a, z + b)));
  }
  function hAt(x, z) { return W.inCave ? 0 : groundY(x, z); }
  function nearestWalkable(x, z) {
    let best = null, bd = 1e9; const [cx, cz] = cellOf(x, z);
    for (let a = -8; a <= 8; a++) for (let b = -8; b <= 8; b++) { const X = cx + a, Z = cz + b; if (!walkable(X, Z)) continue; const d = Math.hypot(X + 0.5 - x, Z + 0.5 - z); if (d < bd) { bd = d; best = [X + 0.5, Z + 0.5]; } }
    return best;
  }
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function astar(s, goal) {
    const K = (c) => c[0] + ',' + c[1], gk = K(goal), gS = { [K(s)]: 0 }, from = {}, open = [s], inOpen = new Set([K(s)]), closed = new Set();
    const h = (c) => { const dx = Math.abs(c[0] - goal[0]), dz = Math.abs(c[1] - goal[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    let guard = 0;
    while (open.length && guard++ < 3000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (gS[K(open[i])] + h(open[i]) < gS[K(open[bi])] + h(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0], ck = K(cur); inOpen.delete(ck);
      if (ck === gk) { const out = [cur]; let k = ck; while (from[k]) { out.unshift(from[k]); k = K(from[k]); } return out; }
      closed.add(ck);
      for (const [dx, dz] of DIRS) {
        const n = [cur[0] + dx, cur[1] + dz], nk = K(n);
        if (closed.has(nk) || !walkable(n[0], n[1])) continue;
        if (dx && dz && (!walkable(cur[0] + dx, cur[1]) || !walkable(cur[0], cur[1] + dz))) continue;
        const ng = gS[ck] + (dx && dz ? 1.414 : 1);
        if (gS[nk] == null || ng < gS[nk]) { gS[nk] = ng; from[nk] = cur; if (!inOpen.has(nk)) { open.push(n); inOpen.add(nk); } }
      }
    }
    return null;
  }
  function lineClear(a, b) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25); for (let i = 1; i <= n; i++) { const t = i / n; if (!canStand(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; } return true; }
  function walkTo(x, z, arrive) {
    if (W.onTree) { hint('Climb down first! (button at the bottom)'); return; }
    if (W.climb) return;
    W.lastInput = performance.now();
    if (W.inCave) {
      if (x < 56.8) { W.path = [[56.5, Math.max(59.6, Math.min(60.4, z))]]; W.arrive = leaveCave; showRing(56.8, 60); return; }
      const p = [Math.max(56.7, Math.min(63.3, x)), Math.max(57.7, Math.min(62.3, z))]; W.path = [p]; W.arrive = arrive || null; showRing(p[0], p[1]); return;
    }
    let tx = x, tz = z; const [gx, gz] = cellOf(x, z);
    if (!walkable(gx, gz) || !canStand(x, z)) {
      if (TYPE[key(gx, gz)] === 'water') hint('Can’t swim there! 🐟');
      const nw = nearestWalkable(x, z); if (!nw) return; [tx, tz] = nw;
    }
    const s = cellOf(W.pos.x, W.pos.z), cells = astar(s, cellOf(tx, tz));
    if (!cells) { hint('Hmm, can’t find a way there.'); return; }
    const pts = [[W.pos.x, W.pos.z], ...cells.slice(1, -1).map(([a, b]) => [a + 0.5, b + 0.5]), [tx, tz]];
    const out = []; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !lineClear(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    W.path = out; W.arrive = arrive || null; showRing(tx, tz); W.moved = true; hideCoach();
  }
  let ring;
  function showRing(x, z) { ring.position.set(x, hAt(x, z) + 0.05, z); ring.visible = true; ring.userData.t = 0; }

  /* ---------- Walk-only world (v4 stylized): treehouse, trail, geocache, Lost & Found, cave room ---------- */
  const walkOnly = [], LF = [], lfFound = new Set();
  let caveGroup, bat, lostBox, burst = [];
  function walkWorld() {
    // Treehouse lookout (F2)
    const tx = 14, tz = 2.5, y = groundY(tx, tz);
    cyl(tx, y + 3.2, tz, 0.32, 0.5, 6.4, '#6B4423', null, 10);
    [0, 2.1, 4.2].forEach((a) => cylBetween([tx + Math.cos(a) * 0.9, y, tz + Math.sin(a) * 0.9], [tx, y + 0.8, tz], 0.12, 0.2, '#6B4423', null, 6));
    cyl(tx, y + 4.05, tz, 1.9, 1.9, 0.22, '#B08A5A', null, 18);
    const posts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.4) continue; const p = [tx + Math.cos(a) * 1.75, tz + Math.sin(a) * 1.75]; posts.push(p); cyl(p[0], y + 4.5, p[1], 0.05, 0.05, 0.7, '#8B5A2B', null, 6); }
    for (let i = 0; i < posts.length - 1; i++) cylBetween([posts[i][0], y + 4.82, posts[i][1]], [posts[i + 1][0], y + 4.82, posts[i + 1][1]], 0.04, 0.04, '#8B5A2B', null, 5);
    const sh = shade(y + 5, 3.5, 0.65, 0.5);
    ball(tx, y + 7.0, tz, 2.3, '#4E9F3D', null, 1, 0.75, 1, FM, sh, noisyIco(2, 0.18, 3, true));
    [[1.5, 6.2, 0.6], [-1.2, 6.4, -1.1], [0.4, 6.0, 1.7], [-0.6, 7.6, 0.9]].forEach(([dx, dy, dz], i) => ball(tx + dx, y + dy, tz + dz, 1.2, ['#5AAE45', '#46953A'][i % 2], null, 1, 0.85, 1, FM, sh, noisyIco(2, 0.2, i + 4, true)));
    [-0.35, 0.35].forEach((dz) => cylBetween([tx - 1.85, y, tz + dz], [tx - 1.85, y + 4.15, tz + dz], 0.035, 0.035, '#C08A52', 'ladder', 5));
    for (let r = 0; r < 8; r++) cylBetween([tx - 1.85, y + 0.35 + r * 0.5, tz - 0.38], [tx - 1.85, y + 0.35 + r * 0.5, tz + 0.38], 0.035, 0.035, '#A0703C', 'ladder', 5);
    BLOCK.add(key(Math.floor(tx), Math.floor(tz)));
    // Geocache at the end of the hidden trail (F3)
    const gy = groundY(-5.5, -15.5);
    rb(-5.5, gy, -15.5, 0.8, 0.45, 0.5, '#556B2F', 'geocache', 0.2, 0.06); rb(-5.5, gy + 0.43, -15.5, 0.84, 0.08, 0.54, '#6B8E23', 'geocache', 0.2, 0.03); rb(-5.5, gy + 0.3, -15.22, 0.14, 0.1, 0.04, '#C9A227', 'geocache', 0.2, 0.01);
    [[-6.3, -15.9], [-4.6, -16.1]].forEach(([x, z]) => rock(x, groundY(x, z) + 0.1, z, 0.3, '#9C978F'));
    // Lost & Found box on the Quartermaster porch
    const [qx, qz] = BLD.quartermaster, py = groundY(qx, qz) + 0.22;
    rb(qx - 2.4, py, qz + 3.2, 0.72, 0.55, 0.72, '#8B5A2B', 'lostbox', 0, 0.06); rb(qx - 2.4, py + 0.53, qz + 3.2, 0.78, 0.08, 0.78, '#C08A52', 'lostbox', 0, 0.03);
    lostBox = new T.Vector3(qx - 2.4, py + 0.8, qz + 3.2);
    // Pond reeds + cattails
    [[-6.3, 6.1], [-5.8, 6.3], [-6.6, 6.5], [-5.6, 7.0], [-6.1, 5.8]].forEach(([x, z], i) => { const ry = groundY(x, z), h = 0.9 + (i % 3) * 0.25; cylBetween([x, ry, z], [x + 0.05, ry + h, z], 0.025, 0.015, '#558B2F', null, 4); if (i % 2 === 0) cyl(x + 0.05, ry + h - 0.15, z, 0.05, 0.05, 0.22, '#6D4C41', null, 6); });
  }
  function lostAndFound() {
    const oak = treeSpots.find((s) => !s[3] && Math.hypot(s[0], s[1]) > 8 && Math.hypot(s[0], s[1]) < 13 && s[0] + s[1] > -4) || treeSpots.find((s) => !s[3]) || treeSpots[0];
    const ey = groundY(0, 15.5), fy = groundY(0, -9.5);
    const defs = [
      ['duck', 'rubber duck', [-6.0, groundY(-6.0, 6.6), 6.6], (g) => { mk(g, SPH, '#FFD600', 0, 0.14, 0, 0.18, 0.13, 0.22); mk(g, SPH, '#FFD600', 0, 0.33, 0.1, 0.11); mk(g, SPH, '#FB8C00', 0, 0.31, 0.21, 0.06, 0.03, 0.06); [-0.05, 0.05].forEach((x) => mk(g, SPH, '#111', x, 0.36, 0.19, 0.018)); }],
      ['compass', 'compass', [2.2, ey + 3.82, 15.5], (g) => { mk(g, CYL, '#C9A227', 0, 0.04, 0, 0.17, 0.07, 0.17, smat('#C9A227', { metalness: 0.6, roughness: 0.35 })); mk(g, CYL, '#FFFFFF', 0, 0.08, 0, 0.13, 0.01, 0.13); mk(g, rboxGeo(0.04, 0.02, 0.22, 0.005), '#E53935', 0, 0.09, 0); }],
      ['sock', 'sock', [0.14, fy + 3.0, -9.5], (g) => { mk(g, CAPS, '#FFFFFF', 0, 0, 0, 0.08, 0.16, 0.07); mk(g, CAPS, '#FFFFFF', 0, -0.2, 0.08, 0.07, 0.07, 0.07).rotation.x = 1.4; mk(g, CYL, '#E53935', 0, 0.16, 0, 0.085, 0.04, 0.075); }],
      ['harmonica', 'harmonica', [4.0, groundY(4.0, 0.9) + 0.04, 0.9], (g) => { mk(g, rboxGeo(0.5, 0.1, 0.16, 0.03), '#B0BEC5', 0, 0.05, 0, 1, 1, 1, smat('#B0BEC5', { metalness: 0.7, roughness: 0.3 })); mk(g, rboxGeo(0.46, 0.04, 0.17, 0.01), '#546E7A', 0, 0.1, 0); }],
      ['flashlight', 'flashlight', [oak[0] + 0.32, oak[2] + 1.0 * oak[4], oak[1] + 0.32], (g) => { const b = mk(g, CYL, '#1E4FA0', 0, 0, 0, 0.07, 0.4, 0.07); b.rotation.x = Math.PI / 2; const h = mk(g, CYL, '#FFE082', 0, 0, 0.24, 0.1, 0.1, 0.1); h.rotation.x = Math.PI / 2; }]
    ];
    defs.forEach(([id, name, p, build]) => {
      const g = new T.Group(); build(g); g.position.set(...p); g.visible = false; g.userData.lf = { id, name };
      glow(0, 0.15, 0, 0.9, '#FFF3B0', g, 0.35, true);
      scene.add(g); clickable(g, 'lf:' + id); walkOnly.push(g); LF.push(g);
    });
  }
  function caveRoom() {
    caveGroup = new T.Group(); caveGroup.position.copy(CAVE); caveGroup.visible = false; scene.add(caveGroup);
    const dg = new T.IcosahedronGeometry(1, 3), p = dg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.sin(x * 41.3 + y * 17.1 + z * 29.7) * 43758.5453, n = 1 + (h - Math.floor(h) - 0.5) * 0.12; p.setXYZ(i, x * n, y * n, z * n); }
    dg.computeVertexNormals();
    const dome = new T.Mesh(dg, new T.MeshStandardMaterial({ color: '#6E6480', roughness: 1, side: T.BackSide })); dome.scale.set(6, 4.5, 5.1); caveGroup.add(dome);
    const floor = new T.Mesh(new T.CircleGeometry(5.9, 48), new T.MeshStandardMaterial({ color: '#4E4760', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.scale.set(1, 0.86, 1); floor.userData.action = 'cavefloor'; caveGroup.add(floor);
    [[-2, 1.5, 0.7], [2.5, -1, 0.5], [-3.5, -1.5, 0.6], [1, 2.8, 0.45]].forEach(([x, z, r]) => mk(caveGroup, noisyIco(1, 0.35, 2, false), '#5C5468', x, r * 0.4, z, r, r * 0.6, r));
    for (let i = 0; i < 8; i++) { const st = mk(caveGroup, G('cone6', () => new T.ConeGeometry(1, 1, 6)), '#5C5468', rng() * 7 - 3.5, 3.6, rng() * 5 - 2.5, 0.15, 0.6 + rng() * 0.6, 0.15); st.rotation.x = Math.PI; }
    const door = new T.Mesh(new T.PlaneGeometry(1.6, 2.4), new T.MeshBasicMaterial({ color: '#FFF2C8' })); door.rotation.y = Math.PI / 2; door.position.set(-4.7, 1.2, 0); door.userData.action = 'caveexit'; caveGroup.add(door);
    glow(-4.4, 1.2, 0, 4, '#FFE7B0', caveGroup, 0.6, true);
    const cc = ['#B388FF', '#80DEEA', '#CE93D8', '#B388FF'];
    [[2.8, -2.4], [3.6, 1.8], [-2.6, 2.6], [0.6, -2.8]].forEach(([x, z], i) => {
      const g = new T.Group(); g.position.set(x, 0, z); caveGroup.add(g);
      for (let j = 0; j < 5; j++) { const hh = 0.4 + rng() * 0.9, m = mk(g, G('oct', () => new T.OctahedronGeometry(1, 0)), null, rng() * 0.6 - 0.3, hh / 2, rng() * 0.6 - 0.3, 0.13, hh / 2, 0.13, new T.MeshBasicMaterial({ color: cc[i] })); m.rotation.z = rng() * 0.5 - 0.25; m.castShadow = false; }
      glow(0, 0.6, 0, 2.2, cc[i], g, 0.7, true);
      g.traverse((o) => (o.userData.action = 'crystal')); g.userData.pulse = 0;
    });
    const paint = (draw) => canvasTex(256, 128, (x) => { x.fillStyle = '#6E6480'; x.fillRect(0, 0, 256, 128); x.strokeStyle = x.fillStyle = '#E0AE66'; x.lineWidth = 5; draw(x); });
    const pm = (tex) => new T.MeshStandardMaterial({ map: tex, roughness: 1, transparent: true, opacity: 0.95 });
    const p1 = new T.Mesh(new T.PlaneGeometry(3.6, 1.8), pm(paint((x) => { x.beginPath(); x.moveTo(30, 100); x.lineTo(70, 40); x.lineTo(110, 100); x.closePath(); x.stroke(); x.beginPath(); x.arc(160, 95, 12, 0, 7); x.fill(); x.fillStyle = '#E57373'; x.beginPath(); x.moveTo(150, 85); x.lineTo(160, 55); x.lineTo(170, 85); x.fill(); x.fillStyle = '#E0AE66'; [205, 230].forEach((sx) => { x.beginPath(); x.arc(sx, 50, 7, 0, 7); x.fill(); x.beginPath(); x.moveTo(sx, 57); x.lineTo(sx, 85); x.moveTo(sx - 12, 68); x.lineTo(sx + 12, 68); x.moveTo(sx, 85); x.lineTo(sx - 9, 105); x.moveTo(sx, 85); x.lineTo(sx + 9, 105); x.stroke(); }); })));
    p1.position.set(0, 2, -4.1); caveGroup.add(p1);
    const p2 = new T.Mesh(new T.PlaneGeometry(3.6, 1.8), pm(paint((x) => { x.beginPath(); x.ellipse(80, 64, 40, 18, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(120, 64); x.lineTo(145, 45); x.lineTo(145, 83); x.closePath(); x.stroke(); x.beginPath(); x.arc(200, 40, 20, 0, 7); x.stroke(); for (let a = 0; a < 8; a++) { x.beginPath(); x.moveTo(200 + Math.cos(a) * 26, 40 + Math.sin(a) * 26); x.lineTo(200 + Math.cos(a) * 36, 40 + Math.sin(a) * 36); x.stroke(); } })));
    p2.rotation.y = -Math.PI / 2; p2.position.set(4.95, 2, 0); caveGroup.add(p2);
    bat = new T.Group(); mk(bat, SPH, '#3b3346', 0, 0, 0, 0.14, 0.18, 0.12); const w1 = new T.Group(), w2 = new T.Group(); bat.add(w1, w2);
    mk(w1, SPH, '#3b3346', -0.3, 0.03, 0, 0.3, 0.03, 0.14); mk(w2, SPH, '#3b3346', 0.3, 0.03, 0, 0.3, 0.03, 0.14);
    [-0.05, 0.05].forEach((x) => mk(bat, SPH, '#FFF59D', x, 0.05, 0.11, 0.025));
    bat.position.set(1.5, 3.7, 1); bat.rotation.x = Math.PI; caveGroup.add(bat); bat.traverse((o) => (o.userData.action = 'bat')); bat.userData = { fly: 0, w1, w2, a: 0 };
    const pl = new T.PointLight('#C9A8FF', 1.6, 12, 1.5); pl.position.set(0, 3, 0); caveGroup.add(pl);
    const pl2 = new T.PointLight('#FFD9A0', 1.0, 8, 1.5); pl2.position.set(-3.8, 1.5, 0); caveGroup.add(pl2);
    clickables.push(caveGroup);
    anims.push((dt, t) => {
      if (!caveGroup.visible) return;
      const b = bat.userData;
      if (b.fly > 0) { b.fly -= dt; b.a += dt * 3; const c = W.pos.clone().sub(CAVE); bat.position.set(c.x + Math.cos(b.a) * 1.3, EYE + 0.5 + Math.sin(b.a * 2) * 0.2, c.z + Math.sin(b.a) * 1.3); bat.rotation.set(0, -b.a, 0); const f = Math.sin(t * 25) * 0.8; b.w1.rotation.z = f; b.w2.rotation.z = -f; if (b.fly <= 0) { bat.position.set(1.5, 3.7, 1); bat.rotation.set(Math.PI, 0, 0); b.w1.rotation.z = b.w2.rotation.z = 0; } }
      caveGroup.children.forEach((g) => { if (g.userData.pulse > 0) { g.userData.pulse -= dt; g.scale.setScalar(1 + g.userData.pulse * 0.4); } });
    });
  }

  function initWalk() {
    pcam = new T.PerspectiveCamera(70, 1, 0.1, 220); cam = camera;
    ring = new T.Mesh(new T.RingGeometry(0.3, 0.45, 24), new T.MeshBasicMaterial({ color: '#FFC629', transparent: true, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
    anims.push((dt) => { if (!ring.visible) return; ring.userData.t += dt; ring.scale.setScalar(1 + Math.sin(ring.userData.t * 6) * 0.15); });
    lostAndFound(); caveRoom();
    anims.push((dt) => { burst = burst.filter((b) => { b.userData.life -= dt; b.userData.v.y -= 9 * dt; b.position.addScaledVector(b.userData.v, dt); b.rotation.x += dt * 4; if (b.userData.life <= 0) { scene.remove(b); return false; } return true; }); });
    drawMiniBg();
    window.addEventListener('keydown', (e) => {
      if (W.mode !== 'walk' || e.target.closest('input,select,textarea,.panel,.overlay,dialog')) return;
      const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'pageup', 'pagedown'].includes(k)) { W.keys.add(k); e.preventDefault(); W.lastInput = performance.now(); }
    });
    window.addEventListener('keyup', (e) => W.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => W.keys.clear());
  }

  /* ---------- enter / exit ---------- */
  const isoDir = (az) => new T.Vector3(Math.sin(az) * Math.cos(ELEV), Math.sin(ELEV), Math.cos(az) * Math.cos(ELEV));
  const lookDir = () => new T.Vector3(Math.sin(W.yaw) * Math.cos(W.pitch), Math.sin(W.pitch), Math.cos(W.yaw) * Math.cos(W.pitch));
  const FOG = { morning: '#FFD7AE', day: '#CDEBFF', dusk: '#F59E62', night: '#2A3A6E' };
  function setFog(on) { scene.fog = on ? new T.Fog(FOG[S.time], tier === 'full' ? 18 : 10, tier === 'full' ? 42 : 26) : null; }
  function setWalkOnly(on) { walkOnly.forEach((o) => (o.visible = on && !lfFound.has(o.userData.lf && o.userData.lf.id))); skyOn(on); }
  function enterWalk(x, z, source) {
    if (W.mode !== 'off' || tier === 'static' || S.dead) return;
    if (S.panelOpen) closePanel();
    const p = canStand(x, z) ? [x, z] : nearestWalkable(x, z); if (!p) return;
    W.pos.set(p[0], 0, p[1]); W.path = []; W.speed = 0; W.inCave = false; W.onTree = false; W.spy = false; W.dist = 0; W.moved = false; W.caveCool = false;
    let near = null, nd = 1e9; Object.entries(BLD).forEach(([id, [bx, bz]]) => { const d = Math.hypot(bx - p[0], bz - p[1]); if (d < nd && d > 2) { nd = d; near = [bx, bz]; } });
    W.yaw = source === 'explore_button' || source === 'keyboard' ? Math.PI : Math.atan2(near[0] - p[0], near[1] - p[1]); W.pitch = -0.06;
    W.y = hAt(p[0], p[1]) + EYE;
    W.scrollY = window.scrollY; root.classList.add('walking'); document.documentElement.classList.add('walk-lock'); resize();
    const D = (viewH / S.zoom / 2) / Math.tan(T.MathUtils.degToRad(10));
    const p0 = S.focus.clone().addScaledVector(isoDir(S.az), D), eye = new T.Vector3(p[0], W.y, p[1]);
    pcam.position.copy(p0); pcam.fov = 20; pcam.aspect = stage.clientWidth / stage.clientHeight; pcam.updateProjectionMatrix(); cam = pcam;
    W.mode = 'swoop'; W.swoop = { t: 0, dur: reduceMotion() ? 0.01 : 1.15, p0, p1: eye, t0: S.focus.clone(), t1: eye.clone().add(lookDir()), f0: 20, f1: 70, done() { W.mode = 'walk'; setFog(true); } };
    setWalkOnly(true); W.start = performance.now(); W.lastInput = performance.now(); W.warned = false;
    onWalkChange(true, source); track('walk_start', { source, spot: p.map((v) => Math.round(v)) });
  }
  function enterWalkEntrance(source) { enterWalk(0, 14.2, source); }
  function exitWalk(reason) {
    if (W.mode !== 'walk') return;
    if (W.inCave) { W.inCave = false; caveGroup.visible = false; W.pos.set(-10.2, 0, -13); }
    hideRing(); W.path = []; W.keys.clear(); setFog(false); W.spy = false; W.onTree = false; W.climb = null;
    S.tAz = S.az = Math.PI / 4; S.tZoom = S.zoom = 1; S.tFocus.copy(DEFAULT_FOCUS); S.focus.copy(DEFAULT_FOCUS); S.panelOpen = false;
    const D = (viewH / 2) / Math.tan(T.MathUtils.degToRad(10));
    W.mode = 'swoop'; W.swoop = { t: 0, dur: reduceMotion() ? 0.01 : 1.05, p0: pcam.position.clone(), p1: DEFAULT_FOCUS.clone().addScaledVector(isoDir(Math.PI / 4), D), t0: pcam.position.clone().add(lookDir()), t1: DEFAULT_FOCUS.clone(), f0: pcam.fov, f1: 20,
      done() { W.mode = 'off'; cam = camera; setWalkOnly(false); root.classList.remove('walking'); document.documentElement.classList.remove('walk-lock'); resize(); window.scrollTo(0, W.scrollY); updateCamera(1); S.dirty = true; } };
    onWalkChange(false, reason);
    track('walk_end', { reason, seconds: Math.round((performance.now() - W.start) / 1000), distance: Math.round(W.dist) });
  }
  function hideRing() { if (ring) ring.visible = false; }
  function hideCoach() { const c = document.getElementById('coach'); if (c) c.classList.add('gone'); }
  function fade(fn) { const f = document.getElementById('fade'); f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 60); }, 320); }
  function enterCave() {
    if (W.inCave) return;
    fade(() => { W.inCave = true; caveGroup.visible = true; W.pos.set(57.1, 0, 60); W.yaw = Math.PI / 2; W.pitch = 0.05; W.path = []; hideRing(); W.y = EYE; });
    walkSecret('cave', '✨ You’re inside the hidden cave! Tap the crystals… and maybe the bat.');
  }
  function leaveCave() { fade(() => { W.inCave = false; caveGroup.visible = false; W.pos.set(-9.9, 0, -13); W.yaw = Math.PI / 2; W.pitch = -0.05; W.path = []; W.caveCool = true; W.y = hAt(-9.9, -13) + EYE; }); }
  function climbTree() {
    const tx = 14, tz = 2.5; W.path = []; hideRing();
    W.climb = { t: 0, dur: reduceMotion() ? 0.01 : 1.6, from: new T.Vector3(W.pos.x, W.y, W.pos.z), to: new T.Vector3(tx - 0.6, 4.3 + EYE, tz), done() { W.onTree = true; W.yaw = -Math.PI / 2 + 0.3; W.pitch = -0.25; } };
    walkSecret('treehouse', '🌳 You climbed to the treehouse lookout! Try the spyglass.');
  }
  function climbDown() { W.spy = false; W.onTree = false; W.climb = { t: 0, dur: reduceMotion() ? 0.01 : 1.2, from: new T.Vector3(W.pos.x, W.y, W.pos.z), to: new T.Vector3(11.4, hAt(11.4, 2.5) + EYE, 2.5), done() { W.yaw = -Math.PI / 2; } }; }
  const secretsFound = new Set();
  function walkSecret(id, msg) { toast(msg); if (secretsFound.has(id)) return; secretsFound.add(id); track('walk_secret', { secret: id }); track('egg_found', { egg: id, location: 'walk' }); Sound.play('ding'); }
  function collectLF(id) {
    const g = LF.find((o) => o.userData.lf.id === id); if (!g || lfFound.has(id)) return;
    lfFound.add(id); g.visible = false; Sound.play('pop');
    const c = document.getElementById('lfCounter'); c.hidden = false; c.querySelector('b').textContent = lfFound.size; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    track('walk_secret', { secret: 'lostfound-' + id }); track('egg_found', { egg: 'lostfound-' + id, location: 'walk' });
    if (lfFound.size === LF.length) {
      toast('🎉 All 5 Lost & Found items returned! The Lost & Found box is celebrating!'); track('walk_secret', { secret: 'lostfound-all' }); Sound.play('toot');
      const cols = ['#FFD600', '#E53935', '#3FA9F5', '#9BE15D', '#FFFFFF', '#FB8C00'];
      for (let i = 0; i < 28; i++) { const b = new T.Mesh(BOX, new T.MeshBasicMaterial({ color: cols[i % cols.length] })); b.scale.setScalar(0.18); b.position.copy(lostBox); b.userData = { life: 2, v: new T.Vector3(rng() * 4 - 2, 4 + rng() * 4, rng() * 4 - 2) }; scene.add(b); burst.push(b); }
    } else toast(`📦 Found a ${g.userData.lf.name}! ${lfFound.size} of ${LF.length} Lost & Found items.`);
  }
  function walkAction(a, point) {
    // Actions that behave differently on foot. Returns true if handled.
    if (a === 'cavefloor') { const lp = point.clone(); walkTo(lp.x, lp.z); return true; }
    if (a === 'caveexit') { leaveCave(); return true; }
    if (a === 'crystal') { caveGroup.children.forEach((g) => { if (g.userData && 'pulse' in g.userData && g.position.clone().add(CAVE).distanceTo(point) < 1.4) g.userData.pulse = 1; }); Sound.play('ding'); return true; }
    if (a === 'bat') { if (bat.userData.fly <= 0) { bat.userData.fly = 2.6; bat.userData.a = 0; Sound.play('squeak'); toast('🦇 Flap flap! The bat did a lap around you and went back to sleep.'); } return true; }
    if (a === 'cave') { const d = Math.hypot(W.pos.x + 11.4, W.pos.z + 13); if (d < 3) enterCave(); else walkTo(-10.6, -13, enterCave); return true; }
    if (a === 'ladder') { if (W.onTree) return true; if (Math.hypot(W.pos.x - 11.4, W.pos.z - 2.5) < 2.2) climbTree(); else walkTo(11.4, 2.5, climbTree); return true; }
    if (a === 'geocache') { const go = () => { openGeocache(); walkSecret('geocache', '📦 You found the geocache at the end of the hidden trail!'); }; if (Math.hypot(W.pos.x + 5.5, W.pos.z + 15.5) < 2.6) go(); else walkTo(-4.6, -15.5, go); return true; }
    if (a === 'lostbox') { toast(lfFound.size ? `📦 Lost & Found box: ${lfFound.size} of ${LF.length} items returned.` : '📦 The Lost & Found box is empty… some campers lost things around camp!'); return true; }
    if (a.startsWith('lf:')) { collectLF(a.slice(3)); return true; }
    return false;
  }

  /* ---------- per-frame walk update ---------- */
  function walkUpdate(dt) {
    const now = performance.now();
    if (W.swoop) {
      const s = W.swoop; s.t = Math.min(1, s.t + dt / s.dur); const e = s.t < 0.5 ? 4 * s.t ** 3 : 1 - (-2 * s.t + 2) ** 3 / 2;
      pcam.position.lerpVectors(s.p0, s.p1, e); pcam.fov = s.f0 + (s.f1 - s.f0) * e; pcam.updateProjectionMatrix();
      pcam.lookAt(new T.Vector3().lerpVectors(s.t0, s.t1, e));
      if (s.t >= 1) { W.swoop = null; s.done(); }
      return;
    }
    const busy = !document.getElementById('panel').hidden || !document.getElementById('overlay').hidden;
    if (busy) { W.path = []; W.lastInput = now; hideRing(); }
    // keyboard
    const K = W.keys, turn = (K.has('arrowleft') || K.has('a') ? 1 : 0) - (K.has('arrowright') || K.has('d') ? 1 : 0);
    const fwdIn = (K.has('arrowup') || K.has('w') ? 1 : 0) - (K.has('arrowdown') || K.has('s') ? 1 : 0);
    if (turn) { W.yaw += turn * 1.6 * dt; W.lastLook = now; }
    if (K.has('pageup')) W.pitch = Math.min(0.6, W.pitch + dt); if (K.has('pagedown')) W.pitch = Math.max(-0.6, W.pitch - dt);
    if (W.climb) {
      const c = W.climb; c.t = Math.min(1, c.t + dt / c.dur); const e = c.t * c.t * (3 - 2 * c.t);
      const p = new T.Vector3().lerpVectors(c.from, c.to, e); W.pos.set(p.x, 0, p.z); W.y = p.y; if (c.t >= 1) { W.climb = null; c.done(); }
    } else if (fwdIn && !busy && !W.onTree) {
      W.path = []; hideRing(); W.speed = Math.min(WALK_SPEED, W.speed + dt * 4);
      const v = W.speed * dt * fwdIn, nx = W.pos.x + Math.sin(W.yaw) * v, nz = W.pos.z + Math.cos(W.yaw) * v;
      if (W.inCave && nx < 56.6) { leaveCave(); W.keys.clear(); }
      else { if (canStand(nx, W.pos.z)) W.pos.x = nx; if (canStand(W.pos.x, nz)) W.pos.z = nz; W.dist += Math.abs(v); }
      W.moved = true; hideCoach();
    } else if (W.path.length) {
      const [tx, tz] = W.path[0], dx = tx - W.pos.x, dz = tz - W.pos.z, d = Math.hypot(dx, dz);
      const remaining = d + W.path.slice(1).reduce((s, p, i, arr) => s + Math.hypot(p[0] - (i ? arr[i - 1][0] : tx), p[1] - (i ? arr[i - 1][1] : tz)), 0);
      W.speed = Math.min(WALK_SPEED, W.speed + dt * 4, Math.sqrt(2 * 3 * remaining) + 0.2);
      const step = Math.min(d, W.speed * dt);
      if (d < 0.05) { W.path.shift(); if (!W.path.length) { hideRing(); W.speed = 0; const fn = W.arrive; W.arrive = null; fn && fn(); } }
      else {
        W.pos.x += dx / d * step; W.pos.z += dz / d * step; W.dist += step;
        if (now - W.lastLook > 900) { let diff = Math.atan2(dx, dz) - W.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); W.yaw += Math.sign(diff) * Math.min(Math.abs(diff), 1.57 * dt); }
      }
    } else W.speed = 0;
    if (!W.climb && !W.onTree) W.y += (hAt(W.pos.x, W.pos.z) + EYE - W.y) * Math.min(1, dt * 8);
    pcam.position.set(W.pos.x, W.y, W.pos.z);
    const tf = W.spy ? 32 : 70; if (Math.abs(pcam.fov - tf) > 0.1) { pcam.fov += (tf - pcam.fov) * Math.min(1, dt * 5); pcam.updateProjectionMatrix(); }
    pcam.lookAt(pcam.position.clone().add(lookDir()));
    if (now - W.prox > 200) { W.prox = now; proximity(now); }
    if (now - W.mini > 120) { W.mini = now; drawMini(); }
    const idle = now - W.lastInput;
    if (idle > 50000 && !W.warned) { W.warned = true; toast('Still exploring? Heading back to the map soon…'); }
    if (idle < 50000) W.warned = false;
    if (idle > 60000) { closePanel(); exitWalk('idle'); }
  }
  const DOORS = { campfire: [0, 2.6, '🔥 Sit at the Campfire Ring'], gametent: [9.5, -2.8, '🎮 Go inside the Game Tent'], crafthut: [-8.9, -3.4, '🔨 Go inside the Craft Hut'], quartermaster: [8.7, 10.4, '🎒 Go inside the Quartermaster Cabin'] };
  function proximity(now) {
    const x = W.pos.x, z = W.pos.z; let prompt = [];
    if (W.inCave) prompt = [['🚪 Leave the cave', 'caveexit']];
    else if (W.onTree) prompt = [[W.spy ? '🔭 Put the spyglass away' : '🔭 Look through the spyglass', 'spy'], ['⬇ Climb down', 'down']];
    else {
      let best = null, bd = 4; Object.entries(DOORS).forEach(([id, [dx, dz, label]]) => { const d = Math.hypot(x - dx, z - dz); if (d < bd) { bd = d; best = [label, 'b:' + id]; } });
      labels.forEach((l) => l.el.classList.toggle('near', !!best && l.el.dataset.b === best[1].slice(2)));
      if (best) prompt.push(best);
      if (Math.hypot(x - 11.4, z - 2.5) < 2.5) prompt.push(['🪜 Climb the ladder', 'ladder']);
      if (Math.hypot(x + 5.5, z + 15.5) < 2.6) prompt.push(['📦 Open the geocache', 'geocache']);
      const cd = Math.hypot(x + 11.4, z + 13);
      if (cd < 1.5 && !W.caveCool) enterCave(); if (cd > 2.6) W.caveCool = false;
      if (raccoon.visible && raccoon.userData.mode === 'rummage' && Math.hypot(x - 4.2, z - 3.3) < 3.2) doAction('raccoon');
      if (now > W.sqCool && squirrel.userData.mode === 'idle' && squirrel.position.distanceTo(new T.Vector3(x, squirrel.position.y, z)) < 2.6) { W.sqCool = now + 6000; doAction('squirrel'); }
      if (now > W.fishCool && Math.hypot(x - POND[0], z - POND[1]) < POND_R + 2.4 && !fish.userData.jumping) { W.fishCool = now + 4000; fish.userData.t = fish.userData.next - 0.4; }
    }
    const k = prompt.map((p) => p[1]).join('|');
    if (k === W.promptKey) return; W.promptKey = k;
    const el = document.getElementById('walkPrompt'); el.innerHTML = '';
    prompt.forEach(([label, act]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn alt'; b.textContent = label;
      b.addEventListener('click', () => {
        W.lastInput = performance.now();
        if (act === 'spy') { W.spy = !W.spy; W.promptKey = ''; if (W.spy) track('camp_interact', { action: 'spyglass' }); }
        else if (act === 'down') climbDown();
        else if (act === 'caveexit') leaveCave();
        else if (act.startsWith('b:')) openBuilding(act.slice(2), { source: 'walk_prompt' });
        else walkAction(act, new T.Vector3(x, 0, z));
      });
      el.appendChild(b);
    });
  }
  /* ---------- mini-map ---------- */
  let miniBg;
  function drawMiniBg() {
    miniBg = document.createElement('canvas'); miniBg.width = miniBg.height = 144; const c = miniBg.getContext('2d'), s = 144 / (N * 2);
    for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) {
      const k = key(x, z), t = TYPE[k], h = H[k];
      c.fillStyle = t === 'water' ? '#3FA9F5' : t === 'sand' ? '#E8D49A' : t === 'path' ? '#D9B77A' : t === 'trail' ? '#A88F62' : BLOCK.has(k) ? '#2E6B34' : h > 0 ? '#5AA63A' : '#6DBE45';
      c.fillRect((x + N) * s, (z + N) * s, s + 0.5, s + 0.5);
    }
    BUILDINGS.forEach((b) => { const [x, z] = BLD[b.id]; c.fillStyle = SECTIONS[b.section].color; c.fillRect((x + N) * s - 8, (z + N) * s - 7, 16, 14); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect((x + N) * s - 8, (z + N) * s - 7, 16, 14); });
  }
  function drawMini() {
    const cv = document.querySelector('#miniMap canvas'); if (!cv) return; const c = cv.getContext('2d'), s = 144 / (N * 2);
    if (W.inCave) { c.fillStyle = '#2b2536'; c.fillRect(0, 0, 144, 144); c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('📍 In the cave', 72, 76); return; }
    c.drawImage(miniBg, 0, 0); const px = (W.pos.x + N) * s, pz = (W.pos.z + N) * s;
    c.save(); c.translate(px, pz); c.rotate(-W.yaw); c.fillStyle = '#E53935'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 9); c.lineTo(6, -6); c.lineTo(0, -3); c.lineTo(-6, -6); c.closePath(); c.fill(); c.stroke(); c.restore();
  }

  function init(container, opts) {
    root = container; stage = root.querySelector('#campStage'); labelsEl = root.querySelector('#campLabels'); tier = opts.tier;
    renderer = new T.WebGLRenderer({ antialias: tier === 'full', alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(tier === 'full' ? Math.min(2, devicePixelRatio) : 1);
    renderer.shadowMap.enabled = tier === 'full'; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    stage.appendChild(renderer.domElement); renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'A 3D voxel summer camp with a campfire, a game tent, a craft hut and a quartermaster cabin around a pond and trees. Use the Camp Map button for a list of everything here.');
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    hemi = new T.HemisphereLight('#fff', '#7a9a50', 0.95); scene.add(hemi);
    sun = new T.DirectionalLight('#fff', 0.85); sun.castShadow = tier === 'full';
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun);
    buildTerrain(); campfire(); gameTent(); craftHut(); quartermaster(); scenery(); walkWorld(); trees(); bakeVoxels(); water(); initSmoke();
    people(); critters(); weatherInit(); initWalk();
    PROMOS.forEach((p) => p.building && marker(p.building, SECTIONS[p.sec].color));
    makeLabels(); bindInput();
    setTime(opts.time === 'auto' ? autoTime() : opts.time);
    setWeather(opts.weather === 'auto' ? autoWeather() : opts.weather);
    if (opts.bigfoot || Math.random() < 0.05) summonBigfoot(true);
    new ResizeObserver(resize).observe(stage); resize();
    new IntersectionObserver((e) => { S.visible = e[0].isIntersecting; }).observe(root);
    updateCamera(1); requestAnimationFrame(loop);
    track('camp_ready', { tier, time: S.time, weather: S.weather, load_ms: Math.round(performance.now()) });
    return { time: S.time, weather: S.weather };
  }
  function summonBigfoot(quiet) { bigfoot.visible = true; bigfoot.userData.mode = 'peek'; bigfoot.userData.t = 0; if (!quiet) { toast('👀 Something big is moving at the treeline…'); resetView(); } }
  return {
    init, setTime, setWeather, focusBuilding, resetView, summonBigfoot, enterWalkEntrance, exitWalk,
    get isWalking() { return W.mode !== 'off'; },
    setPaused(p) { S.paused = p; S.dirty = true; },
    hotMarker(id, on) { if (markers[id]) { markers[id].hot = on; S.dirty = true; } },
    get tier() { return tier; }, get state() { return S; }
  };
})();
