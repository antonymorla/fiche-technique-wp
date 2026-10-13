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
  // Photos de bois (textures SketchUp du dossier « 4• Textures », fil horizontal, raccordables, 1 m de large) : lames du moteur et bois massif.
  // vert : zones = bandes sans nœud (pixels), noeuds = [x, y, largeur, hauteur] des nœuds reposés au hasard, petits = petits nœuds par m².
  var PHOTOS = {
    vert: ['pin-autoclave-vert.jpg', { zones: [[0, 165], [250, 400], [555, 816]], noeuds: [[410, 205, 120, 100], [300, 450, 120, 105]], petits: 5 }],
    // brun = la photo du vert recolorée (même fil, mêmes nœuds) : demande d'Antony
    brun: ['bois-brun.jpg', { zones: [[0, 165], [250, 400], [555, 816]], noeuds: [[410, 205, 120, 100], [300, 450, 120, 105]], petits: 5 }], gris: ['bois-gris.jpg', { petits: 0 }], noir: ['bois-noir.jpg', { petits: 0 }], ayous: ['bois-ayous.jpg', { petits: 0 }]
  };
  function enDataUrl(url) {
    return /^data:/.test(url) ? Promise.resolve(url) : fetch(url).then(function (r) { if (!r.ok) throw new Error('texture'); return r.blob(); })
      .then(function (b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); });
  }
  function chargerTexture(cle) {
    var url = (CFG().photos && CFG().photos[cle]) || (cle === 'vert' && CFG().bois) || texUrl(PHOTOS[cle][0]);
    return enDataUrl(url).then(function (data) { return new Promise(function (res) { var im = new Image();
      im.onload = function () { res(Object.assign({ url: data, w: im.naturalWidth, h: im.naturalHeight, m: [1, im.naturalHeight / im.naturalWidth], img: im }, PHOTOS[cle][1])); };
      im.onerror = function () { res(null); }; im.src = data; }); }).catch(function () { return null; }); // sans la photo : bois dessiné du moteur
  }
  function chargerBois() {
    if (BOIS) return Promise.resolve(BOIS);
    var cles = Object.keys(PHOTOS);
    return Promise.all(cles.map(chargerTexture)).then(function (r) { BOIS = {}; cles.forEach(function (k, i) { if (r[i]) BOIS[k] = r[i]; }); return BOIS; });
  }
  function avecBois(E, f) { var sv = E.ST.boisPhoto; E.ST.boisPhoto = BOIS && Object.keys(BOIS).length ? BOIS : null; try { return f(); } finally { E.ST.boisPhoto = sv; } }
  function exporteurs() {
    return Promise.all([import(BASE + 'examples/jsm/exporters/GLTFExporter.js/+esm'), import(BASE + 'examples/jsm/exporters/USDZExporter.js/+esm')])
      .then(function (r) { return { GLTFExporter: r[0].GLTFExporter, USDZExporter: r[1].USDZExporter }; });
  }
  var CFG = function () { return window.CER_3D || {}; };
  // pendant le chargement : un abri qui se construit (lames du mur une à une, toiture, porte), en boucle
  var CHARGE_CSS = '.cer3d .ch{flex-direction:column;gap:14px;font-weight:500}.cer3d .ch svg{width:min(260px,60vw);height:auto}' +
    '@keyframes cer3dL{0%,8%{opacity:0;transform:translateY(-14px)}18%,86%{opacity:1;transform:none}100%{opacity:0}}' +
    '.cer3d .ch .l,.cer3d .ch .t,.cer3d .ch .p{opacity:0;animation:cer3dL 3.2s ease-out infinite;transform-box:fill-box}';
  var CHARGE_HTML = (function () {
    var l = ''; for (var i = 0; i < 7; i++) l += '<rect class="l" x="50" y="' + (150 - (i + 1) * 13) + '" width="160" height="12" rx="1.5" fill="#bdb07e" stroke="#857a50" stroke-width="1" style="animation-delay:' + (i * 0.16) + 's"/>';
    return '<svg viewBox="0 0 260 190" aria-hidden="true"><line x1="10" y1="151" x2="250" y2="151" stroke="#6f8a48" stroke-width="4" stroke-linecap="round"/>' + l +
      '<polygon class="t" points="36,61 130,12 224,61 210,61 130,26 50,61" fill="#43474b" style="animation-delay:1.2s"/>' +
      '<polygon class="t" points="50,61 130,26 210,61" fill="#d2c799" stroke="#857a50" stroke-width="1" style="animation-delay:1.05s"/>' +
      '<rect class="p" x="112" y="95" width="36" height="55" fill="#a99a62" stroke="#5f5333" stroke-width="1.5" style="animation-delay:1.45s"/></svg>' +
      '<span>Construction de votre abri en 3D…</span>';
  })();
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
  var SAFARI = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  function rasteriser(svg, x0, y0, w, h) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { var c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h)); var g = c.getContext('2d');
        var fin = function () { g.clearRect(0, 0, c.width, c.height); g.drawImage(img, -x0, -y0);
          // vitres claires (magenta du moteur) : rendues transparentes, la vitre 3D posée devant fait le reflet
          var id = g.getImageData(0, 0, c.width, c.height), px = id.data, vu = false;
          for (var i = 0; i < px.length; i += 4) { if (px[i] - px[i + 1] > 60 && px[i + 2] - px[i + 1] > 60) { px[i + 3] = 0; vu = true; } } // magenta et ses bords adoucis (le bois n'est jamais magenta)
          if (vu) g.putImageData(id, 0, 0);
          c.cerVitre = vu; res(c); };
        // Safari dessine parfois le SVG avant d'avoir décodé les photos de bois qu'il contient : il ne restait que les joints (bardage noir et blanc,
        // une fois sur deux, remarque d'Antony du 13/10/2026). On redessine jusqu'à ce que l'image ne change plus (2 s au plus).
        if (!SAFARI) { fin(); return; }
        var emp = function () { g.clearRect(0, 0, c.width, c.height); g.drawImage(img, -x0, -y0); var dd = g.getImageData(0, 0, c.width, c.height).data, s = 0, n = 0;
          for (var i = 0; i < dd.length; i += 4 * 97) { s = (s + dd[i] * 3 + dd[i + 1] * 5 + dd[i + 2] * 7 + dd[i + 3]) % 1000000007; n++; } return s + ':' + n; };
        var av = emp(), tours = 0, suite = function () { var ap = emp(); tours++; if (ap === av && tours >= 2 || tours >= 8) fin(); else { av = ap; setTimeout(suite, 250); } };
        setTimeout(suite, 200); };
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
  function boisMassifPhoto(V) {
    V = V || BOIS.vert; var S = Math.round(0.12 * V.w), c = document.createElement('canvas'); c.width = 4 * S; c.height = V.w;
    var g = c.getContext('2d');
    var zs = (V.zones || [[0, V.h]]).map(function (z) { return [z[0], Math.min(z[1], V.h) - S]; }).filter(function (z) { return z[1] >= z[0]; }); // bandes sans gros nœud
    for (var k = 0; k < 4; k++) { var z = zs[Math.floor(Math.random() * zs.length)] || [0, V.h - S], r = z[0] + Math.random() * (z[1] - z[0]); g.save(); g.translate(k * S + S, 0); g.rotate(Math.PI / 2); g.drawImage(V.img, 0, r, V.w, S, 0, 0, V.w, S); g.restore(); }
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
  // pelouse en relief (demande d'Antony) : des dizaines de milliers de brins dessinés par le navigateur, rien à télécharger ;
  // autour de l'abri, jamais à l'intérieur ; moins dense sur téléphone ; hors des exports de réalité augmentée (seul l'abri est exporté)
  function pelouse(THREE, u) {
    var tel = window.matchMedia && matchMedia('(pointer:coarse)').matches, n = tel ? 20000 : 60000, cx = (u.x0 + u.x1) / 2, cz = (u.zF + u.zB) / 2;
    var R0 = Math.max(u.x1 - u.x0, u.zF - u.zB) / 2 + 5, L2 = (u.L || 0) / 2 + 0.06, P2 = (u.P || 0) / 2 + 0.06;
    var g = new THREE.BufferGeometry(); // un brin : effilé en trois étages, un peu courbé ; base en 0, hauteur 1
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.36, 0.4, 0.04, 0.36, 0.4, 0.04, -0.18, 0.75, 0.11, 0.18, 0.75, 0.11, 0, 1, 0.22], 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]); g.computeVertexNormals();
    g.setAttribute('color', new THREE.Float32BufferAttribute([0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.82, 0.82, 0.78, 0.82, 0.82, 0.78, 1.02, 1.04, 0.92, 1.02, 1.04, 0.92, 1.15, 1.15, 1.0, ], 3)); // pied sombre, pointe claire (écart réduit : moins de scintillement)
    var im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide, vertexColors: true }), n), o = new THREE.Object3D(), c = new THREE.Color(), k = 0, R = Math.random;
    for (var i = 0; i < n * 3 && k < n; i++) {
      var rr = Math.pow(R(), 0.62) * R0, a = R() * 6.2832, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      if (Math.abs(x) < L2 && Math.abs(z) < P2) continue; // pas d'herbe dans l'abri
      if (u.tx1 > u.tx0 && x > u.tx0 - 0.03 && x < u.tx1 + 0.03 && z > u.tz0 - 0.03 && z < u.tz1 + 0.03) continue; // ni sous la terrasse
      if (R() < Math.pow(rr / R0, 2.5)) continue; // de moins en moins de brins vers le bord : pas de limite visible
      var h = 0.08 + R() * 0.1, w = 0.014 + R() * 0.01; // assez larges pour ne pas scintiller au loin quand on tourne
      o.position.set(x, 0, z); o.rotation.set((R() - 0.5) * 0.35, R() * 6.2832, (R() - 0.5) * 0.35); o.scale.set(w, h, h); o.updateMatrix(); im.setMatrixAt(k, o.matrix);
      c.setHSL(0.23 + R() * 0.06, 0.5 + R() * 0.2, 0.12 + R() * 0.1); im.setColorAt(k, c); k++; // verts du sol, plus ou moins foncés
    }
    im.count = k; im.receiveShadow = true; im.frustumCulled = false; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return im;
  }
  // horizon de jardin (Antony, 13/10/2026 : « une 3D plus réaliste ») : haie basse et rideau d'arbres peints par le navigateur sur un anneau
  // à 55 m (au-delà du recul maximal de la caméra, 40 m), voilés d'une brume peinte ; rien à télécharger, absent des fichiers de réalité augmentée
  function decor(THREE) {
    var PXM = 35.5, W = 2048, H = 704, R = Math.random, BRUME = [201, 214, 223];
    var c = dessin(W, H, function (g) {
      var teinte = function (hx, k, voile) { // vert du feuillage, éclairci ou assombri, voilé vers la couleur de la brume
        var n = parseInt(hx.slice(1), 16), f = function (v, b) { v = Math.max(0, Math.min(255, v * (1 + k))); return Math.round(v + (b - v) * voile); };
        return 'rgb(' + f(n >> 16, BRUME[0]) + ',' + f((n >> 8) & 255, BRUME[1]) + ',' + f(n & 255, BRUME[2]) + ')';
      };
      var VERTS = ['#2b4126', '#334c2b', '#3c5832', '#46633a', '#517040', '#5c7a47'];
      var arbre = function (x, hM, rM, voile) { // tronc, puis le houppier en petites touffes (plus claires en haut, côté soleil) ; raccord des bords
        var yb = H, h = hM * PXM, r = rM * PXM, n = Math.round(90 + r * 0.9);
        [x, x - W, x + W].forEach(function (xx) {
          if (xx + r < 0 || xx - r > W) return;
          g.fillStyle = teinte('#3e3226', 0, voile); g.fillRect(xx - r * 0.05, yb - h * 0.5, r * 0.1, h * 0.5);
          for (var i = 0; i < n; i++) {
            var a = R() * 6.283, d = Math.pow(R(), 0.6) * r, cx = xx + Math.cos(a) * d * 1.05, cy = yb - h + r * 1.05 + Math.sin(a) * d * 0.9, rr = r * (0.07 + R() * 0.12);
            var haut = (cy - (yb - h + r)) / r, cote = (cx - xx) / r; // -1 en haut / à gauche
            g.fillStyle = teinte(VERTS[Math.floor(R() * VERTS.length)], -0.22 * haut - 0.08 * cote + (R() - 0.5) * 0.16, voile);
            g.beginPath(); g.ellipse(cx, cy, rr * (0.8 + R() * 0.5), rr, R() * 3.14, 0, 6.283); g.fill();
          }
        });
      };
      var x; // quatre plans : bois lointain continu (pas de ciel entre les troncs), arbres du fond (plus voilés), arbres proches, haie
      g.fillStyle = teinte('#30472a', 0, 0.66); g.beginPath(); g.moveTo(0, H);
      var ph = [R() * 6.28, R() * 6.28, R() * 6.28];
      for (x = 0; x <= W; x += 8) { // crête du bois : sinus entiers sur la largeur (raccord du motif) + bosses
        var cr = (6.5 + 1.1 * Math.sin(x / W * 6.283 * 3 + ph[0]) + 0.7 * Math.sin(x / W * 6.283 * 11 + ph[1]) + 0.35 * Math.sin(x / W * 6.283 * 37 + ph[2])) * PXM;
        g.lineTo(x, H - cr - R() * 6);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
      for (x = 0; x < W; x += 28 + R() * 46) arbre(x, 8 + R() * 5, 2.4 + R() * 1.6, 0.58);
      for (x = 0; x < W; x += 70 + R() * 120) arbre(x, 6 + R() * 4, 2.2 + R() * 1.3, 0.42);
      for (x = -20; x < W + 20; x += 10 + R() * 14) { // haie : 1,4 à 2,2 m
        var hh = (1.4 + R() * 0.8) * PXM, rb = 0.5 * PXM + R() * 12;
        for (var i = 0; i < 14; i++) { g.fillStyle = teinte(VERTS[Math.floor(R() * VERTS.length)], (R() - 0.6) * 0.22, 0.36); g.beginPath(); g.arc(x + (R() - 0.5) * 18, H - hh + rb * 0.6 + R() * (hh - rb), rb * (0.3 + R() * 0.35), 0, 6.283); g.fill(); }
      }
      g.fillStyle = teinte('#2b4126', -0.1, 0.36); g.fillRect(0, H - 0.6 * PXM, W, 0.6 * PXM); // pied de la haie, sans jour
      // grain du feuillage : points clairs et sombres, seulement sur ce qui est déjà peint
      g.globalCompositeOperation = 'source-atop';
      for (var k = 0; k < 26000; k++) { g.fillStyle = R() < 0.5 ? 'rgba(20,30,15,.22)' : 'rgba(235,240,215,.13)'; g.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
      g.globalCompositeOperation = 'source-over';
    });
    var tx = canvasTex(THREE, c, true); tx.wrapT = THREE.ClampToEdgeWrapping; tx.repeat.set(6, 1); // 6 motifs de 57,6 m sur le tour (345 m)
    var m = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, H / PXM, 120, 1, true), new THREE.MeshBasicMaterial({ map: tx, alphaTest: 0.5, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    m.position.y = H / PXM / 2 - 0.05; m.renderOrder = -1; return m;
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
  function parePluie() { // écran pare-pluie anthracite : toile non tissée, bandes de recouvrement
    return dessin(512, 512, function (g, w, h) {
      g.fillStyle = '#2c2f33'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 7000; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.05 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, h * 0.48, w, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, h * 0.48 + 3, w, 2);
    });
  }
  function laine() { // laine de roche : fibres jaune-vert
    return dessin(512, 512, function (g, w, h) {
      g.fillStyle = '#b8aa6c'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 9000; i++) { var v = Math.random(); g.strokeStyle = 'rgba(' + (120 + v * 90) + ',' + (110 + v * 80) + ',' + (50 + v * 50) + ',.35)'; g.lineWidth = 0.6 + Math.random();
        var x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.3, l = 4 + Math.random() * 14; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    });
  }
  function dessousBac() { // bac acier vu d'en dessous : nervures tous les 25 cm (une tuile = 1 m de large)
    return dessin(256, 64, function (g, w, h) {
      g.fillStyle = '#eceeef'; g.fillRect(0, 0, w, h); // sous-face prélaquée blanche
      for (var i = 0; i < 4; i++) { var x = i * w / 4; g.fillStyle = '#c3c8cc'; g.fillRect(x, 0, w / 4 * 0.28, h); g.fillStyle = '#ffffff'; g.fillRect(x + w / 4 * 0.28, 0, 3, h); }
    });
  }
  function dalle() { // dalle béton
    return dessin(512, 512, function (g, w, h) {
      g.fillStyle = '#a9a69d'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 16000; i++) { var v = Math.random(); g.fillStyle = 'rgba(' + (v > .5 ? '255,255,255' : '40,40,36') + ',' + Math.random() * 0.08 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    });
  }
  // Shingle à l'échelle réelle (bardeaux de 33 cm, rangs de 14,3 cm), sans motif qui se répète : chaque languette prend le grain
  // d'un endroit tiré au hasard de la photo SketchUp, avec une nuance légère ; décalage aléatoire d'un rang à l'autre. Tuile de 4 m.
  function shingleCanvas(img) {
    var PXM2 = 256, M4 = 4, c = document.createElement('canvas'); c.width = c.height = PXM2 * M4; var g = c.getContext('2d');
    var rh = 0.143 * PXM2, tw = 0.333 * PXM2, sw = img.naturalWidth, sh = img.naturalHeight, k = sw / 1.0 / PXM2; // pixels de la photo par pixel du dessin (photo = 1 m de large)
    for (var y = 0; y < c.height; y += rh) {
      var dx = -Math.random() * tw;
      for (var x = dx; x < c.width; x += tw) {
        var w = tw * k, h = rh * k, sx = Math.random() * (sw - w), sy = Math.random() * Math.max(1, sh - h);
        g.drawImage(img, sx, sy, w, h, x, y, tw + 0.5, rh + 0.5);
        var v = (Math.random() - 0.5) * 0.16; g.fillStyle = v < 0 ? 'rgba(0,0,0,' + (-v) + ')' : 'rgba(255,255,255,' + v * 0.6 + ')'; g.fillRect(x, y, tw, rh);
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x + tw - 1.5, y + rh * 0.12, 1.5, rh * 0.88); // fente entre languettes
      }
      var gr = g.createLinearGradient(0, y + rh - 4, 0, y + rh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)');
      g.fillStyle = gr; g.fillRect(0, y + rh - 4, c.width, 4); // ombre du rang du dessus
    }
    return c;
  }
  function boisDeBout() { // bout d'un madrier : bois de bout clair, cernes, joints sombres entre rangs (une tuile = un rang)
    return dessin(128, 128, function (g, w, h) {
      g.fillStyle = '#b4a87a'; g.fillRect(0, 0, w, h); // teinte moyenne des lames (mesurée), cernes un peu plus sombres
      for (var r = 8; r < 120; r += 7) { g.strokeStyle = 'rgba(95,78,38,' + (0.25 + Math.random() * 0.2) + ')'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(w * 0.5, h * 1.15, r * 0.8, r, 0, 0, 7); g.stroke(); }
      g.fillStyle = 'rgba(70,58,30,.55)'; g.fillRect(0, h - 6, w, 6); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, w, 3);
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
    var quadro = !!d.isQuadro, plat = d.toit === 'TOIT_PLAT' && !quadro, orient = d.orient || fv('f-orient'), carport = ST.type === 'carport';
    var bois = ['#bdb07e', '#857a50', '#d2c799'];
    var M = {
      massif: new THREE.MeshStandardMaterial({ map: BOIS && BOIS.vert ? (function () { var t = canvasTex(THREE, boisMassifPhoto(), true); t.wrapT = THREE.MirroredRepeatWrapping; return t; })() : canvasTex(THREE, boisMassif(bois)), roughness: 0.8 }),
      noir: new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.45, metalness: 0.4 }),
      parpaing: new THREE.MeshStandardMaterial({ color: 0xb9b7ae, roughness: 0.95 }),
      galva: new THREE.MeshStandardMaterial({ color: 0xa3a8ad, roughness: 0.4, metalness: 0.65 }),
      enduit: new THREE.MeshStandardMaterial({ color: 0xe2ddd2, roughness: 0.97 }),
      gouttiere: new THREE.MeshStandardMaterial({ color: 0x383e42, roughness: 0.42, metalness: 0.3, side: THREE.DoubleSide }), // gris anthracite RAL 7016
      interieur: new THREE.MeshStandardMaterial({ color: 0x2b2a24, roughness: 1 }),
      verre: new THREE.MeshPhysicalMaterial({ color: 0xdfe9ee, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }),
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
    var BV = !!(BOIS && BOIS.vert);
    // bois de la teinte du bardage (rives, bandeaux, tableaux : règle d'Antony) ; les poteaux et la structure restent en autoclave vert
    var phB = (E.wallFin(d) || {}).ph;
    M.bard = phB && phB !== 'vert' && BOIS && BOIS[phB] ? new THREE.MeshStandardMaterial({ map: (function () { var t = canvasTex(THREE, boisMassifPhoto(BOIS[phB]), true); t.wrapT = THREE.MirroredRepeatWrapping; return t; })(), roughness: 0.8 }) : M.massif;
    // U de finition (profil validé par Antony le 13/10/2026) : coiffe le bout des madriers sur toute la hauteur ; parois de 6 mm de part et d'autre
    // de la lame, 20 mm sur les lames, fond de 10 mm, coins extérieurs arrondis. Origine : bout des lames, au milieu de l'épaisseur ; s = sens vers l'extérieur
    var profilU = function (s, h) {
      var e = wt / 2, hw = e + 0.006, r = 0.006, dx = 0.02, f = 0.01, sh = new THREE.Shape();
      sh.moveTo(-dx * s, -hw); sh.lineTo((f - r) * s, -hw); sh.quadraticCurveTo(f * s, -hw, f * s, -hw + r); sh.lineTo(f * s, hw - r);
      sh.quadraticCurveTo(f * s, hw, (f - r) * s, hw); sh.lineTo(-dx * s, hw); sh.lineTo(-dx * s, e); sh.lineTo(0, e); sh.lineTo(0, -e); sh.lineTo(-dx * s, -e); sh.closePath();
      var geo = new THREE.ExtrudeGeometry(sh, { depth: h + 0.005, bevelEnabled: false, curveSegments: 4 }); geo.rotateX(-Math.PI / 2);
      var uv = geo.attributes.uv, v0 = Math.random() * 2; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, v0 + uv.getY(i)); // fil du bois vertical
      var me = new THREE.Mesh(geo, M.massif); me.castShadow = me.receiveShadow = true; return me;
    };
    var massif = function (w, h, dd, axe, mat) {
      var m = boite(w, h, dd, mat || M.massif, true), geo = m.geometry, uv = geo.attributes.uv, pos = geo.attributes.position;
      var ax = axe === 'x' ? 0 : axe === 'z' ? 2 : 1, len = [w, h, dd][ax], v0 = Math.random() * 2;
      var co = function (i) { return [pos.getX(i), pos.getY(i), pos.getZ(i)][ax]; };
      for (var f = 0; f < 6; f++) {
        var i0 = f * 4, uLong = Math.abs(co(i0) - co(i0 + 1)) > 1e-6; // les sommets 0 et 1 d'une face diffèrent par u
        for (var k = 0; k < 4; k++) { var i = i0 + k, u = uv.getX(i), v = uv.getY(i); if (uLong) { var t = u; u = v; v = t; }
          uv.setXY(i, BV ? ([0, 1, 1, 0, 2, 3][f] + u) / 4 : u, BV ? v0 + v * len : v); }
      }
      return m;
    };

    // ── intérieur : madriers, ou ossature 45×70 tous les 60 cm (relevé sur les modèles SketchUp) en pin autoclave vert,
    //    avec pare-pluie (option), laine de roche entre montants (option), ou doublage OSB / contreplaqué (tripli) / sapin rouge qui les cache ──
    var oss = d.sys === 'ossature' || quadro, wt = Math.max(0.025, d.wt || 0.027), iso = fv('f-isom') || 'non', pp = fv('f-pp') === 'oui';
    var doub = { osb: ['osb', 'int-osb.jpg', 1.25], cp: ['tripli', 'int-tripli.jpg', 1], sapin: ['sapin', 'int-sapin.jpg', 0.88] }[iso];
    // OSB sans répétition (remarque d'Antony, 13/10/2026 : « texture OSB trop répétitive ») : la photo est lue à deux décalages tirés
    // d'un bruit lent et fondus l'un dans l'autre (le motif ne revient plus tous les 1,25 m), et les joints des panneaux de
    // 1,25 × 2,50 m sont tracés, d'un trait fin à toute distance. Seul l'affichage change : les fichiers de réalité augmentée gardent la photo.
    var osbVivant = function (mt) {
      mt.onBeforeCompile = function (sh) {
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'float cerH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nvoid main() {')
          .replace('#include <map_fragment>', ['#ifdef USE_MAP',
            '  vec2 uvO = vMapUv, dxO = dFdx(uvO), dyO = dFdy(uvO), iO = floor(uvO * 0.45), fO = fract(uvO * 0.45); fO = fO * fO * (3.0 - 2.0 * fO);',
            '  float kO = 6.0 * mix(mix(cerH(iO), cerH(iO + vec2(1.0, 0.0)), fO.x), mix(cerH(iO + vec2(0.0, 1.0)), cerH(iO + vec2(1.0, 1.0)), fO.x), fO.y);',
            '  float aO = floor(kO), tO = fract(kO);',
            '  vec4 cA = textureGrad(map, uvO + sin(vec2(3.0, 7.0) * aO), dxO, dyO), cB = textureGrad(map, uvO + sin(vec2(3.0, 7.0) * (aO + 1.0)), dxO, dyO);',
            '  vec4 sampledDiffuseColor = mix(cA, cB, smoothstep(0.2, 0.8, tO - 0.1 * dot(cA.rgb - cB.rgb, vec3(1.0))));',
            '  vec2 pO = uvO * vec2(1.0, 0.5), gO = abs(fract(pO - 0.5) - 0.5) / max(fwidth(pO), vec2(1e-4));',
            '  sampledDiffuseColor.rgb *= 1.0 - 0.45 * (1.0 - min(min(gO.x, gO.y) / 1.2, 1.0));',
            '  diffuseColor *= sampledDiffuseColor;',
            '#endif'].join('\n'));
      };
      mt.customProgramCacheKey = function () { return 'cer-osb'; };
      return mt;
    };
    var matPhoto = function (cle, fichier, tuile) {
      var mt = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), url = (CFG().photos && CFG().photos[cle]) || texUrl(fichier);
      if (cle === 'osb') osbVivant(mt);
      attente.push(new Promise(function (res) { new THREE.TextureLoader().load(url, function (t) { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
        t.repeat.set(1 / tuile, 1 / tuile); mt.map = t; mt.needsUpdate = true; res(); }, undefined, function () { res(); }); }));
      return mt;
    };
    var matMotif = function (fin) { // lames du moteur (bois photographié) sur une tuile de 2 m
      var mt = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide });
      attente.push(motif(E, function (svg) { return E.patBoards(svg, fin, 256, 0, 512); }, 256).then(function (c) { if (!c) return; var t = canvasTex(THREE, c, true); t.repeat.set(0.5, 0.5); mt.map = t; mt.needsUpdate = true; }));
      return mt;
    };
    var MI = {};
    if (!oss) { MI.mur = matMotif(E.FINITIONS.madrier); MI.dep = matMotif(E.FINITIONS.madrier);
      var tb2 = canvasTex(THREE, boisDeBout(), true); tb2.repeat.set(1 / wt, 1 / (E.FINITIONS.madrier.board || 0.14)); MI.bout = new THREE.MeshStandardMaterial({ map: tb2, roughness: 0.9 }); }
    else if (doub) MI.mur = matPhoto(doub[0], doub[1], doub[2]);
    else {
      MI.fond = pp ? new THREE.MeshStandardMaterial({ map: canvasTex(THREE, parePluie(), true), roughness: 0.75, side: THREE.DoubleSide }) : matMotif(E.wallFin(d));
      if (iso === 'laine') MI.laine = new THREE.MeshStandardMaterial({ map: canvasTex(THREE, laine(), true), roughness: 1, side: THREE.DoubleSide });
    }
    var INT = []; // pièces intérieures (cachées en vue « Intérieur » : rien ; la couverture, elle, se soulève)
    // face intérieure d'un mur : son contour ramené entre les angles intérieurs, percé aux ouvertures ; u, v en mètres
    var surfaceInt = function (grp, m, trous, z, mat) {
      var sh = new THREE.Shape(m.pts.map(function (p) { return new THREE.Vector2(Math.min(m.w - wt, Math.max(wt, (p[0] - m.baseX) / m.sc)), Math.max(0, (m.gndY - p[1]) / m.sc)); }));
      trous.forEach(function (o) { var hp = new THREE.Path(), vb = Math.max(o.v0, 0.001); hp.moveTo(o.a, vb); hp.lineTo(o.b, vb); hp.lineTo(o.b, o.v1); hp.lineTo(o.a, o.v1); hp.lineTo(o.a, vb); sh.holes.push(hp); });
      var g2 = new THREE.ShapeGeometry(sh), ps = g2.attributes.position, u2 = g2.attributes.uv;
      for (var i = 0; i < ps.count; i++) u2.setXY(i, ps.getX(i), ps.getY(i));
      var me = new THREE.Mesh(g2, mat); me.position.z = z; me.receiveShadow = true; grp.add(me); INT.push(me); return me;
    };
    // ossature d'un mur : lisses, sablière, montants tous les 60 cm, montants de part et d'autre des ouvertures, linteaux, appuis, montants de pignon
    var ossatureMur = function (grp, m, trous, sg) {
      var S = 0.045, D = 0.07, zc = -sg * (wt - D / 2), u0 = wt, u1 = m.w - wt, hE0 = m.wallH;
      var haut = m.pts.slice(1, -1).map(function (p) { return [(p[0] - m.baseX) / m.sc, (m.gndY - p[1]) / m.sc]; });
      var top = function (u) { var best = 0; for (var i = 0; i < haut.length - 1; i++) { var a = haut[i], b = haut[i + 1];
        if (u >= Math.min(a[0], b[0]) - 1e-6 && u <= Math.max(a[0], b[0]) + 1e-6) { var t = Math.abs(b[0] - a[0]) < 1e-6 ? 1 : (u - a[0]) / (b[0] - a[0]); best = Math.max(best, a[1] + (b[1] - a[1]) * t); } } return best; };
      var bois = function (ua, va, ub, vb) { if (vb - va < 0.02 || ub - ua < 0.02) return; var hz = ub - ua > vb - va, mm = massif(ub - ua, vb - va, D, hz ? 'x' : undefined);
        mm.position.set((ua + ub) / 2, (va + vb) / 2, zc); grp.add(mm); INT.push(mm); };
      var x = u0; trous.filter(function (o) { return o.porte; }).map(function (o) { return [o.a - S, o.b + S]; }).sort(function (a, b) { return a[0] - b[0]; })
        .forEach(function (c) { bois(x, 0, Math.max(x, c[0]), S); x = Math.max(x, c[1]); }); bois(x, 0, u1, S); // lisse basse, coupée aux portes
      bois(u0, hE0 - S, u1, hE0); // sablière
      for (var i = 0; i < haut.length - 1; i++) { var a = haut[i], b = haut[i + 1]; if (Math.abs(a[1] - b[1]) < 0.01 || Math.max(a[1], b[1]) <= hE0 + 0.02) continue; // rampants de pignon
        var ua = Math.max(u0, Math.min(a[0], b[0])), ub = Math.min(u1, Math.max(a[0], b[0])); if (ub - ua < 0.05) continue;
        var va = top(ua) - S / 2, vb = top(ub) - S / 2, ln = Math.hypot(ub - ua, vb - va), rp = massif(ln, S, D, 'x');
        rp.rotation.z = Math.atan2(vb - va, ub - ua); rp.position.set((ua + ub) / 2, (va + vb) / 2, zc); grp.add(rp); INT.push(rp); }
      var pos = []; for (var uu = u0 + S / 2; uu < u1 - S / 2 - 0.05; uu += 0.6) pos.push(uu); pos.push(u1 - S / 2);
      trous.forEach(function (o) { pos.push(o.a - S / 2, o.b + S / 2);
        bois(o.a - S, o.v1, o.b + S, Math.min(hE0 - S, o.v1 + 2 * S)); // linteau
        if (!o.porte && o.v0 > S * 2) bois(o.a, o.v0 - S, o.b, o.v0); }); // appui
      pos.forEach(function (uc) {
        if (uc < u0 || uc > u1) return;
        var o = trous.filter(function (t) { return uc > t.a - S / 2 + 0.001 && uc < t.b + S / 2 - 0.001; })[0];
        var seg = function (va, vb) { bois(uc - S / 2, va, uc + S / 2, vb); };
        if (!o) seg(S, hE0 - S); else { if (!o.porte && o.v0 > 3 * S) seg(S, o.v0 - S); if (o.v1 + 2 * S < hE0 - S - 0.02) seg(o.v1 + 2 * S, hE0 - S); }
        var tp = top(uc); if (tp - S > hE0 + 0.05) seg(hE0, tp - S); // montant de pignon
      });
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
        var prof = o.garage ? 0.04 : Math.min(0.07, wt * 0.55), z = -sg * prof, w = o.b - o.a, h = o.v1 - Math.max(o.v0, 0), ep = wt + (doub ? 0.012 : 0);
        var pg = new THREE.PlaneGeometry(w, h), pp = pg.attributes.position, pu = pg.attributes.uv;
        for (var j = 0; j < pp.count; j++) { var uu = o.a + w / 2 + pp.getX(j), vv = Math.max(o.v0, 0) + h / 2 + pp.getY(j), qq = uvOf(uu, vv); pu.setXY(j, qq[0], qq[1]); }
        var pm = new THREE.Mesh(pg, mat); pm.position.set(o.a + w / 2, Math.max(o.v0, 0) + h / 2, z); pm.receiveShadow = true; grp.add(pm);
        // tableaux (épaisseur de l'ouverture) en bois massif
        [[o.a, Math.max(o.v0, 0) + h / 2, 0.02, h], [o.b, Math.max(o.v0, 0) + h / 2, 0.02, h], [o.a + w / 2, o.v1, w + 0.02, 0.02]].forEach(function (t, n) {
          var tb = n < 2 ? massif(0.02, t[3], ep, undefined, M.bard) : massif(t[2], 0.02, ep, 'x', M.bard); tb.position.set(t[0], t[1], -sg * ep / 2); grp.add(tb); // tableaux sur toute l'épaisseur
        });
        if (!o.porte) { var ap = massif(w + 0.06, 0.03, prof + 0.05, 'x', M.bard); ap.position.set(o.a + w / 2, o.v0 - 0.015, z / 2 + sg * 0.025); grp.add(ap); } // appui de fenêtre
        if (o.vitre) { var vg = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.02, h - 0.02), M.verre); vg.position.set(o.a + w / 2, Math.max(o.v0, 0) + h / 2, z + sg * 0.012); grp.add(vg); }
      });
      if (!oss && ST.type !== 'carport') { // madriers : les rangs dépassent de 10 cm à chaque angle (bois de bout), coiffés d'un U en bois si l'option est prise
        var hautG = (m.gndY - m.pts[1][1]) / m.sc, hautD = (m.gndY - m.pts[m.pts.length - 2][1]) / m.sc;
        [[-0.05, hautG], [m.w + 0.05, hautD]].forEach(function (cn) {
          var bt = boite(0.10, cn[1], wt, [MI.bout, MI.bout, MI.dep, MI.dep, MI.dep, MI.dep]); bt.position.set(cn[0], cn[1] / 2, -sg * wt / 2); grp.add(bt);
          if (fv('f-profu') === 'oui') { var u2 = profilU(cn[0] < 0 ? -1 : 1, cn[1]); u2.position.set(cn[0] < 0 ? -0.10 : m.w + 0.10, 0, -sg * wt / 2); grp.add(u2); }
        });
      }
      if (!oss) surfaceInt(grp, m, trous, -sg * wt, MI.mur);
      else if (doub) surfaceInt(grp, m, trous, -sg * (wt + 0.012), MI.mur);
      else { surfaceInt(grp, m, trous, -sg * (wt - 0.07), MI.fond); if (MI.laine) surfaceInt(grp, m, trous, -sg * (wt - 0.012), MI.laine); ossatureMur(grp, m, trous, sg); }
      G.add(grp);
      attente.push(rasteriser(fa.svg, x0, y0, tw, th).then(function (c) { if (c) { mat.map = canvasTex(THREE, c); if (c.cerVitre) mat.alphaTest = 0.5; mat.needsUpdate = true; } })); // vitres : découpe (sinon mur opaque, JPEG à l'export)
    });
    // sol intérieur : plancher (lames de pin traité) ou dalle béton ; soubassement
    var plancher = fv('f-plan') && fv('f-plan') !== 'non', solG = new THREE.PlaneGeometry(L - 2 * wt, P - 2 * wt), su = solG.attributes.uv;
    for (var si = 0; si < su.count; si++) su.setXY(si, su.getX(si) * (L - 2 * wt), su.getY(si) * (P - 2 * wt));
    var solI = new THREE.Mesh(solG, plancher ? matMotif(E.FINITIONS.sr_vert) : new THREE.MeshStandardMaterial({ map: canvasTex(THREE, dalle(), true), roughness: 0.95, color: 0xf4eee2 }));
    solI.rotation.x = -Math.PI / 2; solI.position.set(0, base + 0.012, 0); solI.receiveShadow = true; G.add(solI); // au-dessus de l'ombre de contact (0,003) : deux couches à la même hauteur clignotaient
    if (base > 0) { var bs = boite(L, base, P, M.parpaing); bs.position.y = base / 2; G.add(bs); }

    // ── toit ── (les pièces ajoutées jusqu'aux extensions forment la couverture, cachée en vue « Intérieur »)
    var nToit0 = G.children.length;
    var y0t = carport ? hE + ((d.toit === '1PAN' || d.toit === '2PANS') ? 0.16 + 0.26 : 0) : base + hE;
    var sous = function (x, z) {
      if (d.toit === '2PANS') return y0t + (L / 2 - Math.abs(x)) * tan;
      if (d.toit === '1PAN') {
        if (orient === 'droite') return y0t + (L / 2 - x) * tan;
        if (orient === 'gauche') return y0t + (L / 2 + x) * tan;
        if (orient === 'fond') return y0t + (z + P / 2) * tan;
        return y0t + (P / 2 - z) * tan;
      }
      if (platH) return platH(x, z); // toit plat : couverture en pente vers le côté choisi
      return y0t;
    };
    var platH = null;
    var X0 = -L / 2 - d.ovL, X1 = L / 2 + d.ovR, ZF = P / 2 + d.ovF, ZB = -P / 2 - d.ovB, ep = 0.07, a = Math.atan(tan);
    var cv = E.couvFin(d), matCouv = new THREE.MeshStandardMaterial({ roughness: cv.kind === 'bac' || cv.kind === 'tuile' ? 0.45 : 0.92, metalness: cv.kind === 'bac' || cv.kind === 'tuile' ? 0.35 : 0 });
    var matSous = new THREE.MeshStandardMaterial({ roughness: 0.9 }); matCouv.cerReflet = true;
    var rotCouv = (d.toit === '2PANS' || (d.toit === '1PAN' && (orient === 'droite' || orient === 'gauche')));
    // couverture : texture des modèles SketchUp (dossier « 4• Textures » : shingles, tuiles, bac acier), sinon motif du moteur
    var kCouv = Object.keys(E.COUVERTURES).filter(function (k) { return E.COUVERTURES[k] === cv; })[0], TC = TOITS[kCouv];
    var motifCouv = function () { return motif(E, function (svg) { return E.patCouv(svg, cv, 256, 0, 0, Math.PI / 2); }, 256).then(function (c) {
      if (!c) return; var t = canvasTex(THREE, c, true); t.repeat.set(0.5, 0.5); if (rotCouv) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; } matCouv.map = t; matCouv.needsUpdate = true; }); };
    attente.push(!TC ? motifCouv() : new Promise(function (res) {
      var url = (CFG().toits && CFG().toits[kCouv]) || texUrl(TC[0]);
      new THREE.TextureLoader().load(url, function (t) { // t : TC[1] m de large (le long de l'égout) sur TC[2] m (dans la pente)
        if (/^shingle/.test(kCouv)) { t = canvasTex(THREE, shingleCanvas(t.image), true); TC = [TC[0], 4, 4]; } // shingle recomposé à l'échelle, tuile de 4 m
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping;
        if (rotCouv) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.repeat.set(1 / TC[2], 1 / TC[1]); } else t.repeat.set(1 / TC[1], 1 / TC[2]);
        matCouv.map = t; matCouv.color.set(kCouv === 'bac' ? 0x7d8287 : 0xffffff); matCouv.needsUpdate = true; res(); }, undefined, function () { motifCouv().then(res); });
    }));
    // dessous de la toiture du carport (règles d'Antony, 13/10/2026), d'après la couverture choisie : bac acier seul = la charpente et les tôles ;
    // « + sous-toiture planchette » et shingle = planchettes au-dessus de la charpente ; OSB ; feutre anti-condensation
    // (abri compris : bac acier seul = dessous du bac, blanc ; OSB ou planchettes seulement si l'option est prise ; remarque d'Antony du 13/10/2026)
    var sfC = E.sousFace ? E.sousFace() : 'planchette';
    if (sfC === 'non') { matSous.map = canvasTex(THREE, dessousBac(), true); matSous.map.repeat.set(4, 1); matSous.metalness = 0.2; matSous.roughness = 0.55; matSous.color.set(0xffffff); }
    else if (sfC === 'feutre') matSous.color.set(0x4a4d51);
    else if (sfC === 'osb') { attente.push(new Promise(function (res) { new THREE.TextureLoader().load((CFG().photos && CFG().photos.osb) || texUrl('int-osb.jpg'), function (t) { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.8, 0.8); matSous.map = t; matSous.needsUpdate = true; res(); }, undefined, function () { res(); }); })); osbVivant(matSous); }
    else attente.push(motif(E, function (svg) { return E.patBoards(svg, E.FINITIONS.sr_vert, 256, 0, 512); }, 256).then(function (c) {
      if (!c) return; var t = canvasTex(THREE, c, true); t.repeat.set(0.5, 0.5); matSous.map = t; matSous.needsUpdate = true; }));
    var mats = function () { return [M.massif, M.massif, matCouv, matSous, M.massif, M.massif]; };
    var pan = function (xa, xb, za, zb, ang) { var w = (xb - xa) / Math.cos(ang), xc = (xa + xb) / 2, mm = boite(w, ep, zb - za, mats());
      mm.rotation.z = ang; mm.position.set(xc, sous(xc, (za + zb) / 2) + ep / 2 / Math.cos(ang), (za + zb) / 2); G.add(mm); };
    var panZ = function (za, zb, ang) { var w = (zb - za) / Math.cos(ang), zc = (za + zb) / 2, mm = boite(X1 - X0, ep, w, mats());
      mm.rotation.x = ang; mm.position.set((X0 + X1) / 2, sous(0, zc) + ep / 2 / Math.cos(ang), zc); G.add(mm); };
    var rive = function (xa, xb, z, ang) { var w = (xb - xa) / Math.cos(ang), r = massif(w, carport ? 0.26 : 0.2, 0.028, 'x', M.bard); r.rotation.z = ang; r.position.set((xa + xb) / 2, sous((xa + xb) / 2, 0) - 0.03, z); G.add(r); };
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
      if (carport) [X0 - 0.015, X1 + 0.015].forEach(function (x) { var r = massif(0.028, 0.26, (ZF - ZB) / Math.cos(a), 'z', M.bard); r.rotation.x = orient === 'face' ? a : -a; r.position.set(x, sous(0, (ZF + ZB) / 2) - 0.03, (ZF + ZB) / 2); G.add(r); });
      gout.push(orient === 'face' ? { axe: 'x', e: ZF, s: 1 } : { axe: 'x', e: ZB, s: -1 });
    } else if (quadro) {
      // QUADRO : murs jusqu'en haut (acrotère), membrane EPDM juste sous l'acrotère (relevé de 5 cm au point haut), pente vers le fond, couvertine noire
      // avec une extension : une seule toiture plate au niveau de la couvertine (bandeau prolongé jusqu'aux poteaux), la couvertine ne fait que le tour extérieur
      var exF = ZF > P / 2 + 0.01, exB = ZB < -P / 2 - 0.01, exG = X0 < -L / 2 - 0.01, exD = X1 > L / 2 + 0.01, avecExt = exF || exB || exG || exD;
      var top = base + hE + rH, haut = avecExt ? top - 0.008 : top - 0.05, bas = avecExt ? haut : haut - Math.min(0.05, P * 0.015);
      var mbr = avecExt ? boite(L, 0.02, P, M.epdm) : boite(L - 0.06, 0.02, P - 0.06, [M.epdm, M.epdm, M.epdm, M.epdm, M.epdm, M.epdm]);
      mbr.rotation.x = -Math.atan((haut - bas) / P); mbr.position.set(0, (haut + bas) / 2, 0); G.add(mbr);
      if (!avecExt) [[0, P / 2 - 0.035, L - 0.06, 0.01, 0], [0, -P / 2 + 0.035, L - 0.06, 0.01, 0], [-L / 2 + 0.035, 0, 0.01, P - 0.06, 1], [L / 2 - 0.035, 0, 0.01, P - 0.06, 1]].forEach(function (r) {
        var hh = top + 0.004 - bas, rv = boite(r[2], hh, r[4] ? r[3] : 0.01, M.epdm); if (r[4]) rv = boite(0.01, hh, r[3], M.epdm);
        rv.position.set(r[0], bas + hh / 2, r[1]); G.add(rv); });
      var cvt = function (w, dd, x, z) { var c = boite(w, 0.045, dd, M.noir); c.position.set(x, top + 0.022, z); G.add(c); };
      cvt(X1 - X0 + 0.04, 0.09, (X0 + X1) / 2, ZF); cvt(X1 - X0 + 0.04, 0.09, (X0 + X1) / 2, ZB); cvt(0.09, ZF - ZB, X0, (ZF + ZB) / 2); cvt(0.09, ZF - ZB, X1, (ZF + ZB) / 2);
      if (!exF) cvt(L + 0.04, 0.09, 0, P / 2); if (!exB) cvt(L + 0.04, 0.09, 0, -P / 2); if (!exG) cvt(0.09, P, -L / 2, 0); if (!exD) cvt(0.09, P, L / 2, 0);
      // extensions du QUADRO : bandeau bardé jusqu'à la couvertine
      var hb2 = top - y0t, bd = function (xa, xb, za, zb) { if (xb - xa < 0.02 || zb - za < 0.02) return; var MB = matMotif(E.wallFin(d)), mm = boite(xb - xa, hb2, zb - za, [MB, MB, M.epdm, matSous, MB, MB]); mm.position.set((xa + xb) / 2, y0t + hb2 / 2, (za + zb) / 2); G.add(mm); };
      bd(X0, X1, P / 2, ZF); bd(X0, X1, ZB, -P / 2); bd(X0, -L / 2, -P / 2, P / 2); bd(L / 2, X1, -P / 2, P / 2);
      // évacuation : un tuyau traverse l'acrotère au fond, au ras de la membrane, puis un coude et la descente le long du mur
      gout.push({ t: 'quadro', y: avecExt ? top - 0.03 : bas + 0.03 });
    } else {
      // toit plat (règles d'Antony) : le bandeau reste droit sur les quatre côtés, coupé d'équerre, le toit paraît plat ; la pente
      // (5 % au moins, vers le côté choisi) est à l'intérieur du bandeau, et la gouttière est cachée derrière le bandeau bas : seule la descente se voit.
      // Bandeau de l'abri : deux lames de 13 cm (26 cm), trois (39 cm) seulement si la pente ne tient pas dans deux (même règle que le plan) ;
      // carport : 36 cm, trois lames (nos poses)
      // carport : le bandeau choisi dans le configurateur (ayous vertical, bac acier…), sinon le bardage
      var eb = 0.027, MB2 = matMotif((carport && E.FINITIONS[fv('f-bandeau')]) || E.wallFin(d)), dirZ = orient === 'face' || orient === 'fond', sgn = orient === 'face' || orient === 'droite' ? 1 : -1;
      var u0 = dirZ ? ZB : X0, u1 = dirZ ? ZF : X1, span = u1 - u0, hb = carport ? 0.36 : (E.flatTopH ? E.flatTopH(d) : 0.26);
      var hHaut = y0t + hb - 0.02, hBasC = Math.max(y0t + (carport && sfC !== 'planchette' ? 0.24 : 0.03), hHaut - 0.05 * span), chute = hHaut - hBasC; // carport sans sous-face : la tôle passe au-dessus des poutres
      platH = function (x, z) { var u = dirZ ? z : x, t = sgn > 0 ? (u - u0) / span : (u1 - u) / span; return hHaut - chute * Math.max(0, Math.min(1, t)); };
      var uHaut = sgn > 0 ? u0 : u1, uBas = sgn > 0 ? u1 : u0, v0 = dirZ ? X0 : ZB, v1 = dirZ ? X1 : ZF, ang = Math.atan(chute / span);
      // couverture : du bandeau haut jusqu'à 12 cm du bandeau bas (la gouttière cachée est là), entre les bandeaux de côté
      var ca = uHaut + sgn * eb, cb = uBas - sgn * (eb + 0.12), lc = Math.abs(cb - ca) / Math.cos(ang), cm = (ca + cb) / 2, ec = 0.03, wc = v1 - v0 - 2 * eb;
      var cvr = dirZ ? boite(wc, ec, lc, [matSous, matSous, matCouv, matSous, matSous, matSous]) : boite(lc, ec, wc, [matSous, matSous, matCouv, matSous, matSous, matSous]);
      if (dirZ) cvr.rotation.x = sgn > 0 ? ang : -ang; else cvr.rotation.z = sgn > 0 ? -ang : ang;
      var ym = platH(dirZ ? 0 : cm, dirZ ? cm : 0) - ec / 2; cvr.position.set(dirZ ? (v0 + v1) / 2 : cm, ym, dirZ ? cm : (v0 + v1) / 2); G.add(cvr);
      // plafond au niveau du bandeau seulement sur le carport avec l'option « sous-toiture planchette pour intégration spots » ;
      // partout ailleurs (abri compris), pannes tous les mètres sous la couverture, dont on voit le dessous (bac blanc, OSB, planchettes selon l'option)
      if (!(carport && sfC === 'planchette')) { // pannes perpendiculaires à la pente (elles portent la tôle qui coule vers le côté bas)
        var npn = Math.max(1, Math.ceil(span / 1.0));
        for (var kp = 1; kp < npn; kp++) { var up = u0 + span * kp / npn, ytp = platH(dirZ ? 0 : up, dirZ ? up : 0) - 0.035, lp = v1 - v0 - 2 * eb;
          var pn = dirZ ? massif(lp, 0.12, 0.07, 'x') : massif(0.07, 0.12, lp, 'z'); pn.position.set(dirZ ? (v0 + v1) / 2 : up, ytp - 0.06, dirZ ? up : (v0 + v1) / 2); G.add(pn); }
      } else {
      var sf = boite(X1 - X0, 0.02, ZF - ZB, [matSous, matSous, matSous, matSous, matSous, matSous]); sf.position.set((X0 + X1) / 2, y0t + 0.01, (ZF + ZB) / 2); G.add(sf);
      }
      // les quatre bandeaux, droits et de même hauteur
      var travers = function (u) { var m = dirZ ? boite(v1 - v0, hb, eb, MB2) : boite(eb, hb, v1 - v0, MB2); m.position.set(dirZ ? (v0 + v1) / 2 : u, y0t + hb / 2, dirZ ? u : (v0 + v1) / 2); G.add(m); };
      var long = function (v) { var m = dirZ ? boite(eb, hb, span, MB2) : boite(span, hb, eb, MB2); m.position.set(dirZ ? v : (u0 + u1) / 2, y0t + hb / 2, dirZ ? (u0 + u1) / 2 : v); G.add(m); };
      travers(uHaut + sgn * eb / 2); travers(uBas - sgn * eb / 2); long(v0 + eb / 2); long(v1 - eb / 2);
      if (fv('f-gout') === 'oui') gout.push({ t: 'platBas', dirZ: dirZ, sgn: sgn, e: uBas, y: y0t });
    }
    var TOIT = G.children.slice(nToit0);
    // ── carport (règles d'Antony, mêmes cotes que les vues du moteur) : poteaux sur la grille du configurateur et pieds galva,
    // sablières et entraits de 16 cm, jambes de force à 45° (aucune seulement en lamellé-collé), côtés fermés jusqu'en haut,
    // mur de la maison si adossé. Charpente relevée sur nos carports posés (13/10/2026) :
    //  · 2 pans : à chaque rangée de poteaux une ferme à poinçon (entrait, arbalétriers sous les pannes, poinçon jusqu'à la faîtière, deux contrefiches) ;
    //    rives de 26 cm en façade et au fond seulement, qui suivent la pente ; côtés d'égout sans bandeau, la gouttière reste apparente
    //  · 1 pan (photo d'Antony du 13/10/2026) : une ferme à chaque rangée de poteaux aussi : entrait, poteau haut d'une seule pièce jusqu'à
    //    l'arbalétrier, contre-fiche centrale du pied du poteau haut au milieu de la pente (demi-ferme), arbalétrier sous les pannes ; rives sur les côtés en pente,
    //    planche au faîte (sauf contre le mur) ; égout sans bandeau
    if (carport) {
      var ps = Math.max(0.09, parseFloat(fv('f-pot')) || 0.12), alu = fv('f-pot') === '0.15' || fv('f-potalu') === 'oui', EN = 0.16, PH0 = 0.15;
      // jambes de force (règle d'Antony du 13/10/2026) : toujours, poteaux bois, capotés alu ou alu ; sauf charpente en lamellé-collé (QUADRO, écartement « Max 6 m lamellé-collé »)
      var sansJ = quadro || fv('f-esp') === '6' || fv('f-espL') === '6';
      var cols = E.carportColsT ? E.carportColsT(d) : [0, 1], nr = Math.max(2, d.nRows || 2), cxs = cols.map(function (t) { return -L / 2 + ps / 2 + (L - ps) * t; }), czs = [];
      for (var ri = 0; ri < nr; ri++) czs.push(-P / 2 + ps / 2 + (P - ps) * ri / (nr - 1));
      var ados = d.ados && d.ados !== 'non' ? d.ados : '', clos = (E.closList ? E.closList() : []).filter(function (k) { return k !== ados; });
      var poutre = function (x0, y0, z0, x1, y1, z1, ep2, h2) { // pièce de bois entre deux points (axe), section ep2 × h2
        var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, lg = Math.hypot(dx, dy, dz), m2 = massif(ep2, lg, h2);
        var v = new THREE.Vector3(dx, dy, dz).normalize(); m2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
        m2.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); G.add(m2); return m2; };
      var un = d.toit === '1PAN', deux = d.toit === '2PANS', lgX = orient === 'droite' || orient === 'gauche', ca = Math.cos(a);
      // arbalétriers sous les pannes (15 cm), posés sur l'entrait au droit des poteaux bas (2 pans : les deux files d'égout)
      var su = function (u) { return lgX ? sous(u, 0) : sous(0, u); }; // 1 pan : la hauteur ne dépend que de la position dans la pente
      // 1 pan : file de poteaux basse et file haute ; adossé avec une seule file, l'autre côté repose sur le mur (pas de poteau)
      var uPot = lgX ? cxs : czs, sP = orient === 'droite' || orient === 'face' ? 1 : -1, demi = (lgX ? L : P) / 2;
      var uMin = Math.min.apply(null, uPot), uMax = Math.max.apply(null, uPot), uBas = sP > 0 ? uMax : uMin, uHaut = sP > 0 ? uMin : uMax;
      if (un && uPot.length < 2) { if ((uPot[0] > 0) === (sP > 0)) uHaut = null; else uBas = null; }
      var dPan = PH0 / ca, hA = Math.max(0.1, Math.min(0.22, ((deux ? sous(L / 2 - ps / 2, 0) : su(uBas != null ? uBas : sP * demi)) - dPan - hE - EN) * ca));
      var ua = function (u) { return su(u) - dPan - hA / ca; }; // 1 pan : dessous de l'arbalétrier
      var hautNom = lgX ? (orient === 'droite' ? 'gauche' : 'droite') : (orient === 'face' ? 'fond' : 'face');
      // poteaux et pieds galva (1 pan : le poteau haut monte d'une seule pièce jusqu'à l'arbalétrier)
      cxs.forEach(function (x) { czs.forEach(function (z) {
        var hp = un && uHaut != null && Math.abs((lgX ? x : z) - uHaut) < 1e-6 ? ua(uHaut) : hE, po = alu ? boite(ps, hp, ps, M.noir) : massif(ps, hp, ps); po.position.set(x, hp / 2, z); po.castShadow = true; G.add(po);
        var pd = boite(ps + 0.03, 0.025, ps + 0.03, M.galva); pd.position.set(x, 0.012, z); G.add(pd);
        [-1, 1].forEach(function (sd) { var pl = boite(0.006, 0.14, ps * 0.8, M.galva); pl.position.set(x + sd * (ps / 2 + 0.003), 0.07, z); G.add(pl); }); }); });
      // sablières (le long de chaque rangée) et entraits (travers, à chaque ligne de poteaux), sur les poteaux
      var yb = hE + EN / 2;
      czs.forEach(function (z) { poutre(-L / 2, yb, z, L / 2, yb, z, EN, ps); }); // pièce le long de x : 1re dimension = hauteur
      cxs.forEach(function (x) { poutre(x, yb, -P / 2, x, yb, P / 2, ps, EN); });
      // jambes de force à 45° : de chaque poteau vers les pièces qui passent dessus
      if (!sansJ) { var kb = 0.5, sk = 0.07;
        cxs.forEach(function (x) { czs.forEach(function (z) {
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dv) {
            var nx = x + dv[0] * kb, nz = z + dv[1] * kb; if (nx < -L / 2 - 0.01 || nx > L / 2 + 0.01 || nz < -P / 2 - 0.01 || nz > P / 2 + 0.01) return;
            poutre(x + dv[0] * ps / 2, hE - kb, z + dv[1] * ps / 2, nx, hE, nz, sk, sk); }); }); }); }
      // 2 pans : ferme à poinçon à chaque rangée de poteaux (photos de nos carports)
      if (deux) czs.forEach(function (z) {
        var dA = dPan + hA / 2 / ca, yPc = sous(0, 0) - 0.2 / ca, hPc = yPc - (hE + EN);
        [-1, 1].forEach(function (sd) {
          var xe = sd < 0 ? X0 + 0.03 : X1 - 0.03, xr = sd * 0.06; // arbalétrier : de l'égout au poinçon
          poutre(xe, sous(xe, 0) - dA, z, xr, sous(xr, 0) - dA, z, hA, 0.07);
          var xc = sd * 0.35 * L / 2; // contrefiche : du pied du poinçon au dessous de l'arbalétrier
          poutre(sd * 0.06, hE + EN + 0.05, z, xc, sous(xc, 0) - dPan - hA / ca, z, 0.09, 0.07); });
        if (hPc > 0.1) { var pc = massif(0.12, hPc, 0.09); pc.position.set(0, hE + EN + hPc / 2, z); G.add(pc); } // poinçon jusqu'à la faîtière
      });
      // 1 pan : ferme à chaque rangée de poteaux (arbalétrier, contre-fiche centrale, montant sur un poteau intermédiaire), planche au faîte
      if (un) {
        var uE0 = (lgX ? (sP > 0 ? X1 : X0) : (sP > 0 ? ZF : ZB)) - sP * 0.03, uE1 = (lgX ? (sP > 0 ? X0 : X1) : (sP > 0 ? ZB : ZF)) + sP * 0.03; // égout, faîte
        var pt = function (u, y, w) { return lgX ? [u, y, w] : [w, y, u]; }, sec = function (a2, b2) { return lgX ? [a2, b2] : [b2, a2]; };
        // contre-fiche centrale (remarque d'Antony) : du pied du poteau haut, sur l'entrait, au milieu de la pente jusqu'au poteau suivant
        var uSuiv = uHaut == null ? null : uPot.filter(function (u) { return Math.abs(u - uHaut) > 1e-6; }).sort(function (p, q) { return Math.abs(p - uHaut) - Math.abs(q - uHaut); })[0];
        var uMil = uHaut == null ? null : (uHaut + (uSuiv != null ? uSuiv : sP * demi)) / 2, y0j = hE + EN;
        (lgX ? czs : cxs).forEach(function (w) {
          var A = pt(uE0, su(uE0) - dPan - hA / 2 / ca, w), B = pt(uE1, su(uE1) - dPan - hA / 2 / ca, w), s1 = sec(hA, 0.07);
          poutre(A[0], A[1], A[2], B[0], B[1], B[2], s1[0], s1[1]); // arbalétrier
          if (uHaut != null) { var u0j = uHaut + sP * ps / 2, C = pt(u0j, y0j, w), D = pt(uMil, ua(uMil), w), s2 = sec(0.09, 0.07);
            poutre(C[0], C[1], C[2], D[0], D[1], D[2], s2[0], s2[1]); } // contre-fiche centrale : pièce de la ferme, gardée même avec des poteaux alu
          uPot.forEach(function (u) { if ((uHaut != null && Math.abs(u - uHaut) < 1e-6) || (uBas != null && Math.abs(u - uBas) < 1e-6)) return; var h3 = ua(u) - (hE + EN); if (h3 < 0.1) return;
            var m3 = massif(lgX ? 0.09 : 0.07, h3, lgX ? 0.07 : 0.09), q = pt(u, hE + EN + h3 / 2, w); m3.position.set(q[0], q[1], q[2]); G.add(m3); }); // montant
        });
        if (ados !== hautNom) { var uH = lgX ? (sP > 0 ? X0 : X1) : (sP > 0 ? ZB : ZF), vA = lgX ? ZB : X0, vB = lgX ? ZF : X1, yH = su(uH);
          var fb = lgX ? boite(0.028, 0.26, vB - vA + 0.03, M.bard) : boite(vB - vA + 0.03, 0.26, 0.028, M.bard);
          fb.position.set(lgX ? uH - sP * 0.014 : (vA + vB) / 2, yH - 0.05, lgX ? (vA + vB) / 2 : uH - sP * 0.014); G.add(fb); }
      }
      // sous-face des toits plats (QUADRO : le dessous de la membrane ne se voit pas)
      if (quadro) { var sfq = boite(X1 - X0, 0.02, ZF - ZB, matSous); sfq.position.set((X0 + X1) / 2, hE + 0.01, (ZF + ZB) / 2); G.add(sfq); }
      // côtés fermés : du sol jusque sous la toiture (pignon compris), entre les poteaux d'extrémité
      var ct = fv('f-clos-type'), finC = ct === 'ajouree' ? E.extFin(d, 'ajouree') : ct === 'clin' ? E.FINITIONS.sr_vert : E.wallFin(d), matC = matMotif(finC);
      clos.forEach(function (k) {
        var lat = k === 'gauche' || k === 'droite', fixe = k === 'gauche' ? -L / 2 : k === 'droite' ? L / 2 : (k === 'fond' ? -P / 2 : P / 2);
        var haut = function (v) { var x = lat ? fixe : v, z = lat ? v : fixe;
          if (plat || quadro) return hE;
          if (deux) return lat ? hE : Math.max(hE, sous(x, z) - dPan - hA / ca - 0.005);
          if (lgX === lat) return k === hautNom ? Math.max(hE, ua(lgX ? x : z) - 0.005) : hE; // côté haut : jusque sous l'arbalétrier ; côté bas : sous la sablière
          return Math.max(hE, ua(lgX ? x : z) - 0.005); };
        // remplissage entre les poteaux (règle d'Antony) : un panneau par travée, dans l'axe des poteaux ; les poteaux, intermédiaires compris, restent visibles
        var ligne = lat ? (k === 'gauche' ? cxs[0] : cxs[cxs.length - 1]) : (k === 'fond' ? czs[0] : czs[czs.length - 1]);
        var pos = (lat ? czs : cxs).slice().sort(function (p, q) { return p - q; });
        for (var ip = 0; ip < pos.length - 1; ip++) {
          var a0 = pos[ip] + ps / 2, a1 = pos[ip + 1] - ps / 2; if (a1 - a0 < 0.05) continue;
          var pts = a0 < 0 && a1 > 0 ? [a0, 0, a1] : [a0, a1], sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(a1 - a0, 0);
          pts.slice().reverse().forEach(function (v) { sh.lineTo(v - a0, haut(v)); }); sh.closePath();
          var geo = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: false }); geo.translate(0, 0, -0.011);
          var mc = new THREE.Mesh(geo, matC); mc.castShadow = mc.receiveShadow = true;
          if (lat) { mc.rotation.y = -Math.PI / 2; mc.position.set(ligne, 0, a0); } else mc.position.set(a0, 0, ligne);
          G.add(mc);
        }
      });
      // mur de la maison (adossé)
      if (ados) { var hm = (d.hExt + rH) + 0.7, sdm = ados === 'gauche' ? -1 : 1, mu = boite(0.2, hm, P + 2, M.enduit); mu.position.set(sdm * (L / 2 + d['ov' + (ados === 'gauche' ? 'L' : 'R')] + 0.1), hm / 2, 0); mu.receiveShadow = true; G.add(mu); }
    }
    // charpente (règle d'Antony) : pannes perpendiculaires aux pignons, portées par les pignons, faîtière en tête, au plus 1 m entre pannes
    // dans la pente (comme les pannes des carports) ; au-delà de 5 m de portée entre pignons, fermes intermédiaires. Laine de roche sous la couverture (option).
    var PW = 0.07, PH = 0.15, isot = fv('f-isot') === 'oui', matLaineT = isot ? new THREE.MeshStandardMaterial({ map: canvasTex(THREE, laine(), true), roughness: 1, side: THREE.DoubleSide }) : null;
    var lainePan = function (xa, xb, ang) { // nappe de laine sous un pan
      var ln = (xb - xa) / Math.cos(ang), pg2 = new THREE.PlaneGeometry(ln, P - 2 * wt), lu = pg2.attributes.uv, xm = (xa + xb) / 2;
      for (var li = 0; li < lu.count; li++) lu.setXY(li, lu.getX(li) * ln, lu.getY(li) * (P - 2 * wt));
      var pl = new THREE.Mesh(pg2, matLaineT); pl.rotation.x = -Math.PI / 2; pl.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), ang); pl.position.set(xm, sous(xm, 0) - 0.006, 0); G.add(pl); };
    var piece = function (w, h, dd, x, y, z, axe, rx, rz) { var mm = massif(w, h, dd, axe); if (rx) mm.rotation.x = rx; if (rz) mm.rotation.z = rz; mm.position.set(x, y, z); G.add(mm); return mm; };
    if (!quadro && !plat) {
      var long1 = d.toit === '1PAN' && (orient === 'face' || orient === 'fond'); // pente dans la profondeur : pignons à gauche et à droite
      var pente0 = long1 ? -P / 2 + wt : -L / 2 + wt, pente1 = long1 ? P / 2 - wt : L / 2 - wt; // de mur à mur, dans le sens de la pente
      var portee0 = long1 ? X0 : ZB, portee1 = long1 ? X1 : ZF; // les pannes traversent les pignons jusqu'aux débords
      var hautPanne = function (t) { return long1 ? sous(0, t) : sous(t, 0); };
      var panne = function (t, h) { var c3 = hautPanne(t) - h / 2 / Math.cos(a);
        if (long1) piece(portee1 - portee0, h, PW, (portee0 + portee1) / 2, c3, t, 'x'); else piece(PW, h, portee1 - portee0, t, c3, (portee0 + portee1) / 2, 'z'); };
      var rangs = function (ta, tb) { var n = Math.max(1, Math.ceil(Math.abs(tb - ta) / 1.0)); for (var k = 1; k < n; k++) panne(ta + (tb - ta) * k / n, PH); };
      if (d.toit === '2PANS') { panne(0, 0.2); rangs(pente0, 0); rangs(0, pente1); if (carport) { panne(-L / 2 + wt / 2, PH); panne(L / 2 - wt / 2, PH); } } // faîtière, pannes de chaque pan, pannes sablières (carport)
      else { rangs(pente0, pente1); if (carport) { panne(pente0 - wt / 2, PH); panne(pente1 + wt / 2, PH); } } // carport 1 pan : pannes aussi au droit des poteaux
      // fermes intermédiaires : arbalétriers, entrait à hauteur des murs, poinçon (2 pans)
      var portee = long1 ? L - 2 * wt : P - 2 * wt, nf = carport ? 0 : Math.ceil(portee / 5) - 1; // carport : ses fermes sont à chaque rangée de poteaux
      for (var f2 = 1; f2 <= nf; f2++) {
        var zf = (long1 ? -L / 2 + wt : -P / 2 + wt) + portee * f2 / (nf + 1), yE = base + hE - 0.075;
        if (d.toit === '2PANS') {
          [[pente0, 0], [0, pente1]].forEach(function (s2) { var xm = (s2[0] + s2[1]) / 2, ang = s2[0] < 0 ? a : -a, ln = (s2[1] - s2[0]) / Math.cos(ang);
            piece(ln, PH, PW, xm, sous(xm, 0) - PH - PH / 2 / Math.cos(ang), zf, 'x', 0, ang); });
          piece(pente1 - pente0, PH, PW, 0, yE, zf, 'x');
          var hp = sous(0, 0) - PH * 2 - yE; if (hp > 0.1) piece(PW, hp, PW, 0, yE + hp / 2, zf);
        } else if (long1) {
          var ang2 = orient === 'face' ? a : -a, zm2 = 0, ln2 = (pente1 - pente0) / Math.cos(ang2);
          piece(PW, PH, ln2, zf, sous(0, zm2) - PH - PH / 2 / Math.cos(ang2), zm2, 'z', ang2); piece(PW, PH, pente1 - pente0, zf, yE, 0, 'z');
        } else {
          var ang3 = orient === 'droite' ? -a : a, ln3 = (pente1 - pente0) / Math.cos(ang3);
          piece(ln3, PH, PW, 0, sous(0, 0) - PH - PH / 2 / Math.cos(ang3), zf, 'x', 0, ang3); piece(pente1 - pente0, PH, PW, 0, yE, zf, 'x');
        }
      }
      if (isot && d.toit === '2PANS') { lainePan(pente0, 0, a); lainePan(0, pente1, -a); }
    } else if (!carport && quadro) { // QUADRO : solives et platelage OSB sous la membrane (le toit plat de l'abri a ses pannes, plus haut)
      var yS = quadro ? base + hE + rH - 0.05 - 0.04 : y0t; // dessous du platelage
      for (var xj = -L / 2 + wt + 0.0225; xj <= L / 2 - wt; xj += 0.6) { var sj = massif(0.045, 0.15, P - 2 * wt, 'z'); sj.position.set(xj, yS - 0.075, 0); G.add(sj); }
      var ospl = new THREE.Mesh(new THREE.PlaneGeometry(L - 2 * wt, P - 2 * wt), matPhoto('osb', 'int-osb.jpg', 1.25)); ospl.rotation.x = Math.PI / 2; ospl.position.set(0, yS - 0.001, 0);
      var ou2 = ospl.geometry.attributes.uv; for (var oi = 0; oi < ou2.count; oi++) ou2.setXY(oi, ou2.getX(oi) * (L - 2 * wt), ou2.getY(oi) * (P - 2 * wt)); G.add(ospl);
    }
    TOIT = G.children.slice(nToit0); // couverture et charpente : soulevées ensemble en vue « Intérieur »
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
      attente.push(motif(E, function (svg) { return E.patBoards(svg, E.extFin ? E.extFin(d, EX.type) : (EX.type === 'ajouree' ? E.FINITIONS.ps_vert_ajoure : E.FINITIONS.sr_vert_v), 256, 0, 512); }, 256).then(function (c) {
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
        if (g.t === 'platBas') { // toit plat : gouttière cachée derrière le bandeau bas ; la descente sort sous la sous-face, revient contre le mur (ou le long du poteau d'extension)
          var dz2 = g.dirZ, s2 = g.sgn, mur = s2 * (dz2 ? P / 2 : L / 2), ext2 = (dz2 ? (s2 > 0 ? d.ovF : d.ovB) : (s2 > 0 ? d.ovR : d.ovL)) > 0.5;
          var al = dz2 ? L / 2 - (ext2 ? 0.06 : 0.3) : -P / 2 + (ext2 ? 0.06 : 0.3), pw = ext2 ? g.e + s2 * ECART : mur + s2 * ECART, o0 = g.e - s2 * 0.08;
          var Q = function (o, y) { return dz2 ? [al, y, o] : [o, y, al]; };
          var pts3 = [Q(o0, g.y + 0.1), Q(o0, g.y - 0.06)], y3 = g.y - 0.06, dd = Math.abs(o0 - pw);
          if (dd > 0.015) { pts3.push(Q(pw, y3 - dd)); y3 -= dd; }
          pts3.push(Q(pw, 0.14), Q(pw + s2 * 0.12, 0.04)); tuyau(pts3);
          if (dz2) colliers(al, pw, 0, -s2, 0.14, y3); else colliers(pw, al, -s2, 0, 0.14, y3);
          return;
        }
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
    // ── terrasse (plancher extérieur) posée par le client sur le plan de masse : lames de 145 mm photographiées, toujours en pin
    //    autoclave vert (Antony, 13/10/2026), sur lambourdes, 12 cm au-dessus du sol ; lames perpendiculaires au mur qu'elle touche ──
    var TR = E.terrasse ? E.terrasse(d) : null, TB = null;
    if (TR) {
      var tL = TR.x1 - TR.x0, tP = TR.y1 - TR.y0, tx = (TR.x0 + TR.x1) / 2 - L / 2, tz = P / 2 - (TR.y0 + TR.y1) / 2;
      var colle = function (a, b) { return Math.abs(a - b) < 0.02; };
      var sens = colle(TR.y1, 0) || colle(TR.y0, P) ? 'v' : colle(TR.x1, 0) || colle(TR.x0, L) ? 'h' : (tL >= tP ? 'h' : 'v');
      // boards : le dessin photo des lames l'exige (sans lui, la 3D ne s'ouvrait plus dès qu'il y avait une terrasse devant ou derrière, audit du 14/10)
      var finT = Object.assign({}, E.FINITIONS.sr_vert, { dir: sens, board: 0.145, boards: [0.145] });
      var lames = boite(tL, 0.027, tP, matMotif(finT)); lames.position.set(tx, 0.1065, tz); G.add(lames);
      var lamb = boite(Math.max(0.1, tL - 0.06), 0.093, Math.max(0.1, tP - 0.06), new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.95 }), true);
      lamb.position.set(tx, 0.0465, tz); G.add(lamb);
      TB = { x0: tx - tL / 2, x1: tx + tL / 2, z0: tz - tP / 2, z1: tz + tP / 2 };
    }
    // userData ne garde que des nombres : il est recopié à chaque clone et écrit tel quel dans le GLB (les pièces du toit y pesaient 11 Mo)
    G.userData = { x0: TB ? Math.min(X0, TB.x0) : X0, x1: TB ? Math.max(X1, TB.x1) : X1, zF: TB ? Math.max(ZF, TB.z1) : ZF, zB: TB ? Math.min(ZB, TB.z0) : ZB, h: base + hE + rH, L: L, P: P,
      tx0: TB ? TB.x0 : 0, tx1: TB ? TB.x1 : 0, tz0: TB ? TB.z0 : 0, tz1: TB ? TB.z1 : 0 }; G.cerToit = TOIT; G.cerPret = Promise.all(attente);
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
    if (!photo) { S.add(sky); S.fog = new THREE.Fog(0xc9d6df, 40, 130); } // horizon d'arbres à 55 m (decor) : le sol à son pied reste vert
    S.add(new THREE.HemisphereLight(0xeef2f4, 0x8a8a6a, 0.75)); // lumière du ciel : les faces à l'ombre gardent la teinte du bois (demande d'Antony)
    var dl = new THREE.DirectionalLight(0xfff4e6, 2.5); dl.position.copy(sun).multiplyScalar(14); dl.castShadow = true;
    dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); dl.shadow.bias = -0.0003; dl.shadow.normalBias = 0.025; dl.shadow.radius = 4;
    S.add(dl); S.add(dl.target);
    var sol;
    if (photo) { sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.38 })); }
    else { var ht = canvasTex(THREE, herbe(), true); ht.repeat.set(36, 36); sol = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ map: ht, roughness: 1 })); }
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; S.add(sol);
    if (!photo) S.add(decor(THREE));
    return { S: S, soleil: dl, ciel: sky, sol: sol };
  }

  // ───────── fenêtre ─────────
  var ouvert = null;
  var CSS = '.cer3d{position:fixed;inset:0;z-index:100000;background:rgba(30,30,24,.6);display:flex;align-items:center;justify-content:center;padding:10px;font-family:Jost,Futura,Arial,sans-serif}' +
    '.cer3d .b{position:relative;width:100%;height:100%;background:#cfdbe4;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}' +
    '@media (max-width:700px){.cer3d{padding:0}.cer3d .b{border-radius:0}}' + CHARGE_CSS + '.cer3d .vv,.cer3d .va{display:contents}' + '.cer3d.cache{inset:auto;left:-12000px;top:0;width:1200px;height:800px;padding:0}.cer3d.cache .b{border-radius:0;box-shadow:none}' +
    '.cer3d .zone{position:relative;width:100%;height:100%}.cer3d .zone img.fond{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}' +
    '.cer3d canvas{position:absolute;inset:0;display:block;width:100%!important;height:100%!important;touch-action:none}' +
    '.cer3d .x{position:absolute;top:12px;right:12px;z-index:3;width:40px!important;height:40px!important;min-width:0!important;padding:0!important;margin:0!important;border-radius:50%!important;border:0!important;background:#fff!important;color:#2b2b22!important;font:400 26px/40px Arial,sans-serif!important;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)}' +
    '.cer3d .t{position:absolute;top:14px;left:14px;z-index:3;font-weight:600;font-size:14px;color:#2b2b22;background:rgba(255,255,255,.9);padding:6px 12px;border-radius:12px;max-width:calc(100% - 80px)}' +
    '.cer3d .v{position:absolute;left:10px;right:10px;bottom:12px;z-index:3;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}' +
    '.cer3d .v button,.cer3d .p button{border:0!important;border-radius:20px!important;padding:8px 13px!important;font:500 13px Jost,Futura,Arial,sans-serif!important;background:rgba(255,255,255,.93)!important;color:#2b2b22!important;cursor:pointer;margin:0!important;line-height:1.2!important;min-height:0!important}' +
    '.cer3d .v button.on{background:#515136!important;color:#fff!important}.cer3d .v button.fort{background:#515136!important;color:#fff!important}' +
    '.cer3d .p{position:absolute;top:60px;right:12px;z-index:4;width:min(330px,calc(100% - 24px));background:#fff;border-radius:16px;padding:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-size:14px;color:#2b2b22;line-height:1.45}' +
    '.cer3d .p h3{margin:0 0 6px;font-size:16px;display:flex;justify-content:space-between;align-items:center}.cer3d .p .rep{border:0!important;background:#f1efe7!important;border-radius:50%!important;width:28px!important;height:28px!important;padding:0!important;font:400 18px/28px Arial!important;color:#2b2b22!important;cursor:pointer}.cer3d .sl span{min-width:92px;font-size:13px}.cer3d .p img.qr{display:block;margin:8px auto;width:200px;height:200px;image-rendering:pixelated}.cer3d .p small{color:#77755f}' +
    '.cer3d .ch{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;color:#2b2b22;z-index:2}' +
    '.cer3d .sl{display:flex;align-items:center;gap:8px;margin:8px 0}.cer3d .sl input{flex:1}' +
    '@media (max-width:700px){.cer3d.photo .p{top:auto;bottom:58px;left:10px;right:10px;width:auto;padding:10px 12px}.cer3d.photo .p small{display:none}.cer3d.photo .sl{margin:4px 0}}' +
    // téléphone couché (écran bas) : le panneau du montage photo tient entre le titre et les boutons, et défile
    '@media (max-height:500px){.cer3d.photo .p{top:56px;bottom:62px;max-height:none;overflow:auto;padding:8px 12px}.cer3d.photo .p small{display:none}.cer3d.photo .sl{margin:2px 0}}' +
    // téléphone : les vues sur une ligne qui défile au doigt, les deux actions dessous
    '@media (max-width:700px){.cer3d .v{left:0;right:0;bottom:10px;flex-direction:column;flex-wrap:nowrap;gap:6px}.cer3d .vv{display:flex;gap:6px;overflow-x:auto;padding:0 10px 2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.cer3d .vv::-webkit-scrollbar{display:none}.cer3d .vv button{flex:0 0 auto;white-space:nowrap}.cer3d .va{display:flex;gap:6px;padding:0 10px}.cer3d .va button{flex:1 1 0;padding:10px 8px!important}}';
  function ouvrir(mode) {
    var E = window.CerPlan; if (!E || !E.ST || !E.ST.cfg) return Promise.resolve(null);
    if (ouvert) fermer();
    var nom = E.ST.type === 'garage' ? 'garage' : E.ST.type === 'carport' ? 'carport' : 'abri';
    var ov = document.createElement('div'); ov.className = 'cer3d' + (mode === 'cache' ? ' cache' : '');
    ov.innerHTML = '<style>' + CSS + '</style><div class="b"><div class="zone"><div class="ch">' + CHARGE_HTML + '</div></div>' +
      '<span class="t">Votre ' + nom + ' en 3D · glissez pour tourner</span><button class="x" type="button" aria-label="Fermer">×</button>' +
      '<div class="v"><span class="vv"><button data-v="trois" class="on">3/4</button><button data-v="face">Devant</button><button data-v="gauche">Gauche</button><button data-v="droite">Droite</button><button data-v="fond">Derrière</button><button data-v="dessus">Dessus</button><button data-v="int">Intérieur</button><button data-v="tour">Tourner</button></span>' +
      '<span class="va"><button data-a="ar" class="fort">Voir chez moi (réalité augmentée)</button><button data-a="photo">Sur une photo de mon jardin</button></span></div></div>';
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
    R.setPixelRatio(ov.classList.contains('cache') ? 1 : Math.min(window.devicePixelRatio, 2)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.66; R.outputColorSpace = THREE.SRGBColorSpace;
    zone.appendChild(R.domElement);
    var sc = scene(R, !!photo), G = construire(E), u = G.userData;
    // reflet du ciel au même niveau pour tout le bois, y compris les pièces à plusieurs matières (bouts de madriers, bandeaux) :
    // sans ça leurs faces sortaient un tiers plus claires que les lames (remarque d'Antony du 13/10/2026) ; la couverture garde le sien
    G.traverse(function (o) { if (!o.isMesh || !o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (!m.transparent && !m.cerReflet) m.envMapIntensity = 0.45; }); });
    sc.S.add(G);
    if (!photo) sc.S.add(pelouse(THREE, u));
    if (!photo) { // ombre de contact sous l'abri
      var om = new THREE.Mesh(new THREE.PlaneGeometry((u.x1 - u.x0) * 1.5, (u.zF - u.zB) * 1.5), new THREE.MeshBasicMaterial({ map: canvasTex(THREE, ombreDouce()), transparent: true, depthWrite: false, opacity: 0.55 }));
      om.rotation.x = -Math.PI / 2; om.position.set((u.x0 + u.x1) / 2, 0.003, (u.zF + u.zB) / 2); sc.S.add(om);
    }
    var cam = new THREE.PerspectiveCamera(35, 1, 0.1, 9000), ctl = new T.OrbitControls(cam, R.domElement);
    ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.495; ctl.minDistance = 2.5; ctl.maxDistance = 40; ctl.enablePan = !!photo;
    // cadrage : la plus grande des dimensions, hauteur comprise (un carport 1 pan à forte pente monte à 5 m et sortait du cadre)
    var cible = new THREE.Vector3((u.x0 + u.x1) / 2, Math.max(Math.min(1.3, u.h / 2), u.h * 0.4 - 0.4), (u.zF + u.zB) / 2), r = Math.max(u.x1 - u.x0, u.zF - u.zB, u.h * 1.3, 3) * 2;
    var VUES = { dos: [-0.62, 0.42, -1.3], trois: [0.62, 0.42, 1.3], face: [0, 0.28, 1], gauche: [-1, 0.28, 0.15], droite: [1, 0.28, 0.15], fond: [0.15, 0.28, -1], dessus: [0.25, 1.6, 0.55], int: [0.42, 1.0, 0.8] };
    var anim = null, recul = function (v) { return r * (v === 'dessus' ? 1.35 : 1) * Math.max(1, 1.4 / Math.max(0.4, cam.aspect)); };
    var vers = function (v, inst) { var p = new THREE.Vector3().fromArray(VUES[v]).normalize().multiplyScalar(recul(v)).add(cible);
      ov.querySelectorAll('.v [data-v]').forEach(function (x) { if (x.dataset.v !== 'int' && x.dataset.v !== 'tour') x.classList.toggle('on', x.dataset.v === v); });
      if (inst) { cam.position.copy(p); ctl.target.copy(cible); } else anim = { t0: performance.now(), p0: cam.position.clone(), p1: p }; };
    var taille = function () { var w = zone.clientWidth, h = zone.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    var ro = new ResizeObserver(taille); ro.observe(zone); taille(); vers('trois', true);
    ouvert = { ov: ov, R: R, S: sc.S, G: G, cam: cam, ctl: ctl, sc: sc, vers: vers, photo: photo, raf: 0 };
    var boucle = function (t) { if (!ouvert || ouvert.R !== R) return; ouvert.raf = requestAnimationFrame(boucle);
      if (anim) { var k = Math.min(1, (t - anim.t0) / 700), s = k * k * (3 - 2 * k); cam.position.lerpVectors(anim.p0, anim.p1, s); if (k >= 1) anim = null; }
      ctl.update(); R.render(sc.S, cam); };
    var ch = ov.querySelector('.ch');
    return G.cerPret.then(function () { if (ch) ch.remove(); boucle(performance.now()); actions(ov); return ov; });
  }
  function actions(ov) {
    if (ov.__actions) return; ov.__actions = true;
    ov.querySelector('.v').addEventListener('click', function (e) {
      var bt = e.target.closest('button'); if (!bt || !ouvert) return;
      if (bt.dataset.v === 'tour') { ouvert.ctl.autoRotate = !ouvert.ctl.autoRotate; bt.classList.toggle('on', ouvert.ctl.autoRotate); }
      else if (bt.dataset.v === 'int') { // la couverture se soulève : ossature, doublage, sol et charpente visibles
        ouvert.interieur = !ouvert.interieur; (ouvert.G.cerToit || []).forEach(function (o) { o.visible = !ouvert.interieur; });
        bt.classList.toggle('on', !!ouvert.interieur); if (ouvert.interieur) ouvert.vers('int'); else ouvert.vers('trois'); }
      else if (bt.dataset.v) ouvert.vers(bt.dataset.v);
      else if (bt.dataset.a === 'ar') realiteAugmentee(bt);
      else if (bt.dataset.a === 'photo') choisirPhoto();
      else if (bt.dataset.a === 'valider') validerMontage();
    });
  }

  // ───────── insertion sur une photo du jardin ─────────
  // le champ fichier reste dans la page : sur iPhone, Safari peut perdre la photo choisie si le champ n'y est pas rattaché
  function choisirPhoto() {
    if (!ouvert) return;
    var ov = ouvert.ov, inp = ov.querySelector('input.cer3d-photo');
    if (!inp) {
      inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,.heic,.heif'; inp.className = 'cer3d-photo';
      inp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0'; ov.appendChild(inp);
      inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
        if (window.CerHeic && /\.hei[cf]$|hei[cf]/i.test((f.name || '') + ' ' + (f.type || ''))) { var t = ov.querySelector('.t'); if (t) t.textContent = 'Conversion de la photo iPhone…';
          window.CerHeic(f).then(chargerPhoto, function () { if (t) t.textContent = 'Cette photo HEIC n’a pas pu être convertie : essayez en JPEG.'; }); }
        else chargerPhoto(f); });
    }
    inp.click();
  }
  function chargerPhoto(f) {
    if (!ouvert) return; var ov = ouvert.ov, t = ov.querySelector('.t'); t.textContent = 'Chargement de la photo…';
    var im = new Image();
    im.onerror = function () { t.textContent = 'Cette photo n’a pas pu être lue : essayez une autre photo (JPEG ou PNG).'; };
    im.onload = function () { // photo ramenée à 2400 px au plus (mémoire des téléphones), sens de prise de vue respecté
      var k = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      var ph = new Image(); ph.onload = function () {
        var v = ov.querySelector('.v'); v.querySelectorAll('[data-a],[data-v]').forEach(function (x) { x.style.display = 'none'; });
        if (!v.querySelector('[data-a=valider]')) v.querySelector('.va').insertAdjacentHTML('beforeend', '<button data-a="valider" class="fort">Valider le montage</button>');
        v.querySelector('[data-a=valider]').style.display = '';
        monter(ov, ph).then(modePhoto);
      };
      ph.src = c.toDataURL('image/jpeg', 0.9); URL.revokeObjectURL(im.src);
    };
    im.src = URL.createObjectURL(f);
  }
  // Placement sur la photo : l'abri se glisse au doigt sur le sol, se tourne et se règle en taille (pincement ou curseurs) ;
  // la caméra reste fixe, à hauteur d'yeux, comme le téléphone qui a pris la photo
  function modePhoto() {
    var o = ouvert, THREE = T.THREE, cam = o.cam, G = o.G, u = G.userData, el = o.R.domElement, ov = o.ov;
    o.ctl.enabled = false; o.ctl.autoRotate = false; ov.classList.add('photo');
    var piv = new THREE.Group(); o.S.remove(G); G.position.set(-(u.x0 + u.x1) / 2, 0, -(u.zF + u.zB) / 2); piv.add(G); o.S.add(piv); o.piv = piv;
    var taille0 = Math.max(u.x1 - u.x0, u.zF - u.zB, 3);
    var P = { dist: taille0 * 2.4, oeil: 1.6, rot: -30, soleil: 145 };
    cam.fov = cam.aspect >= 1 ? 50 : 64; cam.updateProjectionMatrix();
    var sol = o.sc.sol, dl = o.sc.soleil;
    var appliquer = function () {
      cam.position.set(0, P.oeil, P.dist); o.ctl.target.set(0, Math.min(1.1, u.h / 2), 0); cam.lookAt(o.ctl.target);
      piv.rotation.y = THREE.MathUtils.degToRad(P.rot);
      sol.position.set(piv.position.x, 0, piv.position.z); dl.target.position.copy(piv.position); dl.target.updateMatrixWorld();
      dl.position.setFromSphericalCoords(14, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(P.soleil)).add(piv.position);
      ov.querySelectorAll('.p input[data-k]').forEach(function (r) { r.value = P[r.dataset.k]; });
    };
    piv.position.set(0, 0, 0); appliquer();
    ov.querySelector('.t').textContent = 'Glissez l’abri du doigt pour le placer · pincez pour la taille';
    var pnl = ov.querySelector('.p'); if (!pnl) { pnl = document.createElement('div'); pnl.className = 'p'; ov.querySelector('.b').appendChild(pnl); }
    pnl.innerHTML = '<h3>Placer l’abri <button type="button" class="rep" aria-label="Replier">–</button></h3><div class="cps">' +
      '<div class="sl"><span>Taille</span><input type="range" data-k="dist" min="' + (taille0 * 0.8).toFixed(1) + '" max="' + (taille0 * 8).toFixed(1) + '" step="0.05" style="direction:rtl"></div>' +
      '<div class="sl"><span>Hauteur de vue</span><input type="range" data-k="oeil" min="0.3" max="8" step="0.05"></div>' +
      '<div class="sl"><span>Orientation</span><input type="range" data-k="rot" min="-180" max="180" step="1"></div>' +
      '<div class="sl"><span>Soleil</span><input type="range" data-k="soleil" min="0" max="360" step="1"></div>' +
      '<small>Glissez l’abri pour le poser à sa place. « Hauteur de vue » : la hauteur du téléphone quand la photo a été prise. Tournez le soleil pour que l’ombre parte comme celles de la photo.</small></div>';
    pnl.querySelectorAll('input[data-k]').forEach(function (r) { r.addEventListener('input', function () { P[r.dataset.k] = +r.value; appliquer(); }); });
    pnl.querySelector('.rep').onclick = function () { var c = pnl.querySelector('.cps'), h = c.style.display === 'none'; c.style.display = h ? '' : 'none'; this.textContent = h ? '–' : '+'; };
    appliquer();
    // glisser (un doigt ou la souris) : l'abri suit le point visé sur le sol ; deux doigts : taille et rotation
    var ray = new THREE.Raycaster(), plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pts = {}, prise = null, deux = null;
    var auSol = function (e) { var r = el.getBoundingClientRect(), v = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(v, cam); var q = new THREE.Vector3(); return ray.ray.intersectPlane(plan, q) ? q : null; };
    var mesure = function () { var a = Object.values(pts); if (a.length < 2) return null; return { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), a: Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x) }; };
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (e) { pts[e.pointerId] = { x: e.clientX, y: e.clientY }; try { el.setPointerCapture(e.pointerId); } catch (x) {}
      if (Object.keys(pts).length === 1) { var q = auSol(e); prise = q ? q.sub(piv.position) : null; } else { prise = null; deux = { m: mesure(), dist: P.dist, rot: P.rot }; } });
    el.addEventListener('pointermove', function (e) { if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (deux && deux.m) { var m = mesure(); if (m) { P.dist = Math.max(taille0 * 0.8, Math.min(taille0 * 8, deux.dist * deux.m.d / Math.max(10, m.d))); P.rot = deux.rot - THREE.MathUtils.radToDeg(m.a - deux.m.a); appliquer(); } return; }
      if (prise) { var q = auSol(e); if (q) { piv.position.set(q.x - prise.x, 0, q.z - prise.z); appliquer(); } } });
    var fin = function (e) { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) deux = null; if (!Object.keys(pts).length) prise = null; };
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
    el.addEventListener('wheel', function (e) { e.preventDefault(); P.dist = Math.max(taille0 * 0.8, Math.min(taille0 * 8, P.dist * (e.deltaY > 0 ? 1.08 : 0.93))); appliquer(); }, { passive: false });
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

  // deux vues 3D pour le devis (3/4 avant, 3/4 arrière), sans rien montrer au client : fenêtre hors de l'écran, ou la vue déjà ouverte (caméra remise ensuite)
  function vuesDevis() {
    var prendre = function () { var o = ouvert, p0 = o.cam.position.clone(), t0 = o.ctl.target.clone(), r = ['trois', 'dos'].map(function (v) { o.vers(v, true); o.ctl.update(); return composite().toDataURL('image/jpeg', 0.86); });
      o.cam.position.copy(p0); o.ctl.target.copy(t0); o.ctl.update(); return r; };
    if (ouvert && !ouvert.photo) return Promise.resolve(prendre());
    return ouvrir('cache').then(function () { if (!ouvert) return null; var r = prendre(); fermer(); return r; });
  }

  // ───────── réalité augmentée ─────────
  var ua = navigator.userAgent, IOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), ANDROID = /Android/i.test(ua);
  function modeleExport() { // copie de l'abri seule, posée au sol, centrée
    var THREE = T.THREE, g = ouvert.G.clone(true), u = ouvert.G.userData, sc = new THREE.Scene(); g.position.set(-(u.x0 + u.x1) / 2, 0, -(u.zF + u.zB) / 2); sc.add(g);
    g.traverse(function (o) { o.visible = true; }); // la couverture soulevée en vue « Intérieur » est remise
    var doubles = [], multi = [];
    g.traverse(function (o) { if (o.isMesh && Array.isArray(o.material)) multi.push(o); });
    // USDZ (iPhone) ignore les pièces à plusieurs matières (pans de toit : couverture dessus, lambris dessous, rives) : une pièce par matière
    multi.forEach(function (o) {
      var geo = o.geometry, ix = geo.index;
      geo.groups.forEach(function (gr) {
        var part = geo.clone(); part.clearGroups();
        if (ix) part.setIndex(Array.prototype.slice.call(ix.array, gr.start, gr.start + gr.count)); else part.setDrawRange(gr.start, gr.count);
        var m = new THREE.Mesh(part, o.material[gr.materialIndex]); m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); o.parent.add(m);
      });
      o.parent.remove(o);
    });
    g.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      if (o.material.isMeshPhysicalMaterial) o.material = new THREE.MeshStandardMaterial({ color: 0x9fb4c0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
      // GLB (Android, déposé sur le serveur) : photos de bois en JPEG au lieu de PNG, 10 fois plus léger
      if (!o.material.transparent && !o.material.alphaTest) ['map', 'normalMap', 'roughnessMap'].forEach(function (k) { var t = o.material[k]; if (t) t.userData.mimeType = 'image/jpeg'; });
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
    sc.updateMatrixWorld(true); // les exportateurs lisent les matrices : les pièces ajoutées ci-dessus doivent être à leur place
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
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.integrity = 'sha512-ZDSPMa/JM1D+7kdg2x3BsruQ6T/JpJo3jWDWkCZsP+5yVyp1KfESqLI+7RqB5k24F7p2cV7i2YHh/890y6P6Sw=='; s.crossOrigin = 'anonymous'; s.onload = go; s.onerror = function () { res(null); }; document.head.appendChild(s);
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
      var glbP = new Promise(function (res, rej) { new X.GLTFExporter().parse(sc, res, rej, { binary: true, maxTextureSize: 1024 }); });
      if (IOS) return Promise.resolve(usdzP).then(function (u) {
        var url = URL.createObjectURL(new Blob([u], { type: 'model/vnd.usdz+zip' })), a = document.createElement('a');
        // Quick Look : taille réelle à l'ouverture, réductible au pincement. (Le commentaire était en fin de ligne et avalait la suite :
        // plus d'image, de lien ni de clic, le bouton ne faisait rien sur iPhone depuis la 3.1.1 — audit du 14/10)
        a.rel = 'ar'; a.href = url;
        a.appendChild(document.createElement('img')); document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
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

  function fichiersAR() { // GLB et USDZ du modèle affiché (contrôles)
    return exporteurs().then(function (X) { var sc = modeleExport();
      return Promise.all([new Promise(function (res, rej) { new X.GLTFExporter().parse(sc, res, rej, { binary: true, maxTextureSize: 1024 }); }), new X.USDZExporter().parse(sc)]); });
  }
  return { CHARGE_HTML: CHARGE_HTML, CHARGE_CSS: CHARGE_CSS, ouvrir: ouvrir, fermer: fermer, capture: capture, vue: function (v) { if (ouvert) ouvert.vers(v); }, montage: null, fichiersAR: fichiersAR, vuesDevis: vuesDevis, _etat: function () { return ouvert; } }; // _etat : contrôles automatiques seulement
})();
