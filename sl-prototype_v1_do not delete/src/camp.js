/* ============================================================
   CAMP SCOUT LIFE: 3D voxel diorama (vanilla Three.js r149)
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

  /* ---------- voxel helpers ---------- */
  function box(cx, y, cz, sx, sy, sz, c, action, ry) { voxels.push({ cx, y, cz, sx, sy, sz, c, ry: ry || 0 }); voxelActions.push(action || null); }
  function part(g, sx, sy, sz, x, y, z, c, m) { const me = new T.Mesh(BOX, m || mat(c)); me.scale.set(sx, sy, sz); me.position.set(x, y, z); me.castShadow = tier === 'full'; g.add(me); return me; }
  function clickable(obj, action) { obj.traverse((o) => { o.userData.action = action; }); clickables.push(obj); return obj; }

  /* ---------- terrain ---------- */
  const N = 18, H = {}, TYPE = {}, used = new Set();
  const key = (x, z) => x + ',' + z;
  const POND = [-9, 8.5], POND_R = 3.4;
  const BLD = { campfire: [0, 0], gametent: [9.5, -6], crafthut: [-9.5, -6], quartermaster: [9.5, 7.5] };
  const FLAT = [[-14, -13, 3.8], [12.5, -12.5, 3.2]];
  function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - t * dx, pz - az - t * dz); }
  const spokes = [[0, 6.5, 0, 18], [9.5, -3.2, 6.1, -2.25], [-8.9, -3.8, -6.0, -2.5], [8.7, 10.4, 4.35, 4.85], [-8, 6.6, -5.6, 3.4], [0, -6.5, 0, -8.5]];
  function buildTerrain() {
    for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) {
      const px = x + 0.5, pz = z + 0.5, d = Math.hypot(px, pz), edge = Math.max(Math.abs(px), Math.abs(pz));
      let h = 0, t = 'grass';
      const pd = Math.hypot(px - POND[0], pz - POND[1]);
      if (pd < POND_R) { h = -1; t = 'water'; }
      else if (pd < POND_R + 1.3) t = 'sand';
      else if (Math.abs(d - 6.5) < 0.85 || spokes.some((s) => segDist(px, pz, ...s) < 0.75)) t = 'path';
      if (t === 'grass' && edge > 14.5 && !(Math.abs(px) < 3 && pz > 0)) h = edge > 16 && rng() > 0.35 ? 2 : 1;
      if (t === 'grass' && edge > 13.5 && edge <= 14.5 && rng() > 0.7 && !(Math.abs(px) < 3 && pz > 0)) h = 1;
      if (FLAT.some(([fx, fz, fr]) => Math.hypot(px - fx, pz - fz) < fr)) h = Math.min(h, 0);
      H[key(x, z)] = h; TYPE[key(x, z)] = t;
    }
    const gc = ['#6DBE45', '#66B640', '#74C44B', '#62B23D'], pc = ['#D9B77A', '#CFAC6E', '#DDBD82'];
    for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) {
      const h = H[key(x, z)], t = TYPE[key(x, z)];
      const isEdge = x === -N || z === -N || x === N - 1 || z === N - 1;
      let nmin = h; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const v = H[key(x + a, z + b)]; if (v != null) nmin = Math.min(nmin, v); });
      const lo = isEdge ? -4 : Math.min(h, nmin) - 1;
      for (let k = lo + 1; k <= h; k++) {
        let c;
        if (k === h) c = t === 'water' ? '#E1C98D' : t === 'sand' ? '#E8D49A' : t === 'path' ? pc[(x * 7 + z * 3 & 7) % 3] : gc[(x * 5 + z * 11 & 15) % 4];
        else c = k < -2 ? '#6E6259' : (k + x + z) % 3 ? '#8B5A2B' : '#7A4B22';
        box(x + 0.5, k - 1, z + 0.5, 1, 1, 1, c);
      }
    }
  }
  function reserve(cx, cz, rx, rz) { for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) used.add(key(x, z)); }

  /* ---------- buildings ---------- */
  function campfire() {
    const [x, z] = BLD.campfire, A = 'b:campfire';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(x + Math.cos(a) * 1.5, 0, z + Math.sin(a) * 1.5, 0.6, 0.45, 0.6, i % 2 ? '#9E9E9E' : '#8A8A8A', A); }
    box(x, 0, z, 1.6, 0.12, 1.6, '#3a2a1a', A);
    box(x, 0.12, z, 1.4, 0.3, 0.35, '#6B3E1B', A, 0.5); box(x, 0.12, z, 1.4, 0.3, 0.35, '#7A4B22', A, -0.6);
    [[0, 3.3, 0], [3.3, 0, Math.PI / 2], [0, -3.3, 0], [-3.3, 0, Math.PI / 2]].forEach(([dx, dz, r], i) => { if (i === 0) return; box(x + dx, 0, z + dz, 2.4, 0.5, 0.6, '#8B5A2B', A, r); });
    // s'mores stick leaning on front log
    box(x + 1.2, 0.3, z + 2.6, 0.12, 0.12, 1.6, '#A0703C', 'smores', 0.6);
    box(x + 1.55, 0.35, z + 2.05, 0.3, 0.3, 0.3, '#FFFFFF', 'smores');
    // fire (animated)
    const fire = new T.Group(); fire.position.set(x, 0.3, z); scene.add(fire);
    const flames = [['#F26B21', 0.8, 0.9], ['#FFC629', 0.55, 0.7], ['#FFF6C2', 0.3, 0.45]].map(([c, s, h]) => part(fire, s, h, s, 0, h / 2, 0, null, new T.MeshBasicMaterial({ color: c })));
    flames.forEach((f) => (f.castShadow = false));
    clickable(fire, A);
    fireLight = new T.PointLight('#FF9A3C', 1.2, 14, 1.6); fireLight.position.set(x, 1.6, z); scene.add(fireLight);
    const sparks = Array.from({ length: tier === 'full' ? 8 : 4 }, () => { const s = part(scene, 0.1, 0.1, 0.1, x, 1, z, null, new T.MeshBasicMaterial({ color: '#FFD27A' })); s.castShadow = false; s.userData.v = rng(); return s; });
    anims.push((dt, t) => {
      flames.forEach((f, i) => { const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + (Math.random() - 0.5) * 0.08; f.scale.y = [0.9, 0.7, 0.45][i] * k; f.position.y = f.scale.y / 2; f.rotation.y = t * (0.6 + i); });
      fireLight.intensity = S.fireBase * (0.9 + Math.random() * 0.2);
      sparks.forEach((s) => { s.userData.v += dt * 0.6; if (s.userData.v > 1) { s.userData.v = 0; s.position.set(x + (Math.random() - 0.5) * 0.6, 0.8, z + (Math.random() - 0.5) * 0.6); } s.position.y = 0.8 + s.userData.v * 3.2; s.position.x += Math.sin(t * 3 + s.id) * 0.004; s.scale.setScalar(0.12 * (1 - s.userData.v)); });
    });
    smokeSource(x, 1.4, z, 0.6);
    reserve(x, z, 4, 4);
  }
  function gameTent() {
    const [x, z] = BLD.gametent, A = 'b:gametent';
    box(x, 0, z, 6.6, 0.15, 5.6, '#C9A66B', A);
    for (let i = 0; i < 4; i++) {
      const w = 6 - i * 1.5;
      for (let s = 0; s < 5; s++) box(x, 0.15 + i * 0.95, z - 2 + s, w, 0.95, 1, s % 2 ? '#FFFFFF' : '#E53935', A);
    }
    box(x, 0.15, z + 2.52, 1.4, 1.7, 0.08, '#2B1B3F', A);
    box(x, 3.95, z, 0.15, 2.2, 0.15, '#5B3A1E', A);
    const pen = new T.Mesh(new T.ConeGeometry(0.35, 1.2, 4), mat('#FFC629')); pen.rotation.z = -Math.PI / 2; pen.position.set(x + 0.65, 5.8, z); scene.add(pen);
    anims.push((dt, t) => { pen.rotation.x = Math.sin(t * 4) * 0.4; });
    const lights = []; for (let i = 0; i < 5; i++) { const m = new T.MeshBasicMaterial({ color: ['#FF2E93', '#00E5FF', '#FFE600', '#39FF14', '#FF2E93'][i] }); const l = part(scene, 0.16, 0.16, 0.16, x - 0.8 + i * 0.4, 1.95, z + 2.6, null, m); l.castShadow = false; lights.push(l); }
    anims.push((dt, t) => lights.forEach((l, i) => (l.visible = ((t * 4 | 0) + i) % 2 === 0)));
    reserve(x, z, 3.5, 3.2);
  }
  function craftHut() {
    const [x, z] = BLD.crafthut, A = 'b:crafthut';
    for (let r = 0; r < 4; r++) box(x, r * 0.75, z, 5, 0.75, 4, r % 2 ? '#B07D45' : '#A0703C', A);
    for (let i = 0; i < 4; i++) box(x, 3 + i * 0.5, z, 6 - i * 1.3, 0.5, 5 - i * 0.6, i % 2 ? '#6B3E1B' : '#7A4B22', A);
    box(x + 0.6, 0, z + 2.02, 1.1, 2, 0.1, '#4E2F12', A);
    const win = new T.MeshLambertMaterial({ color: '#FFE9A8', emissive: '#FFB84D', emissiveIntensity: 0 }); glowMats.push(win);
    const w1 = part(scene, 1.2, 0.9, 0.1, x - 1.2, 1.6, z + 2.03, null, win); w1.userData.action = A; clickables.push(w1);
    box(x + 3.2, 0, z + 2.5, 1.8, 0.9, 1, '#8B5A2B', A); box(x + 3.2, 0.9, z + 2.5, 2, 0.15, 1.2, '#A0703C', A);
    box(x + 2.8, 1.05, z + 2.5, 0.5, 0.5, 0.5, '#E53935', A); box(x + 2.8, 1.55, z + 2.5, 0.65, 0.12, 0.65, '#6B3E1B', A);
    box(x + 3.6, 1.05, z + 2.4, 0.15, 0.6, 0.15, '#9E9E9E', A);
    reserve(x, z, 4.5, 3.2);
  }
  function quartermaster() {
    const [x, z] = BLD.quartermaster, A = 'b:quartermaster';
    for (let r = 0; r < 5; r++) {
      const c = r % 2 ? '#7A4B22' : '#6B3E1B';
      box(x, r * 0.6, z, 6, 0.6, 4.4, c, A);
      [[-3.2, -2.4], [3.2, -2.4], [-3.2, 2.4], [3.2, 2.4]].forEach(([dx, dz]) => box(x + dx, r * 0.6 + 0.05, z + dz, 0.5, 0.5, 0.5, '#C08A52', A));
    }
    for (let i = 0; i < 4; i++) box(x, 3 + i * 0.5, z, 7 - i * 1.6, 0.5, 5.4 - i * 0.5, i % 2 ? '#2E7D32' : '#1F5C3A', A);
    box(x + 1.8, 3, z - 0.8, 0.8, 2.6, 0.8, '#8A8A8A', A);
    smokeSource(x + 1.8, 5.8, z - 0.8, 0.45);
    box(x - 0.8, 0, z + 2.22, 1.2, 2.1, 0.1, '#3B2410', A);
    box(x + 0.8, 0, z + 3.1, 3.6, 0.15, 1.6, '#A0703C', A);
    [['#E53935', 0], ['#3FA9F5', 0.5], ['#FFC629', 1]].forEach(([c, o]) => box(x + 1.2 + o, 0.15, z + 3.2, 0.45, 0.45, 0.45, c, A));
    box(x + 2.6, 0, z + 2.6, 0.15, 2.4, 0.15, '#C08A52', A); box(x + 2.6, 0, z + 2.6, 0.5, 0.6, 0.12, '#C08A52', A);
    const lm = new T.MeshLambertMaterial({ color: '#FFE08A', emissive: '#FFB84D', emissiveIntensity: 0 }); glowMats.push(lm);
    const lan = part(scene, 0.35, 0.45, 0.35, x - 1.8, 1.9, z + 2.5, null, lm); lan.userData.action = A; clickables.push(lan);
    reserve(x, z, 4, 3.6);
  }
  function scenery() {
    // Flagpole
    const fx = 0, fz = -9.5;
    box(fx, 0, fz, 1.2, 0.3, 1.2, '#9E9E9E'); box(fx, 0.3, fz, 0.18, 7, 0.18, '#DDD');
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 76; const c = cv.getContext('2d');
    c.fillStyle = '#1F5C3A'; c.fillRect(0, 0, 128, 76); c.fillStyle = '#FFC629'; c.fillRect(0, 52, 128, 10); c.font = 'bold 34px Georgia'; c.fillText('SL', 40, 42);
    const fg = new T.PlaneGeometry(2.4, 1.4, 10, 4); fg.translate(1.2, 0, 0);
    const flag = new T.Mesh(fg, new T.MeshLambertMaterial({ map: new T.CanvasTexture(cv), side: T.DoubleSide })); flag.position.set(fx + 0.1, 6.5, fz); scene.add(flag);
    const base = fg.attributes.position.array.slice();
    anims.push((dt, t) => { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const bx = base[i * 3]; p.setZ(i, Math.sin(bx * 2.2 - t * 5) * 0.18 * bx / 2.4); } p.needsUpdate = true; });
    reserve(fx, fz, 1, 1);
    // Entrance arch + sign posts
    box(-2.2, 0, 15.5, 0.5, 3.6, 0.5, '#6B3E1B'); box(2.2, 0, 15.5, 0.5, 3.6, 0.5, '#6B3E1B'); box(0, 3.4, 15.5, 5.4, 0.6, 0.5, '#8B5A2B');
    reserve(0, 15.5, 3, 1);
    // Archery range
    const ax = 12.5, az = -12.5;
    box(ax - 1.4, 0, az, 1.4, 0.8, 0.9, '#E2C35A', 'archery'); box(ax + 1.4, 0, az, 1.4, 0.8, 0.9, '#E2C35A', 'archery');
    [[2, '#FFFFFF'], [1.5, '#E53935'], [1, '#3FA9F5'], [0.5, '#FFC629']].forEach(([s, col], i) => box(ax, 0.8 + (2 - s) / 2, az + 0.1 + i * 0.05, s, s, 0.2, col, 'archery'));
    box(ax, 0, az + 0.3, 0.2, 0.8, 0.2, '#6B3E1B', 'archery');
    reserve(ax, az, 2.5, 1.5);
    // Hidden cave: rocky mound with a dark opening on its +x side
    const cx = -14, cz = -13;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const hh = 3 - Math.max(Math.abs(i), Math.abs(j)) + (rng() > 0.6 ? 1 : 0); for (let k = 0; k < hh; k++) { if (i === 2 && j === 0 && k < 2) continue; box(cx + i, k, cz + j, 1, 1, 1, (i + j + k) % 2 ? '#8A8A8A' : '#9E9E9E', 'cave'); } }
    box(cx + 1.6, 0, cz, 0.6, 1.8, 0.9, '#111318', 'cave');
    const cm = new T.MeshBasicMaterial({ color: '#B388FF' }); const crystal = part(scene, 0.22, 0.5, 0.22, cx + 2.1, 0.3, cz - 0.25, null, cm); crystal.userData.action = 'cave'; clickables.push(crystal);
    anims.push((dt, t) => cm.color.setHSL(0.75 + Math.sin(t * 2) * 0.05, 0.9, 0.7 + Math.sin(t * 3) * 0.1));
    reserve(cx, cz, 3, 3);
    // Trash can (raccoon spot) near the campfire
    box(4.2, 0, 3.3, 0.8, 1, 0.8, '#5F6B73', 'raccoon'); reserve(4.2, 3.3, 1, 1);
  }

  /* ---------- trees ---------- */
  const treeSpots = [];
  function trees() {
    const dens = tier === 'full' ? 1 : 0.55;
    for (let x = -N; x < N; x++) for (let z = -N; z < N; z++) {
      const k = key(x, z); if (TYPE[k] !== 'grass' || used.has(k)) continue;
      const px = x + 0.5, pz = z + 0.5, edge = Math.max(Math.abs(px), Math.abs(pz));
      const front = px + pz > 6 && edge < 14; // keep sightlines to buildings clear
      const p = (edge > 12.5 ? (front ? 0.18 : 0.33) : edge > 9.5 ? (front ? 0.01 : 0.05) : 0.01) * dens;
      if (rng() > p) continue;
      let near = false; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (used.has('t' + key(x + a, z + b))) near = true;
      if (near) continue;
      used.add('t' + k); treeSpots.push([px, pz, H[k]]);
      tree(px, H[k], pz, rng() > 0.45);
    }
  }
  function tree(x, y, z, pine) {
    box(x, y, z, 0.7, pine ? 1.6 : 2, 0.7, '#6B3E1B');
    if (pine) { const g = ['#1F5C3A', '#24693F', '#1B5233'][rng() * 3 | 0]; [[3, 1.4], [2.4, 2.4], [1.6, 3.3], [0.8, 4.1]].forEach(([s, yy]) => box(x, y + yy, z, s, 0.95, s, g)); }
    else { const g = ['#4E9F3D', '#5AAE45', '#3E8E36'][rng() * 3 | 0]; box(x, y + 1.8, z, 2.8, 1.8, 2.8, g); box(x, y + 3.6, z, 1.8, 0.9, 1.8, g); }
  }

  /* ---------- water ---------- */
  function water() {
    const cells = Object.keys(TYPE).filter((k) => TYPE[k] === 'water');
    waterMesh = new T.InstancedMesh(BOX, new T.MeshLambertMaterial({ color: '#3FA9F5', transparent: true, opacity: 0.82 }), cells.length);
    const m = new T.Matrix4();
    cells.forEach((k, i) => { const [x, z] = k.split(',').map(Number); m.makeScale(1, 0.75, 1).setPosition(x + 0.5, -0.62, z + 0.5); waterMesh.setMatrixAt(i, m); });
    scene.add(waterMesh); waterMesh.receiveShadow = tier === 'full';
    anims.push((dt, t) => { waterMesh.material.color.setHSL(0.56, 0.85, 0.6 + Math.sin(t * 1.5) * 0.02); });
  }

  /* ---------- static voxel batch ---------- */
  function bakeVoxels() {
    staticMesh = new T.InstancedMesh(BOX, new T.MeshLambertMaterial({ color: '#fff' }), voxels.length);
    const m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color(), up = new T.Vector3(0, 1, 0);
    voxels.forEach((v, i) => {
      q.setFromAxisAngle(up, v.ry);
      m.compose(new T.Vector3(v.cx, v.y + v.sy / 2, v.cz), q, new T.Vector3(v.sx, v.sy, v.sz));
      staticMesh.setMatrixAt(i, m); staticMesh.setColorAt(i, c.set(v.c));
    });
    staticMesh.castShadow = staticMesh.receiveShadow = tier === 'full';
    staticMesh.userData.instanceActions = voxelActions;
    scene.add(staticMesh); clickables.push(staticMesh);
  }

  /* ---------- smoke ---------- */
  const smokes = [];
  function smokeSource(x, y, z, rate) { smokes.push({ x, y, z, rate, acc: 0, pool: [] }); }
  function initSmoke() {
    smokes.forEach((s) => {
      for (let i = 0; i < (tier === 'full' ? 7 : 4); i++) { const m = part(scene, 0.4, 0.4, 0.4, s.x, -10, s.z, null, new T.MeshLambertMaterial({ color: '#DDDDDD', transparent: true, opacity: 0 })); m.castShadow = false; m.userData.life = 1; s.pool.push(m); }
      anims.push((dt) => {
        s.acc += dt; if (s.acc > s.rate) { s.acc = 0; const p = s.pool.find((q) => q.userData.life >= 1); if (p) { p.userData.life = 0; p.position.set(s.x, s.y, s.z); } }
        s.pool.forEach((p) => { if (p.userData.life >= 1) return; p.userData.life += dt / 3; p.position.y += dt * 1.1; p.position.x -= dt * 0.35; p.scale.setScalar(0.35 + p.userData.life * 0.7); p.material.opacity = 0.7 * (1 - p.userData.life); p.rotation.y += dt; });
      });
    });
  }

  /* ---------- people & critters ---------- */
  const skin = ['#F1C27D', '#C68642', '#8D5524', '#FFDBAC', '#E0AC69'];
  function scout(shirt, cap) {
    const g = new T.Group(), sk = skin[rng() * skin.length | 0];
    const l1 = part(g, 0.2, 0.45, 0.22, -0.12, 0.225, 0, '#2F4F2F'), l2 = part(g, 0.2, 0.45, 0.22, 0.12, 0.225, 0, '#2F4F2F');
    part(g, 0.52, 0.5, 0.3, 0, 0.7, 0, shirt); part(g, 0.2, 0.16, 0.04, 0, 0.88, 0.16, '#C62828');
    const a1 = part(g, 0.14, 0.45, 0.14, -0.33, 0.7, 0, shirt), a2 = part(g, 0.14, 0.45, 0.14, 0.33, 0.7, 0, shirt);
    part(g, 0.38, 0.38, 0.38, 0, 1.14, 0, sk); part(g, 0.42, 0.12, 0.42, 0, 1.36, 0, cap); part(g, 0.2, 0.06, 0.18, 0, 1.33, 0.26, cap);
    g.userData = { l1, l2, a1, a2 }; scene.add(g); return g;
  }
  function people() {
    const n = tier === 'full' ? 4 : 2, shirts = ['#C9A36B', '#1E4FA0', '#C9A36B', '#1E4FA0'], caps = ['#1F5C3A', '#FFC629', '#C62828', '#1E4FA0'];
    for (let i = 0; i < n; i++) {
      const g = scout(shirts[i], caps[i]); const off = i / n * Math.PI * 2, sp = (0.12 + i * 0.02) * (i % 2 ? 1 : -1);
      anims.push((dt, t) => { const a = off + t * sp; g.position.set(Math.cos(a) * 6.5, 0, Math.sin(a) * 6.5); g.rotation.y = -a + (sp > 0 ? 0 : Math.PI); const s = Math.sin(t * 8 + i); g.userData.l1.rotation.x = s * 0.5; g.userData.l2.rotation.x = -s * 0.5; g.userData.a1.rotation.x = -s * 0.4; g.userData.a2.rotation.x = s * 0.4; });
    }
    [[3.3, 0, -Math.PI / 2], [-3.3, 0.5, Math.PI / 2], [0.4, -3.3, 0]].slice(0, tier === 'full' ? 3 : 2).forEach(([x, z, r], i) => {
      const g = scout(shirts[i + 1], caps[i + 1]); g.position.set(x, 0.3, z); g.rotation.y = r; g.userData.l1.rotation.x = g.userData.l2.rotation.x = -1.4; g.userData.l1.position.z = g.userData.l2.position.z = 0.15;
      anims.push((dt, t) => { g.userData.a1.rotation.x = -0.6 + Math.sin(t * 2 + i) * 0.15; g.position.y = 0.3 + Math.abs(Math.sin(t * 3 + i * 2)) * 0.02; });
    });
  }
  let raccoon, lid, lidClosed = false, fish, bigfoot, squirrel, owl;
  function critters() {
    // Raccoon in the trash can
    raccoon = new T.Group(); part(raccoon, 0.5, 0.4, 0.75, 0, 0.2, 0, '#7D7D7D'); part(raccoon, 0.42, 0.36, 0.36, 0, 0.42, 0.45, '#8C8C8C');
    part(raccoon, 0.44, 0.1, 0.1, 0, 0.46, 0.62, '#222'); part(raccoon, 0.12, 0.12, 0.08, 0, 0.36, 0.66, '#222');
    [0, 1, 2].forEach((i) => part(raccoon, 0.18, 0.18, 0.2, 0, 0.3 + i * 0.02, -0.45 - i * 0.2, i % 2 ? '#333' : '#9A9A9A'));
    part(raccoon, 0.12, 0.12, 0.06, -0.14, 0.64, 0.42, '#555'); part(raccoon, 0.12, 0.12, 0.06, 0.14, 0.64, 0.42, '#555');
    raccoon.position.set(4.2, 0.85, 3.3); raccoon.rotation.x = -0.9; scene.add(raccoon); clickable(raccoon, 'raccoon');
    raccoon.userData = { mode: 'rummage', t: 0 };
    lid = part(scene, 0.9, 0.12, 0.9, 4.2, 1.06, 3.3, '#7B8790'); lid.rotation.z = 0.9; lid.position.x = 4.65; clickable(lid, 'lid');
    anims.push((dt, t) => {
      const r = raccoon.userData; r.t += dt;
      if (r.mode === 'rummage') { raccoon.position.y = 0.85 + Math.abs(Math.sin(t * 5)) * 0.12; raccoon.rotation.z = Math.sin(t * 7) * 0.15; }
      else if (r.mode === 'freeze') { if (r.t > 1) { r.mode = 'run'; r.t = 0; raccoon.rotation.set(0, Math.PI * 0.85, 0); } }
      else if (r.mode === 'run') { raccoon.position.x -= dt * 4; raccoon.position.z -= dt * 6; raccoon.position.y = Math.abs(Math.sin(r.t * 14)) * 0.15; if (r.t > 2.5) { r.mode = 'gone'; r.t = 0; raccoon.visible = false; } }
      else if (r.mode === 'gone' && r.t > 18 && !lidClosed) { r.mode = 'rummage'; raccoon.visible = true; raccoon.position.set(4.2, 0.85, 3.3); raccoon.rotation.set(-0.9, 0, 0); }
    });
    // Fish
    fish = new T.Group(); part(fish, 0.22, 0.3, 0.55, 0, 0, 0, '#F26B21'); part(fish, 0.06, 0.3, 0.25, 0, 0, -0.38, '#FFC629'); part(fish, 0.24, 0.08, 0.08, 0, 0.05, 0.22, '#222');
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
    // Squirrel on a tree near the path
    const st = treeSpots.find((s) => Math.hypot(s[0] + 4, s[1] - 11) < 6) || treeSpots[0];
    squirrel = new T.Group(); part(squirrel, 0.22, 0.25, 0.35, 0, 0.12, 0, '#A0522D'); part(squirrel, 0.2, 0.2, 0.2, 0, 0.3, 0.2, '#A0522D'); part(squirrel, 0.18, 0.5, 0.14, 0, 0.35, -0.22, '#C0703D');
    squirrel.position.set(st[0] + 0.45, st[2] + 1.0, st[1] + 0.45); scene.add(squirrel); clickable(squirrel, 'squirrel');
    squirrel.userData = { home: squirrel.position.clone(), mode: 'idle', t: 0 };
    const otherTree = treeSpots.filter((s) => s !== st).sort((a, b) => Math.hypot(a[0] - st[0], a[1] - st[1]) - Math.hypot(b[0] - st[0], b[1] - st[1]))[0];
    anims.push((dt, t) => {
      const q = squirrel.userData; q.t += dt;
      if (q.mode === 'idle') { squirrel.rotation.y = Math.sin(t * 1.3) * 0.6; squirrel.children[2].rotation.x = Math.sin(t * 6) * 0.2; }
      if (q.mode === 'run') { const p = Math.min(1, q.t / 1.6); const tgt = q.to; squirrel.position.lerpVectors(q.from, tgt, p); squirrel.position.y = q.from.y + Math.sin(p * Math.PI) * 0.6 - (p < 0.5 ? p : 1 - p) * 1.2; if (p >= 1) { q.mode = 'idle'; } }
    });
    squirrel.userData.other = new T.Vector3(otherTree[0] + 0.45, otherTree[2] + 1.0, otherTree[1] + 0.45);
    // Night owl
    owl = new T.Group(); part(owl, 0.45, 0.55, 0.4, 0, 0.27, 0, '#8D6E63');
    const head = new T.Group(); head.position.y = 0.7; owl.add(head); part(head, 0.45, 0.35, 0.4, 0, 0, 0, '#A1887F');
    part(head, 0.14, 0.14, 0.05, -0.1, 0.02, 0.21, '#FFF59D'); part(head, 0.14, 0.14, 0.05, 0.1, 0.02, 0.21, '#FFF59D'); part(head, 0.06, 0.06, 0.06, -0.1, 0.02, 0.24, '#111'); part(head, 0.06, 0.06, 0.06, 0.1, 0.02, 0.24, '#111');
    const ot = treeSpots.find((s) => s[0] < -10 && Math.abs(s[1]) < 6) || treeSpots[1];
    owl.position.set(ot[0] + 0.5, ot[2] + 3.6, ot[1] + 1.2); scene.add(owl); clickable(owl, 'owl'); nightOnly.push(owl); owl.userData.head = head;
    // Bigfoot (rare)
    bigfoot = new T.Group(); part(bigfoot, 1.1, 1.4, 0.7, 0, 1.6, 0, '#5D4037'); part(bigfoot, 0.35, 0.9, 0.4, -0.3, 0.45, 0, '#4E342E'); part(bigfoot, 0.35, 0.9, 0.4, 0.3, 0.45, 0, '#4E342E');
    part(bigfoot, 0.7, 0.7, 0.6, 0, 2.6, 0.05, '#5D4037'); part(bigfoot, 0.45, 0.3, 0.1, 0, 2.55, 0.36, '#A1887F'); part(bigfoot, 0.08, 0.08, 0.05, -0.12, 2.7, 0.37, '#111'); part(bigfoot, 0.08, 0.08, 0.05, 0.12, 2.7, 0.37, '#111');
    const arm = new T.Group(); arm.position.set(0.7, 2.2, 0); bigfoot.add(arm); part(arm, 0.3, 1.1, 0.3, 0, -0.5, 0, '#4E342E'); bigfoot.userData = { arm, mode: 'off', t: 0 };
    part(bigfoot, 0.3, 1.1, 0.3, -0.7, 1.7, 0, '#4E342E');
    bigfoot.position.set(-15.5, H[key(-16, 2)] || 1, 2.5); bigfoot.rotation.y = Math.PI / 3; bigfoot.visible = false; scene.add(bigfoot); clickable(bigfoot, 'bigfoot');
    anims.push((dt, t) => {
      const b = bigfoot.userData; if (b.mode === 'off') return; b.t += dt;
      if (b.mode === 'peek') { const s = Math.max(0, Math.sin(b.t * 0.9)); bigfoot.position.x = -16.2 + s * 1.6; if (b.t > 40) { b.mode = 'off'; bigfoot.visible = false; } }
      if (b.mode === 'wave') { b.arm.rotation.z = Math.PI * 0.8 + Math.sin(b.t * 10) * 0.4; if (b.t > 2) { b.mode = 'leave'; b.t = 0; } }
      if (b.mode === 'leave') { bigfoot.position.x -= dt * 2; bigfoot.position.y -= dt * 0.6; if (b.t > 1.5) { b.mode = 'off'; bigfoot.visible = false; footprints(); } }
    });
    // Birds
    for (let i = 0; i < (tier === 'full' ? 3 : 2); i++) {
      const b = new T.Group(); part(b, 0.25, 0.2, 0.45, 0, 0, 0, '#37474F'); const w1 = part(b, 0.6, 0.06, 0.25, -0.38, 0, 0, '#455A64'), w2 = part(b, 0.6, 0.06, 0.25, 0.38, 0, 0, '#455A64');
      scene.add(b); const r = 9 + i * 3, sp = 0.25 + i * 0.07, off = i * 2;
      anims.push((dt, t) => { const a = t * sp + off; b.position.set(Math.cos(a) * r, 10 + i * 1.5 + Math.sin(t + i) * 0.5, Math.sin(a) * r); b.rotation.y = -a; const f = Math.sin(t * 12 + i) * 0.6; w1.rotation.z = f; w2.rotation.z = -f; });
    }
    // Fireflies (dusk/night)
    const n = tier === 'full' ? 40 : 18, pos = new Float32Array(n * 3), seeds = Array.from({ length: n }, () => [rng() * 30 - 15, rng() * 30 - 15, rng() * 6]);
    const fg = new T.BufferGeometry(); fg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const ff = new T.Points(fg, new T.PointsMaterial({ color: '#FFF59D', size: 4, sizeAttenuation: false, transparent: true }));
    scene.add(ff); duskNight.push(ff);
    anims.push((dt, t) => { if (!ff.visible) return; seeds.forEach(([x, z, s], i) => { pos[i * 3] = x + Math.sin(t * 0.5 + s) * 1.5; pos[i * 3 + 1] = 1 + Math.sin(t * 0.8 + s * 2) * 0.8 + 0.8; pos[i * 3 + 2] = z + Math.cos(t * 0.4 + s) * 1.5; }); fg.attributes.position.needsUpdate = true; ff.material.opacity = 0.6 + Math.sin(t * 6) * 0.4; });
  }
  const ripples = [];
  function ripple(x, z, big = 1) {
    let r = ripples.find((q) => q.userData.life >= 1);
    if (!r) { if (ripples.length > 8) return; r = new T.Mesh(new T.RingGeometry(0.3, 0.42, 20), new T.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, side: T.DoubleSide })); r.rotation.x = -Math.PI / 2; scene.add(r); ripples.push(r); }
    r.userData = { life: 0, big }; r.position.set(x, -0.22, z);
  }
  function footprints() { for (let i = 0; i < 6; i++) { const f = part(scene, 0.35, 0.03, 0.6, -14 + i * 1.1, (H[key(-14 + i, 3)] || 0) + 0.02, 3 + (i % 2) * 0.6, '#3E2723'); f.castShadow = false; } }
  anims.push((dt) => ripples.forEach((r) => { if (r.userData.life >= 1) { r.visible = false; return; } r.visible = true; r.userData.life += dt / 1.4; r.scale.setScalar(1 + r.userData.life * 3 * r.userData.big); r.material.opacity = 0.8 * (1 - r.userData.life); }));

  /* ---------- weather ---------- */
  let clouds = [], rain, rainbow;
  function weatherInit() {
    for (let i = 0; i < 4; i++) {
      const g = new T.Group(), m = new T.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85 });
      for (let j = 0; j < 6; j++) part(g, 2 + rng() * 2, 1 + rng(), 2 + rng() * 2, rng() * 4 - 2, rng() * 0.8, rng() * 3 - 1.5, null, m).castShadow = tier === 'full';
      g.position.set(rng() * 36 - 18, 19 + rng() * 3, -14 - rng() * 8); g.userData.m = m; scene.add(g); clouds.push(g);
    }
    anims.push((dt) => clouds.forEach((c, i) => { if (!c.visible) return; c.position.x += dt * (0.6 + i * 0.15); if (c.position.x > 24) c.position.x = -24; }));
    const n = tier === 'full' ? 700 : 260, rp = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = rng() * 36 - 18, y = rng() * 16, z = rng() * 36 - 18; rp.set([x, y, z, x - 0.05, y - 0.6, z], i * 6); }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
    rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#CFE8FF', transparent: true, opacity: 0.6 })); scene.add(rain);
    anims.push((dt) => { if (!rain.visible) return; for (let i = 0; i < n; i++) { let y = rp[i * 6 + 1] - dt * 18; if (y < 0) { y += 16; if (Math.hypot(rp[i * 6] - POND[0], rp[i * 6 + 2] - POND[1]) < POND_R && rng() > 0.6) ripple(rp[i * 6], rp[i * 6 + 2], 0.4); } rp[i * 6 + 1] = y; rp[i * 6 + 4] = y - 0.6; } rg.attributes.position.needsUpdate = true; });
    const cols = ['#E53935', '#FB8C00', '#FFD600', '#43A047', '#1E88E5', '#7E57C2'];
    let cnt = 0; const pts = []; cols.forEach((c, b) => { const R = 19 - b * 0.9; for (let a = 0; a <= Math.PI; a += 0.9 / R) { pts.push([R, a, c]); cnt++; } });
    rainbow = new T.InstancedMesh(BOX, new T.MeshBasicMaterial({ transparent: true, opacity: 0.75 }), cnt);
    const m4 = new T.Matrix4(), col = new T.Color(), rv = new T.Vector3(1, 0, -1).normalize(), cen = new T.Vector3(-11, -2, -11);
    pts.forEach(([R, a, c], i) => { const p = cen.clone().addScaledVector(rv, Math.cos(a) * R).add(new T.Vector3(0, Math.sin(a) * R, 0)); m4.makeScale(0.9, 0.9, 0.9).setPosition(p); rainbow.setMatrixAt(i, m4); rainbow.setColorAt(i, col.set(c)); });
    scene.add(rainbow);
  }
  function setWeather(w) {
    S.weather = w;
    clouds.forEach((c, i) => { c.visible = w !== 'clear' && w !== 'rainbow' ? true : i < 1; c.userData.m.color.set(w === 'rain' ? '#9AA5B1' : '#FFFFFF'); });
    rain.visible = w === 'rain'; rainbow.visible = w === 'rainbow';
    root.classList.toggle('w-rain', w === 'rain'); S.dirty = true; applyLight();
  }

  /* ---------- day / night ---------- */
  const LOOK = {
    morning: { sky: '#FFD9B0', gnd: '#6B8F3A', hi: 0.85, sun: '#FFB37A', si: 0.85, sp: [20, 10, 14], fire: 0.7, glow: 0.2 },
    day: { sky: '#FFFFFF', gnd: '#7A9A50', hi: 0.95, sun: '#FFF4E0', si: 0.85, sp: [12, 24, 16], fire: 0.5, glow: 0 },
    dusk: { sky: '#E0A0B8', gnd: '#4A4A38', hi: 0.7, sun: '#FF9A5A', si: 0.6, sp: [-20, 8, 10], fire: 1.8, glow: 0.9 },
    night: { sky: '#7C8CD0', gnd: '#2A3040', hi: 0.6, sun: '#A9BCFF', si: 0.35, sp: [-10, 20, -6], fire: 2.6, glow: 1.2 }
  };
  function setTime(t) {
    S.time = t; root.classList.remove('t-morning', 't-day', 't-dusk', 't-night'); root.classList.add('t-' + t); applyLight();
    nightOnly.forEach((o) => (o.visible = t === 'night')); duskNight.forEach((o) => (o.visible = t === 'night' || t === 'dusk'));
    raccoon && (raccoon.userData.t = raccoon.userData.mode === 'gone' ? 99 : raccoon.userData.t);
    S.dirty = true;
  }
  function applyLight() {
    if (!hemi) return; const L = LOOK[S.time], wet = S.weather === 'rain';
    hemi.color.set(L.sky); hemi.groundColor.set(L.gnd); hemi.intensity = L.hi * (wet ? 0.85 : 1);
    sun.color.set(L.sun); sun.intensity = L.si * (wet ? 0.5 : 1); sun.position.set(...L.sp);
    S.fireBase = L.fire; glowMats.forEach((m) => (m.emissiveIntensity = L.glow));
  }
  const autoTime = () => { const h = new Date().getHours(); return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night'; };
  const autoWeather = () => { const r = Math.random(); return r < 0.55 ? 'clear' : r < 0.8 ? 'clouds' : r < 0.92 ? 'rain' : 'rainbow'; };

  /* ---------- markers (promo ↔ building) ---------- */
  const markers = {};
  function marker(id, color) {
    const [x, z] = BLD[id], g = new T.Group();
    const lm = new T.MeshBasicMaterial({ color: '#FFE08A' });
    part(g, 0.5, 0.6, 0.5, 0, 0, 0, null, lm).castShadow = false; part(g, 0.6, 0.1, 0.6, 0, 0.35, 0, '#4E2F12'); part(g, 0.6, 0.1, 0.6, 0, -0.35, 0, '#4E2F12');
    part(g, 0.06, 0.8, 0.06, 0, 0.8, 0, '#4E2F12'); const fl = part(g, 0.7, 0.4, 0.05, 0.38, 1.0, 0, color);
    const top = { campfire: 3.4, gametent: 6.8, crafthut: 6, quartermaster: 6 }[id];
    g.position.set(x + (id === 'campfire' ? 1.8 : -1.6), top, z); scene.add(g); clickable(g, 'marker:' + id);
    markers[id] = { g, boost: 0 };
    anims.push((dt, t) => { const mk = markers[id]; mk.boost = Math.max(0, mk.boost - dt); g.position.y = top + Math.sin(t * 2 + x) * 0.25 + (mk.hot ? Math.abs(Math.sin(t * 8)) * 0.9 : 0); g.rotation.y = t * 0.6; });
  }

  /* ---------- labels (wooden signs = buttons; hidden buttons for critters) ---------- */
  function addLabel(el, pos, obj) { labelsEl.appendChild(el); labels.push({ el, pos, obj }); }
  function makeLabels() {
    BUILDINGS.forEach((b) => {
      const el = document.createElement('button'); el.className = 'sign'; el.type = 'button'; el.style.setProperty('--c', SECTIONS[b.section].color);
      el.innerHTML = `${b.icon} ${b.name}`; el.setAttribute('aria-label', `Open ${b.name}: ${SECTIONS[b.section].name}`);
      el.addEventListener('click', () => openBuilding(b.id, { source: 'sign' }));
      const [x, z] = BLD[b.id], y = { campfire: 2.2, gametent: 5.2, crafthut: 5.2, quartermaster: 5.4 }[b.id];
      addLabel(el, new T.Vector3(x, y, z + (b.id === 'campfire' ? 0 : 1)));
    });
    [['raccoon', 'Trash can (something’s rummaging)', [4.2, 1.4, 3.3]], ['fish', 'Pond (watch for jumping fish)', [POND[0], 0.4, POND[1]]], ['squirrel', 'Squirrel in a tree', null, () => squirrel],
      ['owl', 'Owl in a tree', null, () => owl], ['smores', 'S’mores stick: toast a marshmallow', [1.5, 0.6, 2.2]], ['archery', 'Archery range', [12.5, 1.4, -12.5]], ['cave', 'Rocky hill (hollow?)', [-12.5, 2, -13]], ['bigfoot', 'Big hairy shape at the treeline', null, () => bigfoot]]
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
      if (o) { if (!o.visible) { l.el.hidden = true; return; } o.getWorldPosition(v3); l.el.hidden = false; }
      else v3.copy(l.pos);
      v3.project(camera);
      l.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px,${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%,${l.el.classList.contains('sign') ? '-100%' : '-50%'})`;
    });
  }

  /* ---------- interaction ---------- */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(clickables.filter((c) => c.visible), true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      if (h.object === staticMesh) { const a = voxelActions[h.instanceId]; if (a) return a; continue; }
      if (h.object.userData.action) return h.object.userData.action;
    }
    return null;
  }
  function doAction(a) {
    if (!a) return;
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
      if (ptrs.size === 1) { down = { x: e.clientX, y: e.clientY, az: S.tAz, f: S.tFocus.clone(), type: e.pointerType }; moved = 0; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = S.tZoom; }
    });
    cv.addEventListener('pointermove', (e) => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; S.tZoom = clampZoom(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0); moved = 99; return; }
      if (down && ptrs.size === 1) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y; moved = Math.max(moved, Math.hypot(dx, dy));
        if (moved > 6) {
          cv.classList.add('dragging');
          S.tAz = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, down.az - dx * 0.006));
          if (down.type === 'mouse' && !S.panelOpen) { const f = fwd(S.tAz); S.tFocus.copy(down.f).addScaledVector(f, dy * 0.04 / S.zoom); clampFocus(); }
          if (!S.rotatedOnce) { S.rotatedOnce = true; track('camp_interact', { action: 'rotate' }); }
        }
      } else if (e.pointerType === 'mouse' && performance.now() - lastHover > 90) { lastHover = performance.now(); cv.classList.toggle('hot', !!pick(e.clientX, e.clientY)); }
    });
    const up = (e) => {
      ptrs.delete(e.pointerId); cv.classList.remove('dragging');
      if (down && moved < 6 && e.type === 'pointerup') { const a = pick(e.clientX, e.clientY); if (a) { doAction(a); track('camp_interact', { action: 'tap', target: a }); } }
      if (ptrs.size === 0) down = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      if (!S.active) { hint('Click the camp first to zoom with your mouse wheel'); return; }
      e.preventDefault(); S.tZoom = clampZoom(S.tZoom * Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    document.addEventListener('pointerdown', (e) => { if (!root.contains(e.target)) S.active = false; });
    root.addEventListener('keydown', (e) => {
      if (e.target.closest('.panel,.overlay,input,select')) return;
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
    camera.left = -viewH * asp / 2; camera.right = viewH * asp / 2; camera.top = viewH / 2; camera.bottom = -viewH / 2; camera.updateProjectionMatrix(); S.dirty = true;
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
    updateCamera(tier === 'lite' ? dt * 2 : dt);
    const animate = !S.paused;
    if (animate) { tAcc += tier === 'lite' ? dt * 2 : dt; anims.forEach((f) => f(tier === 'lite' ? dt * 2 : dt, tAcc)); if (owl.userData.spin) { owl.userData.spin = Math.max(0, owl.userData.spin - dt * 0.6); owl.userData.head.rotation.y = Math.sin((1 - owl.userData.spin) * Math.PI * 2) * 2.2; } }
    if (animate || S.dirty) { renderer.render(scene, camera); updateLabels(); S.dirty = false; }
    fpsFrames++; fpsTime += dt;
    if (fpsTime > 3) { const fps = fpsFrames / fpsTime * (tier === 'lite' ? 2 : 1); fpsFrames = 0; fpsTime = 0; if (fps < 24 && animate) slow++; else slow = 0; if (slow >= 2) { slow = 0; stepDown(); } }
  }
  function stepDown() {
    if (tier === 'full') { tier = 'lite'; renderer.shadowMap.enabled = false; renderer.setPixelRatio(1); scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); track('camp_tier_change', { from: 'full', to: 'lite' }); }
    else if (tier === 'lite') { track('camp_tier_change', { from: 'lite', to: 'static' }); goStatic(); }
  }

  function init(container, opts) {
    root = container; stage = root.querySelector('#campStage'); labelsEl = root.querySelector('#campLabels'); tier = opts.tier;
    renderer = new T.WebGLRenderer({ antialias: tier === 'full', alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(tier === 'full' ? Math.min(2, devicePixelRatio) : 1);
    renderer.shadowMap.enabled = tier === 'full'; renderer.shadowMap.type = T.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement); renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'A 3D voxel summer camp with a campfire, a game tent, a craft hut and a quartermaster cabin around a pond and trees. Use the Camp Map button for a list of everything here.');
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    hemi = new T.HemisphereLight('#fff', '#7a9a50', 0.95); scene.add(hemi);
    sun = new T.DirectionalLight('#fff', 0.85); sun.castShadow = tier === 'full';
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 }); sun.shadow.bias = -0.0015; scene.add(sun);
    buildTerrain(); campfire(); gameTent(); craftHut(); quartermaster(); scenery(); trees(); bakeVoxels(); water(); initSmoke();
    people(); critters(); weatherInit();
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
    init, setTime, setWeather, focusBuilding, resetView, summonBigfoot,
    setPaused(p) { S.paused = p; S.dirty = true; },
    hotMarker(id, on) { if (markers[id]) { markers[id].hot = on; S.dirty = true; } },
    get tier() { return tier; }, get state() { return S; }
  };
})();
