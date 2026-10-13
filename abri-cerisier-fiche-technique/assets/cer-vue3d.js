/* Abri Cerisier — « Voir en 3D » (fenêtre qui s'ouvre au clic), réalité augmentée et insertion sur une photo du jardin.
 * Les murs portent les dessins de façade du moteur (window.CerPlan) : portes, fenêtres, bardage et angles sont ceux du configurateur.
 * Les menuiseries sont posées en retrait dans leur ouverture (tableaux, appui, vitrage réfléchissant) ; toit, débords, poteaux massifs,
 * gouttières, membrane EPDM du QUADRO et fermetures sont construits en volume avec les cotes du moteur.
 * Three.js n'est chargé qu'au premier clic. Réglages et dépôt des fichiers de réalité augmentée : window.CER_3D (fourni par le site). */
window.CerVue3D = (function () {
  'use strict';
  var BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/';
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var T = null, BOIS = null;
  function charger() {
    if (T && BOIS) return Promise.resolve(T);
    return Promise.all([
      import(BASE + '+esm'),
      import(BASE + 'examples/jsm/controls/OrbitControls.js/+esm'),
      import(BASE + 'examples/jsm/objects/Sky.js/+esm'),
      chargerBois()
    ]).then(function (r) { T = { THREE: r[0], OrbitControls: r[1].OrbitControls, Sky: r[2].Sky }; return T; });
  }
  // photo du pin autoclave vert (texture SketchUp d'Abri Cerisier, 1 m x 0,815 m, raccordable) : lames du moteur et bois massif
  function chargerBois() {
    if (BOIS) return Promise.resolve(BOIS);
    var url = CFG().bois || texUrl('pin-autoclave-vert.jpg');
    var enData = /^data:/.test(url) ? Promise.resolve(url) : fetch(url).then(function (r) { if (!r.ok) throw new Error('texture'); return r.blob(); })
      .then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); });
    return enData.then(function (data) { return new Promise(function (res) { var im = new Image(); im.onload = function () {
      BOIS = { url: data, w: im.naturalWidth, h: im.naturalHeight, m: [1, im.naturalHeight / im.naturalWidth], img: im,
        zones: [[0, 165], [250, 400], [555, 816]], noeuds: [[410, 205, 120, 100], [300, 450, 120, 105]] }; res(BOIS); }; im.onerror = function () { res(null); }; im.src = data; }); })
      .catch(function () { return null; }); // sans la photo : bois dessiné du moteur
  }
  // zones : bandes de la photo sans nœud (pixels) ; noeuds : [x, y, largeur, hauteur] des deux nœuds de la photo
  function avecBois(E, f) { var sv = E.ST.boisPhoto; E.ST.boisPhoto = BOIS ? { url: BOIS.url, w: BOIS.w, h: BOIS.h, m: BOIS.m, zones: BOIS.zones, noeuds: BOIS.noeuds } : null; try { return f(); } finally { E.ST.boisPhoto = sv; } }
  function exporteurs() {
    return Promise.all([import(BASE + 'examples/jsm/exporters/GLTFExporter.js/+esm'), import(BASE + 'examples/jsm/exporters/USDZExporter.js/+esm')])
      .then(function (r) { return { GLTFExporter: r[0].GLTFExporter, USDZExporter: r[1].USDZExporter }; });
  }
  var CFG = function () { return window.CER_3D || {}; };
  var texUrl = function (f) { return (CFG().tex || SRC.replace(/[^\/]*$/, 'tex/')) + f; };
  // couvertures : fichier, largeur et hauteur réelles de l'image en mètres (tailles des matières SketchUp)
  var TOITS = { shingle_n: ['couv-shingle-noir.jpg', 1, 0.657], shingle_b: ['couv-shingle-brun.jpg', 1, 0.655], shingle_v: ['couv-shingle-vert.jpg', 1, 0.655],
    tuile_r: ['couv-tuile-rouge.jpg', 1, 0.839], tuile_g: ['couv-tuile-grise.jpg', 1, 0.839], bac: ['couv-bac-acier.jpg', 1, 1.045] };

  // ───────── dessins du moteur → textures ─────────
  var PXM = 280; // pixels par mètre
  function facade(E, d, side) {
    var ST = E.ST, sv = { picto: ST.picto, mur: ST.murSeul, scale: ST.scale };
    ST.picto = true; ST.murSeul = true; ST.scale = PXM;
    try {
      var g = E.getElevGeom(d, side), vw = Math.ceil((g.w + 4) * PXM), vh = Math.ceil((g.wallH + (g.rH || 0) + (d.base || 0) + 2.5) * PXM);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', vw); svg.setAttribute('height', vh); svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
      avecBois(E, function () { E.drawElev(svg, d, side, vw, vh); });
      return { svg: svg, m: JSON.parse(svg.getAttribute('data-mur') || 'null') };
    } finally { ST.picto = sv.picto; ST.murSeul = sv.mur; ST.scale = sv.scale; }
  }
  function rasteriser(svg, x0, y0, w, h) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { var c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h)); c.getContext('2d').drawImage(img, -x0, -y0); res(c); };
      img.onerror = function () { res(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
  }
  // motif du moteur (couverture vue de dessus, bardage) rendu sur une tuile de 2 m
  function motif(E, fill, px) {
    var S = 2 * px, svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', S); svg.setAttribute('height', S);
    var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('width', S); r.setAttribute('height', S);
    r.setAttribute('fill', avecBois(E, function () { return fill(svg); })); svg.appendChild(r);
    return rasteriser(svg, 0, 0, S, S);
  }

  // ───────── textures dessinées ─────────
  function canvasTex(THREE, c, rep) { var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
  function dessin(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
  function hex(h, k) { var n = parseInt(h.slice(1), 16), f = function (v) { return Math.max(0, Math.min(255, Math.round(v * (1 + k)))); }; return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; }
  // bois massif : quatre bandes de la photo, fil vertical ; la texture se répète en miroir le long du fil, donc sans raccord visible
  function boisMassifPhoto() {
    var S = Math.round(0.12 * BOIS.w), c = document.createElement('canvas'); c.width = 4 * S; c.height = BOIS.w;
    var g = c.getContext('2d');
    var zs = BOIS.zones.map(function (z) { return [z[0], Math.min(z[1], BOIS.h) - S]; }).filter(function (z) { return z[1] >= z[0]; }); // bandes sans gros nœud
    for (var k = 0; k < 4; k++) { var z = zs[Math.floor(Math.random() * zs.length)] || [0, BOIS.h - S], r = z[0] + Math.random() * (z[1] - z[0]); g.save(); g.translate(k * S + S, 0); g.rotate(Math.PI / 2); g.drawImage(BOIS.img, 0, r, BOIS.w, S, 0, 0, BOIS.w, S); g.restore(); }
    return c;
  }
  function boisMassif(col) {
    return dessin(128, 1024, function (g, w, h) {
      g.fillStyle = col[0]; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 46; i++) {
        var x = Math.random() * w, a = 2 + Math.random() * 5, ph = Math.random() * 6;
        g.strokeStyle = 'rgba(70,62,35,' + (0.05 + Math.random() * 0.12) + ')'; g.lineWidth = 0.6 + Math.random() * 1.6; g.beginPath();
        for (var y = 0; y <= h; y += 16) { var xx = x + Math.sin(y / 140 + ph) * a; if (y) g.lineTo(xx, y); else g.moveTo(xx, y); }
        g.stroke();
      }
      for (var k = 0; k < 3; k++) { var ky = Math.random() * h, kx = Math.random() * w; g.fillStyle = 'rgba(95,80,45,.35)'; g.beginPath(); g.ellipse(kx, ky, 6, 14, 0, 0, 7); g.fill(); }
      var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,.10)'); gr.addColorStop(.5, 'rgba(255,255,255,.04)'); gr.addColorStop(1, 'rgba(0,0,0,.10)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }
  function herbe() {
    return dessin(512, 512, function (g, w, h) {
      g.fillStyle = '#6f8a48'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 26000; i++) { var v = Math.random(); g.fillStyle = 'rgba(' + (55 + v * 70) + ',' + (95 + v * 60) + ',' + (35 + v * 30) + ',.55)'; g.fillRect(Math.random() * w, Math.random() * h, 1.2, 2 + Math.random() * 4); }
    });
  }
  function membrane() { // EPDM : caoutchouc noir, légèrement marbré, joints de lés
    return dessin(512, 512, function (g, w, h) {
      g.fillStyle = '#1d1e20'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 9000; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.025 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, h / 2 - 2, w, 3);
    });
  }
  function ombreDouce() {
    return dessin(256, 256, function (g, w) { var r = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  }

  // ───────── construction de l'abri ─────────
  function construire(E, opts) {
    var THREE = T.THREE, ST = E.ST, d = E.calcDims(), G = new THREE.Group();
    var fv = function (id) { return ST.cfg && ST.cfg[id] != null ? String(ST.cfg[id]) : ''; };
    var L = d.L, P = d.P, base = d.base || 0, hE = d.hExt, tan = Math.tan(d.penteRad || 0), rH = d.rH || 0;
    var quadro = !!d.isQuadro, plat = d.toit === 'TOIT_PLAT' && !quadro, orient = d.orient || fv('f-orient');
    var bois = ['#bdb07e', '#857a50', '#d2c799'];
    var M = {
      massif: new THREE.MeshStandardMaterial({ map: BOIS ? (function () { var t = canvasTex(THREE, boisMassifPhoto(), true); t.wrapT = THREE.MirroredRepeatWrapping; return t; })() : canvasTex(THREE, boisMassif(bois)), roughness: 0.8 }),
      noir: new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.45, metalness: 0.4 }),
      parpaing: new THREE.MeshStandardMaterial({ color: 0xb9b7ae, roughness: 0.95 }),
      gouttiere: new THREE.MeshStandardMaterial({ color: 0x383e42, roughness: 0.42, metalness: 0.3, side: THREE.DoubleSide }), // gris anthracite RAL 7016
      interieur: new THREE.MeshStandardMaterial({ color: 0x2b2a24, roughness: 1 }),
      verre: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.03 }),
      epdm: new THREE.MeshStandardMaterial({ map: canvasTex(THREE, membrane(), true), roughness: 0.62 })
    };
    M.epdm.map.repeat.set(0.5, 0.5);
    var attente = [];
    var boite = function (w, h, dd, mat, brut) {
      var geo = new THREE.BoxGeometry(w, h, dd);
      if (!brut) { var uv = geo.attributes.uv, dims = [[dd, h], [dd, h], [w, dd], [w, dd], [w, h], [w, h]];
        for (var f = 0; f < 6; f++) for (var k = 0; k < 4; k++) { var i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); } }
      var m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
    };
    // pièce de bois massif : fil dans le sens de la longueur, d'une seule traite ; chaque face prend une bande différente de la photo
    var massif = function (w, h, dd, axe) {
      var m = boite(w, h, dd, M.massif, true), geo = m.geometry, uv = geo.attributes.uv, pos = geo.attributes.position;
      var ax = axe === 'x' ? 0 : axe === 'z' ? 2 : 1, len = [w, h, dd][ax], v0 = Math.random() * 2;
      var co = function (i) { return [pos.getX(i), pos.getY(i), pos.getZ(i)][ax]; };
      for (var f = 0; f < 6; f++) {
        var i0 = f * 4, uLong = Math.abs(co(i0) - co(i0 + 1)) > 1e-6; // les sommets 0 et 1 d'une face diffèrent par u
        for (var k = 0; k < 4; k++) { var i = i0 + k, u = uv.getX(i), v = uv.getY(i); if (uLong) { var t = u; u = v; v = t; }
          uv.setXY(i, BOIS ? ([0, 1, 1, 0, 2, 3][f] + u) / 4 : u, BOIS ? v0 + v * len : v); }
      }
      return m;
    };

    // ── murs : dessin du moteur, percé à chaque menuiserie, menuiserie posée en retrait ──
    var POSE = { face: [0, -L / 2, P / 2, 1], fond: [Math.PI, L / 2, -P / 2, 1], gauche: [Math.PI / 2, -L / 2, P / 2, -1], droite: [-Math.PI / 2, L / 2, -P / 2, -1] };
    var vitre = function (m) { var l = (m.siteLabel || m.label || '').toLowerCase(); return m.type === 'fenetre' || (/vitr|fen[eê]tre|hublot|baie|coulissant/.test(l) && !/pleine/.test(l)); };
    ['face', 'gauche', 'droite', 'fond'].forEach(function (side) {
      var fa = facade(E, d, side); if (!fa.m) return;
      var m = fa.m, sc = m.sc, xs = m.pts.map(function (p) { return p[0]; }), ys = m.pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys), tw = Math.max.apply(null, xs) - x0, th = Math.max.apply(null, ys) - y0;
      var uvOf = function (u, v) { return [((m.baseX + u * sc) - x0) / tw, 1 - ((m.gndY - v * sc) - y0) / th]; };
      // ouvertures de ce mur (cm → m, repère du dessin : u depuis la gauche du dessin, v depuis le pied du mur)
      var trous = ST.menus.filter(function (x) { return x.wall === side; }).map(function (x) {
        var u = x.pos / 100 * m.w, w = x.lw / 100, v = (x.seuil || 0) / 100;
        return { m: x, a: u - w / 2, b: u + w / 2, v0: v, v1: v + x.lh / 100, vitre: vitre(x), porte: x.type !== 'fenetre' };
      });
      if (ST.type === 'garage' && side === 'face') {
        var gw = (parseFloat(fv('f-pglw')) || 237) / 100, gh = (parseFloat(fv('f-pglh')) || 200) / 100;
        trous.push({ a: m.w / 2 - gw / 2, b: m.w / 2 + gw / 2, v0: -base, v1: gh - base, vitre: false, porte: true, garage: true });
      }
      var shape = new THREE.Shape(m.pts.map(function (p) { return new THREE.Vector2((p[0] - m.baseX) / sc, (m.gndY - p[1]) / sc); }));
      trous.forEach(function (o) { var h = new THREE.Path(); var vb = Math.max(o.v0, 0.001);
        h.moveTo(o.a, vb); h.lineTo(o.b, vb); h.lineTo(o.b, o.v1); h.lineTo(o.a, o.v1); h.lineTo(o.a, vb); shape.holes.push(h); });
      var geo = new THREE.ShapeGeometry(shape), pos = geo.attributes.position, uv = geo.attributes.uv;
      for (var i = 0; i < pos.count; i++) { var q = uvOf(pos.getX(i), pos.getY(i)); uv.setXY(i, q[0], q[1]); }
      var grp = new THREE.Group(), pose = POSE[side], sg = pose[3];
      grp.rotation.y = pose[0]; grp.position.set(pose[1], base, pose[2]);
      var mat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide });
      var murMesh = new THREE.Mesh(geo, mat); murMesh.castShadow = murMesh.receiveShadow = true; grp.add(murMesh);
      trous.forEach(function (o) {
        var prof = o.garage ? 0.04 : 0.07, z = -sg * prof, w = o.b - o.a, h = o.v1 - Math.max(o.v0, 0);
        var pg = new THREE.PlaneGeometry(w, h), pp = pg.attributes.position, pu = pg.attributes.uv;
        for (var j = 0; j < pp.count; j++) { var uu = o.a + w / 2 + pp.getX(j), vv = Math.max(o.v0, 0) + h / 2 + pp.getY(j), qq = uvOf(uu, vv); pu.setXY(j, qq[0], qq[1]); }
        var pm = new THREE.Mesh(pg, mat); pm.position.set(o.a + w / 2, Math.max(o.v0, 0) + h / 2, z); pm.receiveShadow = true; grp.add(pm);
        // tableaux (épaisseur de l'ouverture) en bois massif
        [[o.a, Math.max(o.v0, 0) + h / 2, 0.02, h], [o.b, Math.max(o.v0, 0) + h / 2, 0.02, h], [o.a + w / 2, o.v1, w + 0.02, 0.02]].forEach(function (t, n) {
          var tb = n < 2 ? massif(0.02, t[3], prof) : massif(t[2], 0.02, prof, 'x'); tb.position.set(t[0], t[1], z / 2); grp.add(tb);
        });
        if (!o.porte) { var ap = massif(w + 0.06, 0.03, prof + 0.05, 'x'); ap.position.set(o.a + w / 2, o.v0 - 0.015, z / 2 + sg * 0.025); grp.add(ap); } // appui de fenêtre
        if (o.vitre) { var vg = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.02, h - 0.02), M.verre); vg.position.set(o.a + w / 2, Math.max(o.v0, 0) + h / 2, z + sg * 0.012); grp.add(vg); }
      });
      G.add(grp);
      attente.push(rasteriser(fa.svg, x0, y0, tw, th).then(function (c) { if (c) { mat.map = canvasTex(THREE, c); mat.needsUpdate = true; } }));
    });
    // intérieur sombre (vu à travers les vitrages) et soubassement
    var inn = boite(L - 0.4, hE - 0.05, P - 0.4, M.interieur, true); inn.position.set(0, base + hE / 2, 0); inn.castShadow = false; G.add(inn);
    if (base > 0) { var bs = boite(L, base, P, M.parpaing); bs.position.y = base / 2; G.add(bs); }

    // ── toit ──
    var y0t = base + hE;
    var sous = function (x, z) {
      if (d.toit === '2PANS') return y0t + (L / 2 - Math.abs(x)) * tan;
      if (d.toit === '1PAN') {
        if (orient === 'droite') return y0t + (L / 2 - x) * tan;
        if (orient === 'gauche') return y0t + (L / 2 + x) * tan;
        if (orient === 'fond') return y0t + (z + P / 2) * tan;
        return y0t + (P / 2 - z) * tan;
      }
      return y0t;
    };
    var X0 = -L / 2 - d.ovL, X1 = L / 2 + d.ovR, ZF = P / 2 + d.ovF, ZB = -P / 2 - d.ovB, ep = 0.07, a = Math.atan(tan);
    var cv = E.couvFin(d), matCouv = new THREE.MeshStandardMaterial({ roughness: cv.kind === 'bac' || cv.kind === 'tuile' ? 0.45 : 0.92, metalness: cv.kind === 'bac' || cv.kind === 'tuile' ? 0.35 : 0 });
    var matSous = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    var rotCouv = (d.toit === '2PANS' || (d.toit === '1PAN' && (orient === 'droite' || orient === 'gauche')));
    // couverture : texture des modèles SketchUp (dossier « 4• Textures » : shingles, tuiles, bac acier), sinon motif du moteur
    var kCouv = Object.keys(E.COUVERTURES).filter(function (k) { return E.COUVERTURES[k] === cv; })[0], TC = TOITS[kCouv];
    var motifCouv = function () { return motif(E, function (svg) { return E.patCouv(svg, cv, 256, 0, 0, Math.PI / 2); }, 256).then(function (c) {
      if (!c) return; var t = canvasTex(THREE, c, true); t.repeat.set(0.5, 0.5); if (rotCouv) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; } matCouv.map = t; matCouv.needsUpdate = true; }); };
    attente.push(!TC ? motifCouv() : new Promise(function (res) {
      var url = (CFG().toits && CFG().toits[kCouv]) || texUrl(TC[0]);
      new THREE.TextureLoader().load(url, function (t) { // t : TC[1] m de large (le long de l'égout) sur TC[2] m (dans la pente)
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping;
        if (rotCouv) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.repeat.set(1 / TC[2], 1 / TC[1]); } else t.repeat.set(1 / TC[1], 1 / TC[2]);
        matCouv.map = t; matCouv.color.set(kCouv === 'bac' ? 0x7d8287 : 0xffffff); matCouv.needsUpdate = true; res(); }, undefined, function () { motifCouv().then(res); });
    }));
    attente.push(motif(E, function (svg) { return E.patBoards(svg, E.FINITIONS.sr_vert, 256, 0, 512); }, 256).then(function (c) {
      if (!c) return; var t = canvasTex(THREE, c, true); t.repeat.set(0.5, 0.5); matSous.map = t; matSous.needsUpdate = true; }));
    var mats = function () { return [M.massif, M.massif, matCouv, matSous, M.massif, M.massif]; };
    var pan = function (xa, xb, za, zb, ang) { var w = (xb - xa) / Math.cos(ang), xc = (xa + xb) / 2, mm = boite(w, ep, zb - za, mats());
      mm.rotation.z = ang; mm.position.set(xc, sous(xc, (za + zb) / 2) + ep / 2 / Math.cos(ang), (za + zb) / 2); G.add(mm); };
    var panZ = function (za, zb, ang) { var w = (zb - za) / Math.cos(ang), zc = (za + zb) / 2, mm = boite(X1 - X0, ep, w, mats());
      mm.rotation.x = ang; mm.position.set((X0 + X1) / 2, sous(0, zc) + ep / 2 / Math.cos(ang), zc); G.add(mm); };
    var rive = function (xa, xb, z, ang) { var w = (xb - xa) / Math.cos(ang), r = massif(w, 0.2, 0.028, 'x'); r.rotation.z = ang; r.position.set((xa + xb) / 2, sous((xa + xb) / 2, 0) - 0.03, z); G.add(r); };
    var gout = []; // égouts : { axe: 'z' (le long de la profondeur) ou 'x' (le long de la largeur), e: coordonnée du bord du toit, s: côté (-1 / +1) }
    if (d.toit === '2PANS') {
      pan(X0, 0, ZB, ZF, a); pan(0, X1, ZB, ZF, -a);
      [ZF + 0.015, ZB - 0.015].forEach(function (z) { rive(X0, 0, z, a); rive(0, X1, z, -a); });
      gout.push({ axe: 'z', e: X0, s: -1 }, { axe: 'z', e: X1, s: 1 });
    } else if (d.toit === '1PAN' && (orient === 'droite' || orient === 'gauche')) {
      var s1 = orient === 'droite' ? -1 : 1; pan(X0, X1, ZB, ZF, a * s1);
      [ZF + 0.015, ZB - 0.015].forEach(function (z) { rive(X0, X1, z, a * s1); });
      gout.push(orient === 'droite' ? { axe: 'z', e: X1, s: 1 } : { axe: 'z', e: X0, s: -1 });
    } else if (d.toit === '1PAN') {
      panZ(ZB, ZF, orient === 'face' ? a : -a);
      gout.push(orient === 'face' ? { axe: 'x', e: ZF, s: 1 } : { axe: 'x', e: ZB, s: -1 });
    } else if (quadro) {
      // QUADRO : murs jusqu'en haut (acrotère), membrane EPDM juste sous l'acrotère (relevé de 5 cm au point haut), pente vers le fond, couvertine noire
      var top = base + hE + rH, haut = top - 0.05, bas = haut - Math.min(0.05, P * 0.015), mbr = boite(L - 0.06, 0.02, P - 0.06, [M.epdm, M.epdm, M.epdm, M.epdm, M.epdm, M.epdm]);
      mbr.rotation.x = -Math.atan((haut - bas) / P); mbr.position.set(0, (haut + bas) / 2, 0); G.add(mbr);
      [[0, P / 2 - 0.035, L - 0.06, 0.01, 0], [0, -P / 2 + 0.035, L - 0.06, 0.01, 0], [-L / 2 + 0.035, 0, 0.01, P - 0.06, 1], [L / 2 - 0.035, 0, 0.01, P - 0.06, 1]].forEach(function (r) {
        var hh = top + 0.004 - bas, rv = boite(r[2], hh, r[4] ? r[3] : 0.01, M.epdm); if (r[4]) rv = boite(0.01, hh, r[3], M.epdm);
        rv.position.set(r[0], bas + hh / 2, r[1]); G.add(rv); });
      var cvt = function (w, dd, x, z) { var c = boite(w, 0.045, dd, M.noir); c.position.set(x, top + 0.022, z); G.add(c); };
      cvt(X1 - X0 + 0.04, 0.09, (X0 + X1) / 2, ZF); cvt(X1 - X0 + 0.04, 0.09, (X0 + X1) / 2, ZB); cvt(0.09, ZF - ZB, X0, (ZF + ZB) / 2); cvt(0.09, ZF - ZB, X1, (ZF + ZB) / 2);
      cvt(L + 0.04, 0.09, 0, P / 2); cvt(L + 0.04, 0.09, 0, -P / 2); cvt(0.09, P, -L / 2, 0); cvt(0.09, P, L / 2, 0);
      // extensions du QUADRO : bandeau bardé jusqu'à la couvertine
      var hb2 = top - y0t, bd = function (xa, xb, za, zb) { if (xb - xa < 0.02 || zb - za < 0.02) return; var mm = boite(xb - xa, hb2, zb - za, [M.massif, M.massif, M.epdm, matSous, M.massif, M.massif]); mm.position.set((xa + xb) / 2, y0t + hb2 / 2, (za + zb) / 2); G.add(mm); };
      bd(X0, X1, P / 2, ZF); bd(X0, X1, ZB, -P / 2); bd(X0, -L / 2, -P / 2, P / 2); bd(L / 2, X1, -P / 2, P / 2);
      // évacuation : un tuyau traverse l'acrotère au fond, au ras de la membrane, puis un coude et la descente le long du mur
      gout.push({ t: 'quadro', y: bas + 0.03 });
    } else {
      // toit plat : bandeau de 39 cm tout autour, couverture EPDM, gouttière cachée derrière le bandeau
      var hb = 0.39, tp = boite(X1 - X0, hb, ZF - ZB, [M.massif, M.massif, matCouv, matSous, M.massif, M.massif]); tp.position.set((X0 + X1) / 2, y0t + hb / 2, (ZF + ZB) / 2); G.add(tp);
      gout.push({ t: 'plat', y: y0t });
    }
    // ── extensions : poteaux massifs 12 × 12 aux angles extérieurs, sablière ──
    var poteau = function (x, z) { var h = sous(x, z); var mm = massif(0.12, h, 0.12); mm.position.set(x, h / 2, z); G.add(mm); };
    if (d.ovF > 0.5) { poteau(-L / 2 + 0.06, ZF - 0.06); poteau(L / 2 - 0.06, ZF - 0.06); }
    if (d.ovB > 0.5) { poteau(-L / 2 + 0.06, ZB + 0.06); poteau(L / 2 - 0.06, ZB + 0.06); }
    if (d.ovL > 0.5) { poteau(X0 + 0.06, P / 2 - 0.06); poteau(X0 + 0.06, -P / 2 + 0.06); var sb = massif(0.09, 0.14, P, 'z'); sb.position.set(X0 + 0.06, sous(X0 + 0.06, 0) - 0.07, 0); G.add(sb); }
    if (d.ovR > 0.5) { poteau(X1 - 0.06, P / 2 - 0.06); poteau(X1 - 0.06, -P / 2 + 0.06); var sb2 = massif(0.09, 0.14, P, 'z'); sb2.position.set(X1 - 0.06, sous(X1 - 0.06, 0) - 0.07, 0); G.add(sb2); }
    // ── fermetures des extensions (plan du moteur) ──
    var EX = E.extGeom ? E.extGeom(d) : { seg: [] };
    if (EX.seg.length) {
      var matF = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide });
      attente.push(motif(E, function (svg) { return E.patBoards(svg, EX.type === 'ajouree' ? E.FINITIONS.ps_vert_ajoure : E.FINITIONS.sr_vert_v, 256, 0, 512); }, 256).then(function (c) {
        if (!c) return; var t = canvasTex(THREE, c, true); t.repeat.set(0.5, 0.5); matF.map = t; matF.needsUpdate = true; }));
      EX.seg.forEach(function (s) {
        var xa = s.x0 - L / 2, xb = s.x1 - L / 2, za = P / 2 - s.y0, zb = P / 2 - s.y1, len = Math.hypot(xb - xa, zb - za);
        var h = Math.min(sous(xa, za), sous(xb, zb)) - 0.02, mm = boite(len, h, 0.025, matF);
        mm.position.set((xa + xb) / 2, h / 2, (za + zb) / 2); mm.rotation.y = -Math.atan2(zb - za, xb - xa); G.add(mm);
      });
    }
    // ── gouttières et descentes (option « gouttière ») ──
    // gouttière demi-ronde gris anthracite RAL 7016 sous chaque égout ; la descente revient contre le mur (ou contre le poteau
    // d'extension) par deux coudes, puis longe la paroi jusqu'au sol, tenue par des colliers, avec un coude de pied
    if (fv('f-gout') === 'oui' || quadro) {
      var RG = 0.04, RD = quadro ? 0.06 : 0.04, ECART = RD + 0.012; // rayon de la gouttière ; descente Ø 8 cm (Ø 12 cm sur le QUADRO) ; axe de la descente / paroi
      var V3 = function (p) { return new THREE.Vector3(p[0], p[1], p[2]); };
      var tuyau = function (pts) { // tube passant par les points, coudes arrondis
        var path = new THREE.CurvePath(), prev = V3(pts[0]), lig = function (a, b) { if (a.distanceTo(b) > 1e-4) path.add(new THREE.LineCurve3(a.clone(), b.clone())); };
        for (var i = 1; i < pts.length; i++) {
          var cur = V3(pts[i]);
          if (i === pts.length - 1) { lig(prev, cur); break; }
          var nxt = V3(pts[i + 1]), din = cur.clone().sub(prev), dout = nxt.clone().sub(cur), r1 = Math.min(0.05, din.length() / 2), r2 = Math.min(0.05, dout.length() / 2);
          var pa = cur.clone().sub(din.normalize().multiplyScalar(r1)), pb = cur.clone().add(dout.normalize().multiplyScalar(r2));
          lig(prev, pa); path.add(new THREE.QuadraticBezierCurve3(pa, cur.clone(), pb)); prev = pb;
        }
        var m = new THREE.Mesh(new THREE.TubeGeometry(path, 40 * pts.length, RD, 14, false), M.gouttiere); m.castShadow = true; G.add(m);
      };
      var colliers = function (x, z, nx, nz, y0, y1) { // colliers de fixation sur la partie verticale ; (nx, nz) : vers la paroi
        for (var y = y0 + 0.35; y < y1 - 0.15; y += 0.9) {
          var an = new THREE.Mesh(new THREE.TorusGeometry(RD + 0.003, 0.005, 6, 18), M.gouttiere); an.rotation.x = Math.PI / 2; an.position.set(x, y, z); G.add(an);
          var pt = new THREE.Mesh(new THREE.BoxGeometry(nx ? ECART - RD : 0.012, 0.02, nz ? ECART - RD : 0.012), M.gouttiere);
          pt.position.set(x + nx * (RD + (ECART - RD) / 2), y, z + nz * (RD + (ECART - RD) / 2)); G.add(pt);
        }
      };
      gout.forEach(function (g) {
        if (g.t) { // QUADRO et toit plat : sortie au fond, côté droit
          var bExt = d.ovB > 0.5, xo = bExt ? L / 2 - 0.06 : L / 2 - 0.3, zw = (bExt ? ZB : -P / 2) - ECART;
          var pts = g.t === 'quadro' ? [[xo, g.y, ZB + 0.04], [xo, g.y, ZB - ECART]] : [[xo, g.y + 0.1, Math.min(ZB + 0.06, zw)], [xo, g.y - 0.06, Math.min(ZB + 0.06, zw)]];
          var y1 = pts[1][1], dz = Math.abs(pts[1][2] - zw);
          if (dz > 0.015) { pts.push([xo, y1 - dz, zw]); y1 -= dz; }
          pts.push([xo, 0.14, zw], [xo, 0.04, zw - 0.12]); tuyau(pts); colliers(xo, zw, 0, 1, 0.14, y1);
          return;
        }
        var z = g.axe === 'z', ye = z ? sous(g.e, 0) : sous(0, g.e), c = g.e + g.s * 0.02, yc = ye - 0.012;
        var a0 = z ? ZB : X0, a1 = z ? ZF : X1, len = a1 - a0 + 0.02;
        var geo = z ? new THREE.CylinderGeometry(RG, RG, len, 22, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2)
                    : new THREE.CylinderGeometry(RG, RG, len, 22, 1, true, 0, Math.PI).rotateZ(-Math.PI / 2); // demi-tube ouvert vers le haut
        var gm = new THREE.Mesh(geo, M.gouttiere); gm.castShadow = true; gm.position.set(z ? c : (a0 + a1) / 2, yc, z ? (a0 + a1) / 2 : c); G.add(gm);
        [a0 - 0.01, a1 + 0.01].forEach(function (a) { var f = new THREE.Mesh(new THREE.CircleGeometry(RG, 16, Math.PI, Math.PI), M.gouttiere); if (!z) f.rotation.y = Math.PI / 2; f.position.set(z ? c : a, yc, z ? a : c); G.add(f); }); // fonds
        var ou = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 8), M.gouttiere); if (z) ou.rotation.x = Math.PI / 2; else ou.rotation.z = Math.PI / 2; // bord roulé
        ou.position.set(z ? c + g.s * RG : (a0 + a1) / 2, yc, z ? (a0 + a1) / 2 : c + g.s * RG); G.add(ou);
        // descente au fond (gouttière le long de la profondeur) ou à droite (le long de la largeur), contre le mur ou le poteau d'extension
        var ext = (z ? (g.s < 0 ? d.ovL : d.ovR) : (g.s > 0 ? d.ovF : d.ovB)) > 0.5;
        var paroi = ext ? g.e : g.s * (z ? L / 2 : P / 2), ap = ext ? (z ? -P / 2 + 0.06 : L / 2 - 0.06) : (z ? -P / 2 + 0.14 : L / 2 - 0.14);
        var cp = paroi + g.s * ECART, yo = yc - RG + 0.01, P3 = function (cc, y) { return z ? [cc, y, ap] : [ap, y, cc]; };
        var pts2 = [], dx = Math.abs(c - cp), yv;
        if (dx > 0.02) { pts2.push(P3(c, yo), P3(c, yo - 0.07), P3(cp, yo - 0.07 - dx)); yv = yo - 0.07 - dx; } else { pts2.push(P3(cp, yo)); yv = yo; }
        pts2.push(P3(cp, 0.14), P3(cp + g.s * 0.12, 0.04)); tuyau(pts2);
        var q = P3(cp, 0); colliers(q[0], q[2], z ? -g.s : 0, z ? 0 : -g.s, 0.14, yv);
      });
    }
    G.userData = { x0: X0, x1: X1, zF: ZF, zB: ZB, h: base + hE + rH, pret: Promise.all(attente) };
    return G;
  }

  // ───────── scène : ciel physique, soleil, herbe ─────────
  function scene(R, photo) {
    var THREE = T.THREE, S = new THREE.Scene();
    var sky = new T.Sky(); sky.scale.setScalar(4500);
    var u = sky.material.uniforms; u.turbidity.value = 2.2; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.003; u.mieDirectionalG.value = 0.8;
    var sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(145)); u.sunPosition.value.copy(sun);
    // éclairage d'ambiance et reflets : un second ciel, à portée de la caméra de mesure (0,1 à 100 m)
    var sky2 = new T.Sky(); sky2.scale.setScalar(50); ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach(function (k) { sky2.material.uniforms[k].value = u[k].value; });
    sky2.material.uniforms.sunPosition.value.copy(sun);
    var pm = new THREE.PMREMGenerator(R), envS = new THREE.Scene(); envS.add(sky2);
    S.environment = pm.fromScene(envS, 0.02).texture;
    if (!photo) { S.add(sky); S.fog = new THREE.Fog(0xc9d6df, 30, 70); }
    S.add(new THREE.HemisphereLight(0xe9f0f5, 0x6d7a4c, 0.25));
    var dl = new THREE.DirectionalLight(0xfff1dc, 3.4); dl.position.copy(sun).multiplyScalar(14); dl.castShadow = true;
    dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); dl.shadow.bias = -0.0003; dl.shadow.normalBias = 0.025; dl.shadow.radius = 3;
    S.add(dl); S.add(dl.target);
    var sol;
    if (photo) { sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.38 })); }
    else { var ht = canvasTex(THREE, herbe(), true); ht.repeat.set(36, 36); sol = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ map: ht, roughness: 1 })); }
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; S.add(sol);
    return { S: S, soleil: dl, ciel: sky, sol: sol };
  }

  // ───────── fenêtre ─────────
  var ouvert = null;
  var CSS = '.cer3d{position:fixed;inset:0;z-index:100000;background:rgba(30,30,24,.6);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Jost,Futura,Arial,sans-serif}' +
    '.cer3d .b{position:relative;width:min(1180px,100%);height:min(800px,100%);background:#cfdbe4;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}' +
    '.cer3d .zone{position:relative;width:100%;height:100%}.cer3d .zone img.fond{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}' +
    '.cer3d canvas{position:absolute;inset:0;display:block;width:100%!important;height:100%!important;touch-action:none}' +
    '.cer3d .x{position:absolute;top:12px;right:12px;z-index:3;width:40px!important;height:40px!important;min-width:0!important;padding:0!important;margin:0!important;border-radius:50%!important;border:0!important;background:#fff!important;color:#2b2b22!important;font:400 26px/40px Arial,sans-serif!important;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}' +
    '.cer3d .t{position:absolute;top:14px;left:14px;z-index:3;font-weight:600;font-size:14px;color:#2b2b22;background:rgba(255,255,255,.9);padding:6px 12px;border-radius:12px;max-width:calc(100% - 80px)}' +
    '.cer3d .v{position:absolute;left:10px;right:10px;bottom:12px;z-index:3;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}' +
    '.cer3d .v button,.cer3d .p button{border:0!important;border-radius:20px!important;padding:8px 13px!important;font:500 13px Jost,Futura,Arial,sans-serif!important;background:rgba(255,255,255,.93)!important;color:#2b2b22!important;cursor:pointer;margin:0!important;line-height:1.2!important;min-height:0!important}' +
    '.cer3d .v button.on{background:#515136!important;color:#fff!important}.cer3d .v button.fort{background:#515136!important;color:#fff!important}' +
    '.cer3d .p{position:absolute;top:60px;right:12px;z-index:4;width:min(330px,calc(100% - 24px));background:#fff;border-radius:16px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-size:14px;color:#2b2b22;line-height:1.45}' +
    '.cer3d .p h3{margin:0 0 6px;font-size:16px}.cer3d .p img.qr{display:block;margin:8px auto;width:200px;height:200px;image-rendering:pixelated}.cer3d .p small{color:#77755f}' +
    '.cer3d .ch{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;color:#2b2b22;z-index:2}' +
    '.cer3d .sl{display:flex;align-items:center;gap:8px;margin:8px 0}.cer3d .sl input{flex:1}';
  function ouvrir(mode) {
    var E = window.CerPlan; if (!E || !E.ST || !E.ST.cfg) return Promise.resolve(null);
    if (ouvert) fermer();
    var nom = E.ST.type === 'garage' ? 'garage' : E.ST.type === 'carport' ? 'carport' : 'abri';
    var ov = document.createElement('div'); ov.className = 'cer3d';
    ov.innerHTML = '<style>' + CSS + '</style><div class="b"><div class="zone"><div class="ch">Préparation de la vue 3D…</div></div>' +
      '<span class="t">Votre ' + nom + ' en 3D · glissez pour tourner</span><button class="x" type="button" aria-label="Fermer">×</button>' +
      '<div class="v"><button data-v="trois" class="on">3/4</button><button data-v="face">Devant</button><button data-v="gauche">Gauche</button><button data-v="droite">Droite</button><button data-v="fond">Derrière</button><button data-v="dessus">Dessus</button><button data-v="tour">Tourner</button>' +
      '<button data-a="ar" class="fort">Voir chez moi (réalité augmentée)</button><button data-a="photo">Sur une photo de mon jardin</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.x').onclick = fermer; ov.addEventListener('click', function (e) { if (e.target === ov) fermer(); });
    return charger().then(function () { return monter(ov, null); }).then(function () { if (mode === 'photo') choisirPhoto(); return ov; })
      .catch(function (err) { var ch = ov.querySelector('.ch'); if (ch) ch.textContent = 'La vue 3D n’a pas pu se charger sur cet appareil.'; if (window.console) console.warn('[Cerisier 3D]', err); });
  }
  function fermer() { if (!ouvert) return; cancelAnimationFrame(ouvert.raf); try { ouvert.R.dispose(); } catch (e) {} ouvert.ov.remove(); ouvert = null; }
  function monter(ov, photo) {
    var THREE = T.THREE, E = window.CerPlan, zone = ov.querySelector('.zone'), b = ov.querySelector('.b');
    if (ouvert) { cancelAnimationFrame(ouvert.raf); try { ouvert.R.dispose(); } catch (e) {} zone.querySelectorAll('canvas,img.fond').forEach(function (n) { n.remove(); }); }
    // avec une photo, la zone prend les proportions de la photo
    if (photo) { var k = photo.naturalWidth / photo.naturalHeight, W = b.clientWidth, H = b.clientHeight; if (W / H > k) { zone.style.width = Math.round(H * k) + 'px'; zone.style.height = H + 'px'; } else { zone.style.width = W + 'px'; zone.style.height = Math.round(W / k) + 'px'; }
      var im = document.createElement('img'); im.className = 'fond'; im.src = photo.src; zone.appendChild(im); } else { zone.style.width = zone.style.height = '100%'; }
    var R = new THREE.WebGLRenderer({ antialias: true, alpha: !!photo, preserveDrawingBuffer: true });
    R.setPixelRatio(Math.min(window.devicePixelRatio, 2)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.62; R.outputColorSpace = THREE.SRGBColorSpace;
    zone.appendChild(R.domElement);
    var sc = scene(R, !!photo), G = construire(E), u = G.userData;
    G.traverse(function (o) { if (o.isMesh && o.material && !o.material.transparent) o.material.envMapIntensity = 0.45; });
    sc.S.add(G);
    if (!photo) { // ombre de contact sous l'abri
      var om = new THREE.Mesh(new THREE.PlaneGeometry((u.x1 - u.x0) * 1.5, (u.zF - u.zB) * 1.5), new THREE.MeshBasicMaterial({ map: canvasTex(THREE, ombreDouce()), transparent: true, depthWrite: false, opacity: 0.55 }));
      om.rotation.x = -Math.PI / 2; om.position.set((u.x0 + u.x1) / 2, 0.004, (u.zF + u.zB) / 2); sc.S.add(om);
    }
    var cam = new THREE.PerspectiveCamera(35, 1, 0.1, 9000), ctl = new T.OrbitControls(cam, R.domElement);
    ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.495; ctl.minDistance = 2.5; ctl.maxDistance = 40; ctl.enablePan = !!photo;
    var cible = new THREE.Vector3((u.x0 + u.x1) / 2, Math.min(1.3, u.h / 2), (u.zF + u.zB) / 2), r = Math.max(u.x1 - u.x0, u.zF - u.zB, 3) * 2;
    var VUES = { trois: [0.62, 0.42, 1.3], face: [0, 0.28, 1], gauche: [-1, 0.28, 0.15], droite: [1, 0.28, 0.15], fond: [0.15, 0.28, -1], dessus: [0.25, 1.6, 0.55] };
    var anim = null, recul = function (v) { return r * (v === 'dessus' ? 1.35 : 1) * Math.max(1, Math.pow(1.4 / Math.max(0.4, cam.aspect), 0.6)); };
    var vers = function (v, inst) { var p = new THREE.Vector3().fromArray(VUES[v]).normalize().multiplyScalar(recul(v)).add(cible);
      ov.querySelectorAll('.v [data-v]').forEach(function (x) { x.classList.toggle('on', x.dataset.v === v); });
      if (inst) { cam.position.copy(p); ctl.target.copy(cible); } else anim = { t0: performance.now(), p0: cam.position.clone(), p1: p }; };
    var taille = function () { var w = zone.clientWidth, h = zone.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    var ro = new ResizeObserver(taille); ro.observe(zone); taille(); vers('trois', true);
    ouvert = { ov: ov, R: R, S: sc.S, G: G, cam: cam, ctl: ctl, sc: sc, vers: vers, photo: photo, raf: 0 };
    var boucle = function (t) { if (!ouvert || ouvert.R !== R) return; ouvert.raf = requestAnimationFrame(boucle);
      if (anim) { var k = Math.min(1, (t - anim.t0) / 700), s = k * k * (3 - 2 * k); cam.position.lerpVectors(anim.p0, anim.p1, s); if (k >= 1) anim = null; }
      ctl.update(); R.render(sc.S, cam); };
    var ch = ov.querySelector('.ch');
    return u.pret.then(function () { if (ch) ch.remove(); boucle(performance.now()); actions(ov); return ov; });
  }
  function actions(ov) {
    if (ov.__actions) return; ov.__actions = true;
    ov.querySelector('.v').addEventListener('click', function (e) {
      var bt = e.target.closest('button'); if (!bt || !ouvert) return;
      if (bt.dataset.v === 'tour') { ouvert.ctl.autoRotate = !ouvert.ctl.autoRotate; bt.classList.toggle('on', ouvert.ctl.autoRotate); }
      else if (bt.dataset.v) ouvert.vers(bt.dataset.v);
      else if (bt.dataset.a === 'ar') realiteAugmentee(bt);
      else if (bt.dataset.a === 'photo') choisirPhoto();
      else if (bt.dataset.a === 'valider') validerMontage();
    });
  }

  // ───────── insertion sur une photo du jardin ─────────
  function choisirPhoto() {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f || !ouvert) return;
      var im = new Image(); im.onload = function () {
        var ov = ouvert.ov; ov.querySelector('.t').textContent = 'Placez l’abri : glissez pour tourner, pincez pour la taille, deux doigts (ou clic droit) pour déplacer';
        var v = ov.querySelector('.v'); v.querySelectorAll('[data-a],[data-v]').forEach(function (x) { if (x.dataset.v !== 'tour') x.style.display = 'none'; });
        if (!v.querySelector('[data-a=valider]')) v.insertAdjacentHTML('beforeend', '<button data-a="valider" class="fort">Valider le montage</button>');
        monter(ov, im).then(function () {
          var p = document.createElement('div'); p.className = 'p'; p.innerHTML = '<h3>Ajuster la lumière</h3><div class="sl"><span>Soleil</span><input type="range" min="0" max="360" value="145" class="az"></div><small>Faites tourner le soleil pour que l’ombre de l’abri parte dans le même sens que les ombres de la photo.</small>';
          ov.querySelector('.b').appendChild(p);
          p.querySelector('.az').addEventListener('input', function (e) { var a = T.THREE.MathUtils.degToRad(+e.target.value), s = ouvert.sc.soleil;
            s.position.setFromSphericalCoords(14, T.THREE.MathUtils.degToRad(90 - 38), a); });
        });
      };
      im.src = URL.createObjectURL(f);
    };
    inp.click();
  }
  function composite(cb) { // photo + abri en une image
    var o = ouvert, cv = o.R.domElement, c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    var g = c.getContext('2d'); if (o.photo) g.drawImage(o.photo, 0, 0, c.width, c.height); o.R.render(o.S, o.cam); g.drawImage(cv, 0, 0);
    return c;
  }
  function validerMontage() {
    if (!ouvert) return; var c = composite(), url = c.toDataURL('image/jpeg', 0.9);
    window.CerVue3D.montage = url;
    var a = document.createElement('a'); a.href = url; a.download = 'mon-abri-dans-mon-jardin.jpg'; document.body.appendChild(a); a.click(); a.remove();
    var p = ouvert.ov.querySelector('.p'); if (p) p.innerHTML = '<h3>Montage enregistré</h3><small>L’image est téléchargée. Elle sera reprise dans votre dossier mairie (document d’insertion).</small>';
  }
  // image du projet pour le dossier mairie : vue 3/4 (ou le montage photo s'il existe)
  function capture(vue) {
    if (window.CerVue3D.montage && !vue) return Promise.resolve(window.CerVue3D.montage);
    return ouvrir().then(function () { if (!ouvert) return null; ouvert.vers(vue || 'trois', true); ouvert.ctl.update(); var url = composite().toDataURL('image/jpeg', 0.9); fermer(); return url; });
  }

  // ───────── réalité augmentée ─────────
  var ua = navigator.userAgent, IOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), ANDROID = /Android/i.test(ua);
  function modeleExport() { // copie de l'abri seule, posée au sol, centrée
    var THREE = T.THREE, g = ouvert.G.clone(true), u = ouvert.G.userData, sc = new THREE.Scene(); g.position.set(-(u.x0 + u.x1) / 2, 0, -(u.zF + u.zB) / 2); sc.add(g);
    var doubles = [];
    g.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      if (o.material.isMeshPhysicalMaterial) o.material = new THREE.MeshStandardMaterial({ color: 0x9fb4c0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
      if (o.material.side === THREE.DoubleSide && o.geometry.index) doubles.push(o);
    });
    // USDZ (iPhone) n'affiche qu'une face : chaque surface « deux faces » (murs de côté, fermetures, gouttières) reçoit sa face retournée
    doubles.forEach(function (o) {
      var mat = o.material.clone(); mat.side = THREE.FrontSide; o.material = mat;
      var geo = o.geometry.clone(), ix = geo.index.array, nr = geo.attributes.normal;
      for (var i = 0; i < ix.length; i += 3) { var t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
      if (nr) { for (var j = 0; j < nr.count; j++) nr.setXYZ(j, -nr.getX(j), -nr.getY(j), -nr.getZ(j)); }
      var dos = new THREE.Mesh(geo, mat); dos.position.copy(o.position); dos.quaternion.copy(o.quaternion); dos.scale.copy(o.scale); o.parent.add(dos);
    });
    return sc;
  }
  function deposer(glb, usdz) {
    var c = CFG(); if (!c.rest) return Promise.reject(new Error('dépôt indisponible'));
    var fd = new FormData(); fd.append('jeton', c.jeton || ''); if (glb) fd.append('glb', new Blob([glb], { type: 'model/gltf-binary' }), 'abri.glb'); if (usdz) fd.append('usdz', new Blob([usdz], { type: 'model/vnd.usdz+zip' }), 'abri.usdz');
    return fetch(c.rest + 'ar', { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('dépôt refusé (' + r.status + ')'); return r.json(); });
  }
  function qr(texte) {
    return new Promise(function (res) {
      var go = function () { var q = window.qrcode(0, 'M'); q.addData(texte); q.make(); res(q.createDataURL(6, 2)); };
      if (window.qrcode) return go();
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = go; s.onerror = function () { res(null); }; document.head.appendChild(s);
    });
  }
  function realiteAugmentee(bt) {
    if (!ouvert) return; var old = bt.textContent, o = ouvert; bt.textContent = 'Préparation…';
    var panneau = function (html) { if (ouvert !== o) return null; // fenêtre fermée entre-temps
      var p = o.ov.querySelector('.p'); if (!p) { p = document.createElement('div'); p.className = 'p'; o.ov.querySelector('.b').appendChild(p); } p.innerHTML = html; return p; };
    exporteurs().then(function (X) {
      if (ouvert !== o) return;
      var sc = modeleExport();
      var usdzP = new X.USDZExporter().parse(sc);
      var glbP = new Promise(function (res, rej) { new X.GLTFExporter().parse(sc, res, rej, { binary: true }); });
      if (IOS) return Promise.resolve(usdzP).then(function (u) {
        var url = URL.createObjectURL(new Blob([u], { type: 'model/vnd.usdz+zip' })), a = document.createElement('a');
        a.rel = 'ar'; a.href = url + '#allowsContentScaling=0'; a.appendChild(document.createElement('img')); document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
        bt.textContent = old;
      });
      return Promise.all([glbP, usdzP]).then(function (r) { return deposer(r[0], r[1]); }).then(function (rep) {
        bt.textContent = old;
        if (ANDROID) {
          var intent = 'intent://arvr.google.com/scene-viewer/1.0?file=' + encodeURIComponent(rep.glb) + '&mode=ar_preferred&title=' + encodeURIComponent('Mon abri Cerisier') +
            '#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(rep.page) + ';end;';
          location.href = intent; return;
        }
        return qr(rep.page).then(function (img) {
          panneau('<h3>Voir l’abri dans votre jardin</h3>Scannez ce code avec votre téléphone, puis touchez « Voir dans mon jardin » et visez le sol.' +
            (img ? '<img class="qr" alt="QR code" src="' + img + '">' : '') + '<small>Lien valable 30 jours : ' + rep.page.replace(/^https?:\/\//, '') + '</small>');
        });
      });
    }).catch(function (e) { bt.textContent = old; panneau('<h3>Réalité augmentée indisponible</h3><small>' + (e && e.message ? e.message : 'Réessayez plus tard.') + '</small>'); });
  }

  return { ouvrir: ouvrir, fermer: fermer, capture: capture, vue: function (v) { if (ouvert) ouvert.vers(v); }, montage: null };
})();
