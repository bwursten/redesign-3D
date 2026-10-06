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
  const FLAT = [[-14, -13, 3.8], [12.5, -12.5, 3.2], [14, 2.5, 2.4]];
  const TRAIL = [[9.5, -10.5, 9.5, -14.5], [9.5, -14.5, 5, -15.5], [5, -15.5, -5.5, -15.5]];
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
      if (t === 'grass' && TRAIL.some((s) => segDist(px, pz, ...s) < 0.6)) t = 'trail';
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
        if (k === h) c = t === 'water' ? '#E1C98D' : t === 'sand' ? '#E8D49A' : t === 'trail' ? ((x + z) % 2 ? '#B9A27A' : '#A9C26A') : t === 'path' ? pc[(x * 7 + z * 3 & 7) % 3] : gc[(x * 5 + z * 11 & 15) % 4];
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
    reserve(x, z, 4, 4); blockCircle(x, z, 2.0);
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
    reserve(x, z, 3.5, 3.2); blockRect(x, z, 3.3, 2.8);
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
    reserve(x, z, 4.5, 3.2); blockRect(x, z, 2.6, 2.1); blockRect(x + 3.2, z + 2.5, 1, 0.6);
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
    reserve(x, z, 4, 3.6); blockRect(x, z, 3.4, 2.6);
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
    reserve(fx, fz, 1, 1); blockRect(fx, fz, 0.6, 0.6);
    // Entrance arch + sign posts
    box(-2.2, 0, 15.5, 0.5, 3.6, 0.5, '#6B3E1B'); box(2.2, 0, 15.5, 0.5, 3.6, 0.5, '#6B3E1B'); box(0, 3.4, 15.5, 5.4, 0.6, 0.5, '#8B5A2B');
    reserve(0, 15.5, 3, 1); blockRect(-2.2, 15.5, 0.3, 0.3); blockRect(2.2, 15.5, 0.3, 0.3);
    // Archery range
    const ax = 12.5, az = -12.5;
    box(ax - 1.4, 0, az, 1.4, 0.8, 0.9, '#E2C35A', 'archery'); box(ax + 1.4, 0, az, 1.4, 0.8, 0.9, '#E2C35A', 'archery');
    [[2, '#FFFFFF'], [1.5, '#E53935'], [1, '#3FA9F5'], [0.5, '#FFC629']].forEach(([s, col], i) => box(ax, 0.8 + (2 - s) / 2, az + 0.1 + i * 0.05, s, s, 0.2, col, 'archery'));
    box(ax, 0, az + 0.3, 0.2, 0.8, 0.2, '#6B3E1B', 'archery');
    reserve(ax, az, 2.5, 1.5); blockRect(ax, az, 2.2, 0.6);
    // Hidden cave: rocky mound with a dark opening on its +x side
    const cx = -14, cz = -13;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const hh = 3 - Math.max(Math.abs(i), Math.abs(j)) + (rng() > 0.6 ? 1 : 0); for (let k = 0; k < hh; k++) { if (i === 2 && j === 0 && k < 2) continue; box(cx + i, k, cz + j, 1, 1, 1, (i + j + k) % 2 ? '#8A8A8A' : '#9E9E9E', 'cave'); } }
    box(cx + 1.6, 0, cz, 0.6, 1.8, 0.9, '#111318', 'cave');
    const cm = new T.MeshBasicMaterial({ color: '#B388FF' }); const crystal = part(scene, 0.22, 0.5, 0.22, cx + 2.1, 0.3, cz - 0.25, null, cm); crystal.userData.action = 'cave'; clickables.push(crystal);
    anims.push((dt, t) => cm.color.setHSL(0.75 + Math.sin(t * 2) * 0.05, 0.9, 0.7 + Math.sin(t * 3) * 0.1));
    reserve(cx, cz, 3, 3); blockRect(cx, cz, 2.5, 2.5);
    // Trash can (raccoon spot) near the campfire
    box(4.2, 0, 3.3, 0.8, 1, 0.8, '#5F6B73', 'raccoon'); reserve(4.2, 3.3, 1, 1); blockRect(4.2, 3.3, 0.4, 0.4); reserve(14, 2.5, 2.2, 2.2);
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
      used.add('t' + k); const pine = rng() > 0.45; treeSpots.push([px, pz, H[k], pine]);
      tree(px, H[k], pz, pine);
    }
  }
  function tree(x, y, z, pine) {
    if (pine) blockRect(x, z, 1.5, 1.5); else BLOCK.add(key(Math.floor(x), Math.floor(z)));
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
    S.time = t; if (scene && scene.fog) scene.fog.color.set(FOG[t]); root.classList.remove('t-morning', 't-day', 't-dusk', 't-night'); root.classList.add('t-' + t); applyLight();
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
      if (h.object === staticMesh) { if (W.inCave) continue; const a = voxelActions[h.instanceId]; if (a) return { action: a, point: h.point }; return { ground: true, point: h.point }; }
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
  function hAt(x, z) {
    if (W.inCave) return 0;
    const fx = x - 0.5, fz = z - 0.5, x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const g = (a, b) => { const v = H[key(a, b)]; return v == null || v < 0 ? 0 : v; };
    return (g(x0, z0) * (1 - tx) + g(x0 + 1, z0) * tx) * (1 - tz) + (g(x0, z0 + 1) * (1 - tx) + g(x0 + 1, z0 + 1) * tx) * tz;
  }
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

  /* ---------- Walk-only world: treehouse, trail, geocache, Lost & Found, cave room ---------- */
  const walkOnly = [], LF = [], lfFound = new Set();
  let caveGroup, bat, lostBox, burst = [];
  function walkWorld() {
    // Treehouse lookout (F2)
    const tx = 14, tz = 2.5;
    box(tx, 0, tz, 1, 6.2, 1, '#6B3E1B'); box(tx, 4, tz, 3.4, 0.3, 3.4, '#A0703C');
    [[-1.6, 0, 0.2, 3.4], [1.6, 0, 0.2, 3.4], [0, -1.6, 3.4, 0.2], [0, 1.6, 3.4, 0.2]].forEach(([dx, dz, sx, sz], i) => { if (i === 0) return; box(tx + dx, 4.3, tz + dz, sx, 0.7, sz, '#8B5A2B'); });
    box(tx, 6.2, tz, 4.4, 2.2, 4.4, '#4E9F3D'); box(tx, 8.4, tz, 2.8, 1.2, 2.8, '#5AAE45');
    box(tx - 1.75, 0, tz, 0.1, 4.3, 0.9, '#C08A52', 'ladder'); for (let r = 0; r < 8; r++) box(tx - 1.8, 0.3 + r * 0.5, tz, 0.12, 0.08, 0.9, '#7A4B22', 'ladder');
    BLOCK.add(key(Math.floor(tx), Math.floor(tz)));
    // Geocache at the end of the hidden trail (F3)
    box(-5.5, 0, -15.5, 0.8, 0.45, 0.5, '#556B2F', 'geocache'); box(-5.5, 0.45, -15.5, 0.85, 0.08, 0.55, '#6B8E23', 'geocache');
    // Lost & Found box on the Quartermaster porch
    const [qx, qz] = BLD.quartermaster; box(qx - 2.4, 0.15, qz + 3.2, 0.7, 0.6, 0.7, '#8B5A2B', 'lostbox'); box(qx - 2.4, 0.75, qz + 3.2, 0.75, 0.08, 0.75, '#C08A52', 'lostbox');
    lostBox = new T.Vector3(qx - 2.4, 1, qz + 3.2);
    // Pond reeds
    [[-6.3, 6.1], [-5.8, 6.3], [-6.6, 6.5], [-5.6, 7.0]].forEach(([x, z]) => box(x, 0, z, 0.12, 0.9 + rng() * 0.5, 0.12, '#558B2F'));
  }
  function lostAndFound() {
    const oak = treeSpots.find((s) => !s[3] && Math.hypot(s[0], s[1]) > 8 && Math.hypot(s[0], s[1]) < 13 && s[0] + s[1] > -4) || treeSpots.find((s) => !s[3]) || treeSpots[0];
    const defs = [
      ['duck', 'rubber duck', [-6.0, 0, 6.6], (g) => { part(g, 0.4, 0.3, 0.5, 0, 0.15, 0, '#FFD600'); part(g, 0.26, 0.26, 0.26, 0, 0.42, 0.14, '#FFD600'); part(g, 0.14, 0.08, 0.14, 0, 0.4, 0.32, '#FB8C00'); }],
      ['compass', 'compass', [2.2, 3.6, 15.5], (g) => { part(g, 0.4, 0.1, 0.4, 0, 0.05, 0, '#C9A227'); part(g, 0.06, 0.04, 0.28, 0, 0.12, 0, '#E53935'); }],
      ['sock', 'sock', [0.16, 3.0, -9.4], (g) => { part(g, 0.18, 0.5, 0.14, 0, 0, 0, '#FFFFFF'); part(g, 0.18, 0.14, 0.3, 0, -0.25, 0.08, '#FFFFFF'); part(g, 0.19, 0.08, 0.15, 0, 0.2, 0, '#E53935'); }],
      ['harmonica', 'harmonica', [4.0, 0.03, 0.9], (g) => { part(g, 0.5, 0.12, 0.16, 0, 0.06, 0, '#B0BEC5'); part(g, 0.5, 0.04, 0.17, 0, 0.13, 0, '#78909C'); }],
      ['flashlight', 'flashlight', [oak[0] + 0.5, oak[2] + 1.55, oak[1] + 0.5], (g) => { part(g, 0.14, 0.14, 0.45, 0, 0, 0, '#1E4FA0'); part(g, 0.2, 0.2, 0.1, 0, 0, 0.25, '#FFE082'); }]
    ];
    defs.forEach(([id, name, p, build], i) => {
      const g = new T.Group(); build(g); g.position.set(...p); g.visible = false; g.userData.lf = { id, name };
      scene.add(g); clickable(g, 'lf:' + id); walkOnly.push(g); LF.push(g);
    });
  }
  function caveRoom() {
    caveGroup = new T.Group(); caveGroup.position.copy(CAVE); caveGroup.visible = false; scene.add(caveGroup);
    const floor = part(caveGroup, 8.4, 0.2, 6.4, 0, -0.1, 0, '#4A4458'); floor.userData.action = 'cavefloor';
    for (let x = -4; x <= 4; x++) for (let k = 0; k < 4; k++) { part(caveGroup, 1, 1, 1, x, k + 0.5, -3.5, (x + k) % 2 ? '#5C5468' : '#514a5e'); part(caveGroup, 1, 1, 1, x, k + 0.5, 3.5, (x + k) % 2 ? '#5C5468' : '#514a5e'); }
    for (let z = -3; z <= 3; z++) for (let k = 0; k < 4; k++) { part(caveGroup, 1, 1, 1, 4.5, k + 0.5, z, (z + k) % 2 ? '#5C5468' : '#514a5e'); if (!(Math.abs(z) < 1 && k < 2)) part(caveGroup, 1, 1, 1, -4.5, k + 0.5, z, (z + k) % 2 ? '#5C5468' : '#514a5e'); }
    part(caveGroup, 10, 0.6, 8, 0, 4.2, 0, '#3E3848');
    for (let i = 0; i < 9; i++) part(caveGroup, 0.4, 0.4 + rng() * 0.8, 0.4, rng() * 7 - 3.5, 3.6, rng() * 5 - 2.5, '#463F52');
    const door = new T.Mesh(new T.PlaneGeometry(1, 2), new T.MeshBasicMaterial({ color: '#FFF2C8' })); door.rotation.y = Math.PI / 2; door.position.set(-4.95, 1, 0); door.userData.action = 'caveexit'; caveGroup.add(door);
    const cc = ['#B388FF', '#80DEEA', '#CE93D8', '#B388FF'];
    [[2.8, -2.4], [3.6, 1.8], [-2.6, 2.6], [0.6, -2.8]].forEach(([x, z], i) => {
      const g = new T.Group(); g.position.set(x, 0, z); caveGroup.add(g);
      for (let j = 0; j < 4; j++) { const m = new T.Mesh(BOX, new T.MeshBasicMaterial({ color: cc[i] })); const hh = 0.5 + rng() * 0.9; m.scale.set(0.22, hh, 0.22); m.position.set(rng() * 0.6 - 0.3, hh / 2, rng() * 0.6 - 0.3); m.rotation.z = rng() * 0.4 - 0.2; g.add(m); }
      g.traverse((o) => (o.userData.action = 'crystal')); g.userData.pulse = 0;
    });
    const paint = (draw) => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#5C5468'; x.fillRect(0, 0, 256, 128); x.strokeStyle = x.fillStyle = '#D9A55B'; x.lineWidth = 5; draw(x); return new T.MeshLambertMaterial({ map: new T.CanvasTexture(c) }); };
    const p1 = new T.Mesh(new T.PlaneGeometry(4, 2), paint((x) => { x.beginPath(); x.moveTo(30, 100); x.lineTo(70, 40); x.lineTo(110, 100); x.closePath(); x.stroke(); x.beginPath(); x.arc(160, 95, 12, 0, 7); x.fill(); x.fillStyle = '#E57373'; x.beginPath(); x.moveTo(150, 85); x.lineTo(160, 55); x.lineTo(170, 85); x.fill(); x.fillStyle = '#D9A55B'; [205, 230].forEach((sx) => { x.beginPath(); x.arc(sx, 50, 7, 0, 7); x.fill(); x.beginPath(); x.moveTo(sx, 57); x.lineTo(sx, 85); x.moveTo(sx - 12, 68); x.lineTo(sx + 12, 68); x.moveTo(sx, 85); x.lineTo(sx - 9, 105); x.moveTo(sx, 85); x.lineTo(sx + 9, 105); x.stroke(); }); }));
    p1.position.set(0, 2, -2.98); caveGroup.add(p1);
    const p2 = new T.Mesh(new T.PlaneGeometry(4, 2), paint((x) => { x.beginPath(); x.ellipse(80, 64, 40, 18, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(120, 64); x.lineTo(145, 45); x.lineTo(145, 83); x.closePath(); x.stroke(); x.beginPath(); x.arc(200, 40, 20, 0, 7); x.stroke(); for (let a = 0; a < 8; a++) { x.beginPath(); x.moveTo(200 + Math.cos(a) * 26, 40 + Math.sin(a) * 26); x.lineTo(200 + Math.cos(a) * 36, 40 + Math.sin(a) * 36); x.stroke(); } }));
    p2.rotation.y = -Math.PI / 2; p2.position.set(3.98, 2, 0); caveGroup.add(p2);
    bat = new T.Group(); part(bat, 0.3, 0.4, 0.25, 0, 0, 0, '#3b3346'); const w1 = part(bat, 0.5, 0.05, 0.3, -0.35, 0.05, 0, '#3b3346'), w2 = part(bat, 0.5, 0.05, 0.3, 0.35, 0.05, 0, '#3b3346');
    part(bat, 0.06, 0.06, 0.04, -0.07, 0.05, 0.13, '#FFF59D'); part(bat, 0.06, 0.06, 0.04, 0.07, 0.05, 0.13, '#FFF59D');
    bat.position.set(1.5, 3.6, 1); bat.rotation.x = Math.PI; caveGroup.add(bat); bat.traverse((o) => (o.userData.action = 'bat')); bat.userData = { fly: 0, w1, w2, a: 0 };
    const pl = new T.PointLight('#C9A8FF', 1.2, 12, 1.5); pl.position.set(0, 3, 0); caveGroup.add(pl);
    clickables.push(caveGroup);
    anims.push((dt, t) => {
      if (!caveGroup.visible) return;
      const b = bat.userData;
      if (b.fly > 0) { b.fly -= dt; b.a += dt * 3; const c = W.pos.clone().sub(CAVE); bat.position.set(c.x + Math.cos(b.a) * 1.3, EYE + 0.5 + Math.sin(b.a * 2) * 0.2, c.z + Math.sin(b.a) * 1.3); bat.rotation.set(0, -b.a, 0); const f = Math.sin(t * 25) * 0.8; b.w1.rotation.z = f; b.w2.rotation.z = -f; if (b.fly <= 0) { bat.position.set(1.5, 3.6, 1); bat.rotation.set(Math.PI, 0, 0); b.w1.rotation.z = b.w2.rotation.z = 0; } }
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
  const FOG = { morning: '#FFE3C4', day: '#D6EEFF', dusk: '#E7A07C', night: '#2A3A6E' };
  function setFog(on) { scene.fog = on ? new T.Fog(FOG[S.time], tier === 'full' ? 18 : 10, tier === 'full' ? 42 : 26) : null; }
  function setWalkOnly(on) { walkOnly.forEach((o) => (o.visible = on && !lfFound.has(o.userData.lf && o.userData.lf.id))); }
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
    stage.appendChild(renderer.domElement); renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'A 3D voxel summer camp with a campfire, a game tent, a craft hut and a quartermaster cabin around a pond and trees. Use the Camp Map button for a list of everything here.');
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    hemi = new T.HemisphereLight('#fff', '#7a9a50', 0.95); scene.add(hemi);
    sun = new T.DirectionalLight('#fff', 0.85); sun.castShadow = tier === 'full';
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 }); sun.shadow.bias = -0.0015; scene.add(sun);
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
