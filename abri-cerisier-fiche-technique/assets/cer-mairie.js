/* Abri Cerisier — dossier mairie en PDF depuis le configurateur.
 * 1. coordonnées obligatoires (enregistrées sur le site, menu « Dossiers mairie », aucun mail automatique) ;
 * 2. placement de l'abri sur la parcelle cadastrale (photo aérienne IGN, distances aux limites) ;
 * 3. photos du terrain (facultatif) ; 4. PDF : situation, masse, coupe, façades et toiture, insertion, photos, notice.
 * Sources publiques : Base Adresse Nationale (adresse), API Carto IGN (parcelle), Géoplateforme IGN (cartes et photos aériennes).
 * Règle de formalité (service-public.fr, abri indépendant) : jusqu'à 5 m² aucune (déclaration en secteur protégé), jusqu'à 20 m² déclaration préalable, au-delà permis de construire. */
(function () {
  'use strict';
  var E = window.CerPlan, C = function () { return window.CER_3D || {}; };
  var WMTS = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&';
  var COUCHES = {
    plan: { l: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', s: 'normal', f: 'image/png' },
    ortho: { l: 'ORTHOIMAGERY.ORTHOPHOTOS', s: 'normal', f: 'image/jpeg' },
    cadastre: { l: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS', s: 'PCI vecteur', f: 'image/png' }
  };
  var D = { client: null, adresse: null, parcelle: null, place: null, photos: {}, images: {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fr = function (v, n) { return (Math.round(v * Math.pow(10, n == null ? 2 : n)) / Math.pow(10, n == null ? 2 : n)).toFixed(n == null ? 2 : n).replace('.', ','); };

  // ───────── projet : dimensions, surfaces, formalité ─────────
  function projet() {
    var ST = E.ST, d = E.calcDims(), type = ST.type || 'abri';
    var nom = { abri: 'Abri de jardin', garage: 'Garage', carport: 'Carport' }[type] || 'Abri de jardin';
    var toit = { '2PANS': 'toiture 2 pans', '1PAN': 'toiture 1 pan', TOIT_PLAT: 'toit plat', QUADRO: 'toit plat QUADRO (acrotère)' }[d.toit] || '';
    var sup = function (o) { return o > 0.5; };
    var xl = sup(d.ovL) ? -d.L / 2 - d.ovL : -d.L / 2, xr = sup(d.ovR) ? d.L / 2 + d.ovR : d.L / 2;
    var zf = sup(d.ovF) ? d.P / 2 + d.ovF : d.P / 2, zb = sup(d.ovB) ? -d.P / 2 - d.ovB : -d.P / 2;
    var emprise = type === 'carport' ? (d.htL || d.L) * (d.htP || d.P) : (xr - xl) * (zf - zb);
    var sdp = type === 'carport' ? 0 : (d.intL || d.L) * (d.intP || d.P);
    var hmax = (d.base || 0) + d.hExt + (d.rH || 0);
    var s = Math.max(emprise, sdp), protege = D.client && D.client.secteur === 'oui';
    var form = s <= 5 ? (protege ? 'dp' : 'aucune') : s <= 20 ? 'dp' : 'pc';
    var bard = (E.wallFin(d) || {}).label || '', couv = (E.couvFin(d) || {}).label || '';
    var menus = (ST.menus || []).map(function (m) { return m.siteLabel || m.label; });
    return { d: d, type: type, nom: nom, toit: toit, emprise: emprise, sdp: sdp, hmax: hmax, formalite: form, bardage: bard, couverture: couv, menus: menus,
      titre: nom + ' ' + fr(d.L) + ' x ' + fr(d.P) + ' m, ' + toit,
      murs: d.sys === 'ossature' || d.isQuadro ? 'ossature bois bardée' : 'madriers de bois autoclave' };
  }
  var LIB_FORM = { aucune: 'Aucune autorisation (sous réserve du PLU)', dp: 'Déclaration préalable de travaux', pc: 'Permis de construire' };

  // ───────── fenêtre ─────────
  var CSS = '.cermr{position:fixed;inset:0;z-index:100001;background:rgba(30,30,24,.6);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Jost,Futura,Arial,sans-serif;color:#2b2b22}' +
    '.cermr .b{position:relative;width:min(980px,100%);max-height:100%;overflow:auto;background:#fff;border-radius:18px;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '.cermr h2{margin:0 0 4px;font-size:21px}.cermr .sous{color:#77755f;margin:0 0 14px;font-size:14px}' +
    '.cermr .et{display:flex;gap:6px;margin:0 0 16px;flex-wrap:wrap}.cermr .et span{font-size:12px;padding:4px 10px;border-radius:12px;background:#f1efe7;color:#77755f}.cermr .et span.on{background:#515136;color:#fff}' +
    '.cermr form{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}.cermr label{display:grid;gap:4px;font-size:13px;color:#4b4a3c}.cermr label.l2{grid-column:1/-1}' +
    '.cermr input[type=text],.cermr input[type=email],.cermr input[type=tel],.cermr select{width:100%;box-sizing:border-box;border:1px solid #d9d5c7;border-radius:10px;padding:10px 12px;font:15px Jost,Arial,sans-serif;background:#fff;color:#2b2b22}' +
    '.cermr .chk{grid-column:1/-1;display:flex;gap:10px;align-items:flex-start;font-size:13px}.cermr .chk input{margin-top:3px}' +
    '.cermr .act{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}.cermr .act button,.cermr .btn{border:0!important;border-radius:22px!important;padding:11px 18px!important;font:600 15px Jost,Arial,sans-serif!important;cursor:pointer;background:#515136!important;color:#fff!important;margin:0!important}' +
    '.cermr .act button.sec,.cermr .btn.sec{background:#f1efe7!important;color:#2b2b22!important}' +
    '.cermr .x{position:absolute;top:12px;right:12px;width:36px!important;height:36px!important;border-radius:50%!important;border:0!important;background:#f1efe7!important;color:#2b2b22!important;font:400 22px/36px Arial!important;padding:0!important;cursor:pointer}' +
    '.cermr .err{color:#9a3412;font-size:13px;grid-column:1/-1;min-height:1em}.cermr .sugg{position:relative}.cermr .sugg ul{position:absolute;left:0;right:0;top:100%;z-index:3;margin:2px 0 0;padding:4px;list-style:none;background:#fff;border:1px solid #d9d5c7;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.12)}' +
    '.cermr .sugg li{padding:8px 10px;border-radius:8px;cursor:pointer;font-size:14px}.cermr .sugg li:hover{background:#f1efe7}' +
    '.cermr .masse{position:relative;width:100%;aspect-ratio:4/3;max-height:62vh;background:#ddd;border-radius:12px;overflow:hidden;touch-action:none}.cermr .masse canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab}' +
    '.cermr .rot{display:flex;align-items:center;gap:10px;margin:10px 0}.cermr .rot input{flex:1}.cermr .info{font-size:14px;line-height:1.5}.cermr .alerte{color:#9a3412}' +
    '.cermr .ph{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cermr .ph label{border:1px dashed #cfcab8;border-radius:12px;padding:12px;min-height:110px;align-content:start}.cermr .ph img{max-width:100%;max-height:140px;border-radius:8px;margin-top:6px}' +
    '@media (max-width:640px){.cermr form,.cermr .ph{grid-template-columns:1fr}.cermr .b{padding:18px 14px}}';
  var ov = null;
  function ouvrir() {
    fermer();
    ov = document.createElement('div'); ov.className = 'cermr';
    ov.innerHTML = '<style>' + CSS + '</style><div class="b"><button class="x" type="button" aria-label="Fermer">×</button><div class="corps"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.x').onclick = fermer; ov.addEventListener('click', function (e) { if (e.target === ov) fermer(); });
    etape1();
  }
  function fermer() { if (ov) { ov.remove(); ov = null; } }
  function corps(n, titre, sous, html) {
    var noms = ['Coordonnées', 'Implantation', 'Photos', 'Dossier PDF'];
    ov.querySelector('.corps').innerHTML = '<h2>' + titre + '</h2><p class="sous">' + sous + '</p><div class="et">' + noms.map(function (x, i) { return '<span class="' + (i === n ? 'on' : '') + '">' + (i + 1) + '. ' + x + '</span>'; }).join('') + '</div>' + html;
    return ov.querySelector('.corps');
  }

  // ───────── 1. coordonnées ─────────
  function etape1() {
    var c = D.client || {};
    var b = corps(0, 'Votre dossier mairie', 'Nous préparons les plans de votre projet pour la mairie. Indiquez vos coordonnées : un conseiller Abri Cerisier pourra vous aider pour le dépôt.',
      '<form novalidate><label>Prénom<input type="text" name="prenom" autocomplete="given-name" required value="' + esc(c.prenom) + '"></label>' +
      '<label>Nom<input type="text" name="nom" autocomplete="family-name" required value="' + esc(c.nom) + '"></label>' +
      '<label>Téléphone<input type="tel" name="tel" autocomplete="tel" required value="' + esc(c.tel) + '"></label>' +
      '<label>Email<input type="email" name="email" autocomplete="email" required value="' + esc(c.email) + '"></label>' +
      '<label class="l2 sugg">Adresse du terrain où sera posé l\'abri<input type="text" name="adresse" autocomplete="off" required value="' + esc(c.label) + '" placeholder="Numéro, rue, code postal, ville"><ul hidden></ul></label>' +
      '<label class="l2">Le terrain est-il en secteur protégé (abords d\'un monument historique, site classé ou patrimonial) ?<select name="secteur"><option value="nsp">Je ne sais pas</option><option value="non">Non</option><option value="oui">Oui</option></select></label>' +
      '<input type="text" name="site_web" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
      '<label class="chk"><input type="checkbox" name="consentement"> <span>J\'accepte qu\'Abri Cerisier conserve ces informations pour me recontacter au sujet de mon projet.' + (C().confid ? ' <a href="' + esc(C().confid) + '" target="_blank" rel="noopener">Confidentialité</a>' : '') + '</span></label>' +
      '<p class="err"></p></form><div class="act"><button type="button" class="sec" data-a="annuler">Annuler</button><button type="button" data-a="suite">Continuer</button></div>');
    var f = b.querySelector('form'), ad = f.adresse, ul = b.querySelector('.sugg ul'), t = 0, choix = D.adresse;
    if (c.secteur) f.secteur.value = c.secteur;
    ad.addEventListener('input', function () {
      choix = null; clearTimeout(t); var q = ad.value.trim(); if (q.length < 5) { ul.hidden = true; return; }
      t = setTimeout(function () {
        fetch('https://api-adresse.data.gouv.fr/search/?limit=5&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
          var fs = (j.features || []).filter(function (x) { return x.properties.type !== 'municipality'; });
          ul.innerHTML = fs.map(function (x, i) { return '<li data-i="' + i + '">' + esc(x.properties.label) + '</li>'; }).join(''); ul.hidden = !fs.length; ul._fs = fs;
        }).catch(function () {});
      }, 250);
    });
    ul.addEventListener('click', function (e) { var li = e.target.closest('li'); if (!li) return; choix = ul._fs[+li.dataset.i]; ad.value = choix.properties.label; ul.hidden = true; });
    b.querySelector('[data-a=annuler]').onclick = fermer;
    b.querySelector('[data-a=suite]').onclick = function () {
      var err = b.querySelector('.err'), v = { prenom: f.prenom.value.trim(), nom: f.nom.value.trim(), tel: f.tel.value.trim(), email: f.email.value.trim(), secteur: f.secteur.value, site_web: f.site_web.value };
      var manque = [];
      if (!v.prenom) manque.push('prénom'); if (!v.nom) manque.push('nom');
      if (!/^(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}$/.test(v.tel.replace(/\s+/g, ' '))) manque.push('téléphone');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) manque.push('email');
      if (!choix) manque.push('adresse (choisissez-la dans la liste)');
      if (!f.consentement.checked) manque.push('accord pour être recontacté');
      if (manque.length) { err.textContent = 'À compléter : ' + manque.join(', ') + '.'; return; }
      err.textContent = 'Recherche de votre parcelle…';
      var p = choix.properties, g = choix.geometry.coordinates;
      D.adresse = choix; D.client = Object.assign(v, { label: p.label, adresse: p.name, cp: p.postcode, ville: p.city, lon: g[0], lat: g[1] });
      parcelle(g[0], g[1]).then(function (pa) {
        D.parcelle = pa;
        var pr = projet();
        var corpsReq = Object.assign({}, v, { jeton: C().jeton, adresse: p.name, cp: p.postcode, ville: p.city, consentement: true, page: location.href.split('#')[0],
          parcelle: pa ? (pa.commune + ' ' + pa.section + ' ' + pa.numero + ' (' + fr(pa.contenance, 0) + ' m²)') : 'non trouvée',
          modele: pr.titre, surface: 'emprise ' + fr(pr.emprise, 1) + ' m², plancher ' + fr(pr.sdp, 1) + ' m², hauteur ' + fr(pr.hmax) + ' m', formalite: LIB_FORM[pr.formalite] });
        return fetch(C().rest + 'dossier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpsReq), credentials: 'same-origin' })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || 'Enregistrement impossible'); return j; }); });
      }).then(function () { etape2(); }).catch(function (e) { err.textContent = e.message || 'Une erreur est survenue, réessayez.'; });
    };
  }
  function parcelle(lon, lat) {
    var geom = JSON.stringify({ type: 'Point', coordinates: [lon, lat] });
    return fetch('https://apicarto.ign.fr/api/cadastre/parcelle?geom=' + encodeURIComponent(geom)).then(function (r) { return r.json(); }).then(function (j) {
      var f = (j.features || [])[0]; if (!f) return null; var pr = f.properties;
      var anneaux = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map(function (p) { return p[0]; }) : [f.geometry.coordinates[0]];
      return { commune: pr.nom_com, insee: pr.code_insee, section: pr.section, numero: pr.numero, contenance: pr.contenance, idu: pr.idu, anneaux: anneaux };
    }).catch(function () { return null; });
  }

  // ───────── cartes IGN (tuiles Web Mercator) ─────────
  var px = function (lon, lat, z) { var n = 256 * Math.pow(2, z), la = lat * Math.PI / 180; return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n]; };
  var mpp = function (lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); };
  function tuile(c, x, y, z) {
    return new Promise(function (res) { var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = WMTS + 'LAYER=' + c.l + '&STYLE=' + encodeURIComponent(c.s) + '&FORMAT=' + encodeURIComponent(c.f) + '&TILEMATRIX=' + z + '&TILEROW=' + y + '&TILECOL=' + x; });
  }
  // fond de carte w × h centré sur (lon, lat), tuiles du niveau z agrandies k fois (l'IGN s'arrête au niveau 19, environ 19 cm par pixel) ;
  // chaque tuile est posée sur des pixels entiers, sans liseré entre les tuiles
  function fond(lon, lat, z, w, h, couches, k) {
    k = k || 1;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var g = cv.getContext('2d'), c0 = px(lon, lat, z), ox = c0[0] - w / 2 / k, oy = c0[1] - h / 2 / k;
    g.fillStyle = '#e8e6df'; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = 'high';
    var tx0 = Math.floor(ox / 256), ty0 = Math.floor(oy / 256), tx1 = Math.floor((ox + w / k) / 256), ty1 = Math.floor((oy + h / k) / 256);
    var X = function (t) { return Math.round((t * 256 - ox) * k); }, Y = function (t) { return Math.round((t * 256 - oy) * k); };
    var seq = Promise.resolve();
    couches.forEach(function (c) {
      seq = seq.then(function () { var ps = [];
        for (var x = tx0; x <= tx1; x++) for (var y = ty0; y <= ty1; y++) (function (x, y) { ps.push(tuile(COUCHES[c], x, y, z).then(function (im) { if (im) g.drawImage(im, X(x), Y(y), X(x + 1) - X(x), Y(y + 1) - Y(y)); })); })(x, y);
        return Promise.all(ps); });
    });
    return seq.then(function () { return { cv: cv, g: g, ox: ox, oy: oy, z: z, k: k, lat: lat,
      toPx: function (lo, la) { var p = px(lo, la, z); return [(p[0] - ox) * k, (p[1] - oy) * k]; }, m: mpp(lat, z) / k }; });
  }
  // parcelles voisines (même API Carto) dans un rectangle autour du terrain
  function voisines(lon, lat, rayon) {
    var dl = rayon / (111320 * Math.cos(lat * Math.PI / 180)), dp = rayon / 110574;
    var geom = JSON.stringify({ type: 'Polygon', coordinates: [[[lon - dl, lat - dp], [lon + dl, lat - dp], [lon + dl, lat + dp], [lon - dl, lat + dp], [lon - dl, lat - dp]]] });
    return fetch('https://apicarto.ign.fr/api/cadastre/parcelle?_limit=500&geom=' + encodeURIComponent(geom)).then(function (r) { return r.json(); }).then(function (j) {
      return (j.features || []).map(function (f) { return { numero: f.properties.numero, section: f.properties.section, idu: f.properties.idu,
        anneaux: f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map(function (p) { return p[0]; }) : [f.geometry.coordinates[0]] }; });
    }).catch(function () { return []; });
  }
  function nord(g, x, y) { g.save(); g.fillStyle = '#111'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.font = 'bold 22px Arial'; g.textAlign = 'center';
    g.beginPath(); g.moveTo(x, y - 26); g.lineTo(x + 11, y + 8); g.lineTo(x, y); g.lineTo(x - 11, y + 8); g.closePath(); g.stroke(); g.fill(); g.strokeText('N', x, y + 32); g.fillText('N', x, y + 32); g.restore(); }
  function echelle(g, x, y, metresParPx) {
    var cibles = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000], m = cibles.find(function (v) { return v / metresParPx >= 90; }) || 1000, l = m / metresParPx;
    g.save(); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x - 8, y - 26, l + 16, 40); g.fillStyle = '#111'; g.fillRect(x, y, l / 2, 6); g.strokeStyle = '#111'; g.strokeRect(x, y, l, 6);
    g.font = '14px Arial'; g.textAlign = 'center'; g.fillText('0', x, y - 6); g.fillText(m >= 1000 ? (m / 1000) + ' km' : m + ' m', x + l, y - 6); g.restore();
  }

  // ───────── 2. implantation sur la parcelle ─────────
  var Z_MASSE = 19;
  function etape2() {
    var pa = D.parcelle, c = D.client;
    var b = corps(1, 'Placez votre ' + (E.ST.type === 'garage' ? 'garage' : E.ST.type === 'carport' ? 'carport' : 'abri') + ' sur votre terrain',
      pa ? 'Parcelle ' + esc(pa.section + ' ' + pa.numero) + ' à ' + esc(pa.commune) + ' (' + fr(pa.contenance, 0) + ' m²). Faites glisser l\'abri à sa place et tournez-le : les distances aux limites se calculent seules.'
        : 'Nous n\'avons pas trouvé la parcelle cadastrale de cette adresse : placez l\'abri sur la photo aérienne.',
      '<div class="masse"><canvas></canvas></div><div class="rot"><span>Orientation</span><input type="range" min="-180" max="180" step="1" value="' + ((D.place && D.place.rot) || 0) + '"><span class="deg"></span></div>' +
      '<div class="info"></div><div class="act"><button type="button" class="sec" data-a="retour">Retour</button><button type="button" data-a="suite">Continuer</button></div>');
    var cv = b.querySelector('canvas'), W = 1200, H = 900; cv.width = W; cv.height = H; var g = cv.getContext('2d');
    var centre = pa ? centroide(pa.anneaux[0]) : [c.lon, c.lat];
    // cadrage : la parcelle occupe environ 70 % de la vue, entre 22 m et 160 m de large
    var larg = 30;
    if (pa) { var xs = [], ys = []; pa.anneaux.forEach(function (a) { a.forEach(function (q) { var p = px(q[0], q[1], Z_MASSE); xs.push(p[0]); ys.push(p[1]); }); });
      var m19 = mpp(centre[1], Z_MASSE); larg = Math.max((Math.max.apply(null, xs) - Math.min.apply(null, xs)) * m19, (Math.max.apply(null, ys) - Math.min.apply(null, ys)) * m19 * W / H) / 0.7; }
    larg = Math.min(160, Math.max(22, larg));
    var kz = W / (larg / mpp(centre[1], Z_MASSE));
    b.querySelector('.info').textContent = 'Chargement de la photo aérienne…';
    Promise.all([fond(centre[0], centre[1], Z_MASSE, W, H, ['ortho'], kz), voisines(centre[0], centre[1], larg * 0.8)]).then(function (r) {
      var F = r[0], vois = r[1], m = F.m, pr = projet(), d = pr.d, toPx = F.toPx;
      var anneaux = pa ? pa.anneaux.map(function (a) { return a.map(function (q) { return toPx(q[0], q[1]); }); }) : [];
      var autres = vois.filter(function (v) { return !pa || v.idu !== pa.idu; }).map(function (v) { return { n: v.numero.replace(/^0+/, ''), a: v.anneaux.map(function (a) { return a.map(function (q) { return toPx(q[0], q[1]); }); }) }; });
      var adr = toPx(c.lon, c.lat);
      var pl = D.place || { x: anneaux.length ? (function () { var cc = centroidePx(anneaux[0]); return cc; })()[0] : adr[0], y: anneaux.length ? centroidePx(anneaux[0])[1] : adr[1], rot: 0 };
      D.place = pl;
      var rotInp = b.querySelector('.rot input'), deg = b.querySelector('.deg');
      function rect(L, P, dx, dz) { // coins (repère abri : x vers la droite, z vers l'avant) → pixels de la carte
        var a = pl.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
        return [[-L / 2 + dx, -P / 2 + dz], [L / 2 + dx, -P / 2 + dz], [L / 2 + dx, P / 2 + dz], [-L / 2 + dx, P / 2 + dz]].map(function (q) {
          var x = q[0] / m, y = q[1] / m; return [pl.x + x * cs - y * sn, pl.y + x * sn + y * cs]; });
      }
      function dessiner() {
        g.drawImage(F.cv, 0, 0);
        autres.forEach(function (v) { v.a.forEach(function (an) { g.save(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.beginPath(); an.forEach(function (q, i) { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke(); g.restore(); }); });
        anneaux.forEach(function (an) { g.save(); g.strokeStyle = '#ffd400'; g.lineWidth = 4; g.setLineDash([]); g.beginPath(); an.forEach(function (q, i) { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke(); g.restore(); });
        var murs = rect(d.L, d.P, 0, 0), toit = rect(d.L + d.ovL + d.ovR, d.P + d.ovF + d.ovB, (d.ovR - d.ovL) / 2, (d.ovF - d.ovB) / 2);
        poly(g, toit, 'rgba(255,255,255,.25)', '#ffffff', [10, 6], 2.5); poly(g, murs, 'rgba(196,184,134,.92)', '#3d3a2e', [], 3);
        var av = murs[2], av2 = murs[3]; g.save(); g.fillStyle = '#c2410c'; g.beginPath(); g.arc((av[0] + av2[0]) / 2, (av[1] + av2[1]) / 2, 7, 0, 7); g.fill(); g.restore(); // porte : devant
        var dist = distances(murs, anneaux);
        dist.forEach(function (dd) { if (!dd) return; g.save(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(dd.a[0], dd.a[1]); g.lineTo(dd.b[0], dd.b[1]); g.stroke();
          g.setLineDash([]); g.font = 'bold 22px Arial'; g.textAlign = 'center'; var tx = (dd.a[0] + dd.b[0]) / 2, ty = (dd.a[1] + dd.b[1]) / 2, s = fr(dd.d * m, 2) + ' m';
          g.fillStyle = 'rgba(0,0,0,.65)'; var w = g.measureText(s).width + 12; g.fillRect(tx - w / 2, ty - 15, w, 26); g.fillStyle = '#fff'; g.fillText(s, tx, ty + 6); g.restore(); });
        nord(g, W - 50, 60); echelle(g, 30, H - 30, m);
        var mins = dist.filter(Boolean).map(function (x) { return x.d * m; }), mn = mins.length ? Math.min.apply(null, mins) : null;
        deg.textContent = pl.rot + '°';
        var info = b.querySelector('.info');
        info.innerHTML = mn == null ? 'Placez l\'abri sur votre terrain.' : 'Distance la plus courte à une limite : <b>' + fr(mn) + ' m</b>.' +
          (mn > 0.15 && mn < 3 ? ' <span class="alerte">Si le PLU de votre commune ne dit rien, l\'abri doit être en limite de propriété ou à 3 m au moins.</span>' : '');
        pl.dist = dist.map(function (x) { return x ? x.d * m : null; });
      }
      var drag = null;
      var pos = function (e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
      cv.addEventListener('pointerdown', function (e) { var p = pos(e); drag = [p[0] - pl.x, p[1] - pl.y]; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', function (e) { if (!drag) return; var p = pos(e); pl.x = p[0] - drag[0]; pl.y = p[1] - drag[1]; dessiner(); });
      cv.addEventListener('pointerup', function () { drag = null; });
      rotInp.addEventListener('input', function () { pl.rot = +rotInp.value; dessiner(); });
      dessiner();
      D.masse = { F: F, dessiner: dessiner, cv: cv, m: m };
    });
    b.querySelector('[data-a=retour]').onclick = etape1;
    b.querySelector('[data-a=suite]').onclick = function () { if (D.masse) D.images.masse = D.masse.cv.toDataURL('image/jpeg', 0.9); etape3(); };
  }
  function poly(g, pts, fill, stroke, dash, lw) { g.save(); g.beginPath(); pts.forEach(function (q, i) { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } g.setLineDash(dash || []); g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); g.restore(); }
  function centroide(an) { var x = 0, y = 0; an.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / an.length, y / an.length]; }
  function centroidePx(an) { return centroide(an); }
  // distance de chaque face du mur à la limite, perpendiculairement (rayon depuis le milieu de la face)
  function distances(murs, anneaux) {
    if (!anneaux.length) return [];
    var segs = []; anneaux.forEach(function (an) { for (var i = 0; i < an.length; i++) segs.push([an[i], an[(i + 1) % an.length]]); });
    var c = centroide(murs);
    return [0, 1, 2, 3].map(function (k) {
      var a = murs[k], b = murs[(k + 1) % 4], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = mx - c[0], ny = my - c[1], nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
      var best = null;
      segs.forEach(function (s) { var t = rayon(mx, my, nx, ny, s[0], s[1]); if (t != null && t >= 0 && (best == null || t < best)) best = t; });
      return best == null ? null : { d: best, a: [mx, my], b: [mx + nx * best, my + ny * best] };
    });
  }
  function rayon(ox, oy, dx, dy, p, q) { var ex = q[0] - p[0], ey = q[1] - p[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) return null;
    var t = ((p[0] - ox) * ey - (p[1] - oy) * ex) / den, u = ((p[0] - ox) * dy - (p[1] - oy) * dx) / den; return u >= 0 && u <= 1 ? t : null; }

  // ───────── 3. photos ─────────
  function etape3() {
    var b = corps(2, 'Photos de votre terrain', 'Facultatif mais demandé par la plupart des mairies. Vous pourrez aussi les ajouter à la main au dossier.',
      '<div class="ph"><label>Photo proche : l\'endroit où sera posé l\'abri<input type="file" accept="image/*" data-k="proche">' + (D.photos.proche ? '<img src="' + D.photos.proche + '">' : '') + '</label>' +
      '<label>Photo lointaine : le terrain dans son environnement, depuis la rue<input type="file" accept="image/*" data-k="loin">' + (D.photos.loin ? '<img src="' + D.photos.loin + '">' : '') + '</label></div>' +
      '<p class="info" style="margin-top:12px">Pour le document d\'insertion, nous utilisons ' + (window.CerVue3D && window.CerVue3D.montage ? 'votre montage photo réalisé dans la vue 3D.' : 'une vue 3D de votre projet. Pour un montage sur une photo de votre jardin : « Voir en 3D » puis « Sur une photo de mon jardin ».') + '</p>' +
      '<div class="act"><button type="button" class="sec" data-a="retour">Retour</button><button type="button" data-a="suite">Créer mon dossier PDF</button></div>');
    b.querySelectorAll('input[type=file]').forEach(function (inp) {
      inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; if (!f) return; reduire(f, 1800).then(function (url) { D.photos[inp.dataset.k] = url; etape3(); }); });
    });
    b.querySelector('[data-a=retour]').onclick = etape2;
    b.querySelector('[data-a=suite]').onclick = etape4;
  }
  function reduire(f, max) { return new Promise(function (res) { var im = new Image(); im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.85)); }; im.src = URL.createObjectURL(f); }); }

  // ───────── 4. PDF ─────────
  function jspdf() { return window.jspdf ? Promise.resolve(window.jspdf) : new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = function () { res(window.jspdf); }; s.onerror = rej; document.head.appendChild(s); }); }
  function vueMoteur(side, w, h) { // dessin du configurateur, cotes comprises → image PNG
    var ST = E.ST, d = E.calcDims(), sv = { scale: ST.scale, picto: ST.picto, mur: ST.murSeul }, svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('width', w * 3); svg.setAttribute('height', h * 3);
    try { ST.picto = false; ST.murSeul = false;
      if (side === 'plan') { ST.scale = null; E.drawPlan(svg, d, w, h); } else { ST.scale = E.commonScale(d, w, h); E.drawElev(svg, d, side, w, h); }
    } finally { ST.scale = sv.scale; ST.picto = sv.picto; ST.murSeul = sv.mur; }
    return new Promise(function (res) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3; var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); };
      im.onerror = function () { res(null); }; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg)); });
  }
  function situation(z, w, h) {
    var c = D.client; return fond(c.lon, c.lat, z, w, h, ['plan']).then(function (F) { var g = F.g, p = px(c.lon, c.lat, z);
      var x = p[0] - F.ox, y = p[1] - F.oy; g.save(); g.fillStyle = '#c2410c'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.stroke(); g.restore();
      nord(g, w - 46, 56); echelle(g, 26, h - 26, mpp(c.lat, z)); return F.cv.toDataURL('image/jpeg', 0.9); });
  }
  function etape4() {
    var b = corps(3, 'Création de votre dossier', 'Préparation des plans et des cartes, quelques secondes…', '<p class="info" data-etat>Cartes IGN…</p>');
    var etat = function (t) { var e = b.querySelector('[data-etat]'); if (e) e.textContent = t; };
    var pr = projet(), I = {};
    Promise.all([situation(14, 1100, 760).then(function (u) { I.sit1 = u; }), situation(17, 1100, 760).then(function (u) { I.sit2 = u; })])
      .then(function () { etat('Plans et façades…'); return Promise.all(['face', 'droite', 'gauche', 'fond'].map(function (s) { return vueMoteur(s, 380, 280).then(function (u) { I[s] = u; }); }).concat([vueMoteur('plan', 480, 340).then(function (u) { I.plan = u; })])); })
      .then(function () { etat('Vue 3D du projet…'); fermerTemp(); return window.CerVue3D ? window.CerVue3D.capture().then(function (u) { I.insertion = u; }) : null; })
      .then(function () { rouvrir(); etat('Mise en page du PDF…'); return jspdf(); })
      .then(function (J) { var doc = construirePdf(J, pr, I); var nom = 'dossier-mairie-' + (D.client.nom || 'abri').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf';
        doc.save(nom);
        corps(3, 'Votre dossier est prêt', 'Le PDF « ' + esc(nom) + ' » est téléchargé.', '<p class="info">Il reste à remplir et signer le formulaire officiel (' + esc(LIB_FORM[pr.formalite].toLowerCase()) + ') sur service-public.fr, puis à le déposer en mairie avec ce dossier. Un conseiller Abri Cerisier peut vous accompagner.</p><div class="act"><button type="button" data-a="fin">Fermer</button></div>');
        ov.querySelector('[data-a=fin]').onclick = fermer;
      })
      .catch(function (e) { rouvrir(); etat('La création du dossier a échoué : ' + (e && e.message ? e.message : 'réessayez.')); });
  }
  function fermerTemp() { if (ov) ov.style.visibility = 'hidden'; }
  function rouvrir() { if (ov) ov.style.visibility = ''; }

  // coupe transversale de principe, cotée : terrain naturel, plancher, murs, toiture et débords, hauteurs
  function coupe(doc, pr, x0, y0, w, h) {
    var d = pr.d, o = d.orient, base = d.base || 0, hE = d.hExt, rH = d.rH || 0, wt = Math.max(0.03, d.wt || 0.03);
    var long = d.toit === '1PAN' && (o === 'face' || o === 'fond'); // la coupe suit la pente
    var W = long ? d.P : d.L, oa = long ? d.ovB : d.ovL, ob = long ? d.ovF : d.ovR, tan = Math.tan(d.penteRad || 0);
    var ep = Math.min(0.2, Math.max(0.05, rH - (d.toit === '2PANS' ? W / 2 : W) * tan)); // épaisseur de toiture : le faîtage tombe à la hauteur maximale du configurateur
    var dessus = function (u) { // dessous de la toiture à l'abscisse u (0 = milieu)
      if (d.toit === '2PANS') return base + hE + (W / 2 - Math.abs(u)) * tan;
      if (d.toit === '1PAN') { var bas = long ? (o === 'face' ? 1 : -1) : (o === 'droite' ? 1 : -1); return base + hE + (W / 2 - bas * u) * tan; }
      return base + hE + (d.isQuadro ? 0 : 0);
    };
    var ua = -W / 2 - oa, ub = W / 2 + ob, H = Math.max(dessus(0), dessus(ua), dessus(ub)) + ep + (d.isQuadro ? rH : d.toit === 'TOIT_PLAT' ? 0.39 : 0);
    var k = Math.min((w - 40) / (ub - ua + 1.2), (h - 20) / (H + 0.4)), cx = x0 + 22 + (0.6 - ua) * k, gy = y0 + h - 12;
    var X = function (u) { return cx + u * k; }, Y = function (v) { return gy - v * k; };
    doc.setLineDash([], 0); doc.setDrawColor(60); doc.setLineWidth(0.5);
    doc.line(x0, gy, x0 + w - 10, gy); doc.setFontSize(8); doc.setTextColor(90); doc.text('Terrain naturel (TN) conservé', x0 + 2, gy + 4);
    for (var t = x0; t < x0 + w - 12; t += 3) doc.line(t, gy, t - 2, gy + 2);
    if (base > 0) { doc.setFillColor(205, 203, 196); doc.rect(X(-W / 2), Y(base), W * k, base * k, 'FD'); }
    doc.setFillColor(196, 184, 134); doc.setDrawColor(60, 58, 40);
    var mur = function (u0, u1) { var top = Math.min(dessus(u0), dessus(u1)); if (d.isQuadro) top = base + hE + rH; else if (d.toit === 'TOIT_PLAT') top = base + hE;
      doc.rect(X(u0), Y(top), (u1 - u0) * k, (top - base) * k, 'FD'); };
    mur(-W / 2, -W / 2 + wt); mur(W / 2 - wt, W / 2);
    doc.setDrawColor(40); doc.setLineWidth(0.25); doc.line(X(-W / 2 + wt), Y(base), X(W / 2 - wt), Y(base)); // plancher
    // toiture
    doc.setFillColor(70, 70, 70); doc.setLineWidth(0.4);
    if (d.toit === '2PANS' || d.toit === '1PAN') {
      var pts = d.toit === '2PANS' ? [ua, 0, ub] : [ua, ub];
      for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1];
        doc.triangle(X(a), Y(dessus(a)), X(b), Y(dessus(b)), X(b), Y(dessus(b) + ep), 'F'); doc.triangle(X(a), Y(dessus(a)), X(b), Y(dessus(b) + ep), X(a), Y(dessus(a) + ep), 'F'); }
    } else {
      var hb = d.isQuadro ? rH : 0.39; doc.setFillColor(d.isQuadro ? 196 : 120, d.isQuadro ? 184 : 112, d.isQuadro ? 134 : 80);
      if (d.isQuadro) { doc.setFillColor(40, 40, 40); doc.rect(X(-W / 2 + wt), Y(base + hE + rH - 0.06), (W - 2 * wt) * k, 0.03 * k, 'F'); } // membrane EPDM
      else doc.rect(X(ua), Y(base + hE + hb), (ub - ua) * k, hb * k, 'FD');
    }
    // cotes
    doc.setDrawColor(120, 60, 20); doc.setTextColor(120, 60, 20); doc.setLineWidth(0.25); doc.setFontSize(9);
    var cv = function (u, v0, v1, lab, droite) { var x = X(u); doc.line(x, Y(v0), x, Y(v1)); doc.line(x - 1.5, Y(v0), x + 1.5, Y(v0)); doc.line(x - 1.5, Y(v1), x + 1.5, Y(v1));
      doc.text(lab, x + (droite ? 2 : -2), (Y(v0) + Y(v1)) / 2, { align: droite ? 'left' : 'right' }); };
    var ch = function (u0, u1, v, lab) { var y = Y(v); doc.line(X(u0), y, X(u1), y); doc.line(X(u0), y - 1.5, X(u0), y + 1.5); doc.line(X(u1), y - 1.5, X(u1), y + 1.5);
      doc.text(lab, (X(u0) + X(u1)) / 2, y + 4.5, { align: 'center' }); };
    cv(ub + 0.35, 0, pr.hmax, 'Hauteur maximale ' + fr(pr.hmax) + ' m', true);
    cv(ua - 0.3, 0, base + hE, 'Hauteur des murs ' + fr(base + hE) + ' m', false);
    if (d.hInt) cv(0, base, base + d.hInt, 'Intérieur ' + fr(d.hInt) + ' m', true);
    ch(-W / 2, W / 2, -0.22, 'Murs ' + fr(W) + ' m');
    if (oa + ob > 0.05) ch(ua, ub, -0.42, 'Avec débords de toiture ' + fr(ub - ua) + ' m');
    if (d.toit === '2PANS' || d.toit === '1PAN') { doc.setTextColor(60); doc.text('Pente ' + Math.round((d.penteRad || 0) * 180 / Math.PI) + '°', X(ua + (d.toit === '2PANS' ? W / 4 : W / 2)), Y(dessus(ua + (d.toit === '2PANS' ? W / 4 : W / 2)) + ep) - 3, { align: 'center' }); }
    doc.setTextColor(40); doc.setDrawColor(0); doc.setLineWidth(0.2);
  }

  function construirePdf(J, pr, I) {
    var doc = new J.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }), Wp = 297, Hp = 210, M = 14, c = D.client, pa = D.parcelle, d = pr.d;
    var vert = [81, 81, 54], gris = [119, 117, 95];
    // pièces du formulaire cerfa 13703 (déclaration préalable, maison individuelle et annexes) ou 13406 (permis de construire) : DP1 à DP8 / PCMI1 à PCMI8
    var pre = pr.formalite === 'pc' ? 'PCMI' : 'DP', cerfa = pr.formalite === 'pc' ? 'cerfa n° 13406' : 'cerfa n° 13703';
    var pieces = [[pre + '1', 'Plan de situation du terrain'], [pre + '2', 'Plan de masse coté'], [pre + '3', 'Plan en coupe'], [pre + '4', 'Notice descriptive'],
      [pre + '5', 'Plans des façades et de la toiture'], [pre + '6', 'Document graphique d\'insertion'], [pre + '7', 'Photographie de l\'environnement proche'], [pre + '8', 'Photographie du paysage lointain']];
    var P_ = function (i) { return pieces[i][0] + ' - ' + pieces[i][1]; };
    var page = 1;
    var entete = function (titre, sous) { doc.setFillColor(81, 81, 54); doc.rect(0, 0, Wp, 16, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(titre, M, 10.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text((c.prenom + ' ' + c.nom + '  -  ' + c.label).slice(0, 110), Wp - M, 10.5, { align: 'right' }); doc.setTextColor(40);
      if (sous) { doc.setFontSize(10); doc.setTextColor(gris[0], gris[1], gris[2]); doc.text(sous, M, 23); doc.setTextColor(40); } };
    var pied = function (x0) { doc.setFontSize(7.5); doc.setTextColor(gris[0], gris[1], gris[2]); x0 = x0 || M;
      var t = doc.splitTextToSize('Dossier préparé avec le configurateur Abri Cerisier le ' + new Date().toLocaleDateString('fr-FR') + '. Le plan local d\'urbanisme (PLU) de votre commune s\'applique : vérifiez les règles avant dépôt.', Wp - M - x0 - 18);
      doc.text(t, x0, Hp - 6 - 3.2 * (t.length - 1));
      doc.text('Page ' + page, Wp - M, Hp - 6, { align: 'right' }); doc.setTextColor(40); };
    var image = function (url, x, y, w, h, fmt) { if (!url) { doc.setDrawColor(200); doc.rect(x, y, w, h); doc.setFontSize(10); doc.text('Image indisponible', x + w / 2, y + h / 2, { align: 'center' }); return; }
      var p = doc.getImageProperties(url), k = Math.min(w / p.width, h / p.height), ww = p.width * k, hh = p.height * k; doc.addImage(url, fmt || (url.indexOf('image/png') > 0 ? 'PNG' : 'JPEG'), x + (w - ww) / 2, y + (h - hh) / 2, ww, hh); };
    var suivante = function (x0) { pied(x0); doc.addPage(); page++; };

    // 1. page de garde
    doc.setFillColor(81, 81, 54); doc.rect(0, 0, 100, Hp, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text(doc.splitTextToSize(LIB_FORM[pr.formalite], 80), M, 34);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(pr.nom + ' en bois', 80), M, 66);
    doc.setFontSize(9); doc.text(doc.splitTextToSize('Pièces graphiques et notice à joindre au formulaire officiel ' + cerfa + ' (service-public.fr). Abri Cerisier.', 76), M, Hp - 24);
    if (I.insertion) image(I.insertion, 108, 14, 175, 92);
    doc.setTextColor(40); var y = 116;
    var ligne = function (k, v) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(k, 108, y); doc.setFont('helvetica', 'normal'); var t = doc.splitTextToSize(String(v), 120); doc.text(t, 160, y); y += 5.2 * t.length; };
    ligne('Demandeur', c.prenom + ' ' + c.nom + '  -  ' + c.tel + '  -  ' + c.email);
    ligne('Terrain', c.label);
    ligne('Parcelle cadastrale', pa ? (pa.commune + ', section ' + pa.section + ' n° ' + pa.numero + ' (' + fr(pa.contenance, 0) + ' m²)') : 'à compléter');
    ligne('Projet', pr.titre + ', murs en ' + pr.murs);
    ligne('Surfaces', 'emprise au sol ' + fr(pr.emprise, 1) + ' m²  -  surface de plancher ' + fr(pr.sdp, 1) + ' m²');
    ligne('Hauteur maximale', fr(pr.hmax) + ' m au-dessus du terrain naturel');
    ligne('Formalité', LIB_FORM[pr.formalite] + (pr.formalite === 'aucune' ? ' : jusqu\'à 5 m², hors secteur protégé.' : pr.formalite === 'dp' ? ' : de 5 à 20 m² (ou jusqu\'à 20 m² en secteur protégé).' : ' : plus de 20 m².'));
    y += 2; doc.setFont('helvetica', 'bold'); doc.text('Pièces jointes', 108, y); y += 5; doc.setFont('helvetica', 'normal');
    pieces.forEach(function (p) { doc.text(p[0] + '  ' + p[1], 112, y); y += 4.6; });
    suivante(108);
    // 2. situation
    entete(P_(0), 'Situe le terrain dans la commune (Plan IGN). Point orange : le terrain.');
    image(I.sit1, M, 28, 131, 152); image(I.sit2, M + 138, 28, 131, 152);
    doc.setFontSize(8); doc.text('Échelle large', M, 186); doc.text('Échelle rapprochée', M + 138, 186); doc.text('Source : IGN, Géoplateforme (Plan IGN)', Wp - M, 186, { align: 'right' }); suivante();
    // 3. masse
    entete(P_(1), 'Abri (beige) et emprise de sa toiture (pointillés) sur la parcelle (contour jaune). Distances aux limites en mètres. Point orange : côté porte.');
    image(D.images.masse, M, 27, 190, 160);
    var yy = 34; doc.setFontSize(9.5);
    var lg = function (k, v) { doc.setFont('helvetica', 'bold'); doc.text(k, 212, yy); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(String(v), 70), 212, yy + 4.5); yy += 12; };
    lg('Dimensions des murs', fr(d.L) + ' x ' + fr(d.P) + ' m');
    lg('Emprise de la toiture', fr(d.L + d.ovL + d.ovR) + ' x ' + fr(d.P + d.ovF + d.ovB) + ' m');
    lg('Emprise au sol', fr(pr.emprise, 1) + ' m²');
    var dd = (D.place && D.place.dist || []).filter(function (x) { return x != null; });
    lg('Distances aux limites', dd.length ? dd.map(function (x) { return fr(x) + ' m'; }).join('  /  ') : 'à compléter');
    lg('Parcelle', pa ? (pa.section + ' ' + pa.numero + ', ' + fr(pa.contenance, 0) + ' m²') : 'à compléter');
    doc.setFontSize(8); doc.text('Fond : IGN, photographie aérienne et parcellaire cadastral.', 212, 182); suivante();
    // 4. coupe cotée (dessinée ici, en vecteurs)
    entete(P_(2), 'Coupe transversale de principe. Terrain naturel conservé : ni terrassement ni remblai.');
    coupe(doc, pr, M, 30, Wp - 2 * M, 150); suivante();
    // DP4 / PCMI4 : notice descriptive
    entete(P_(3), '');
    var tx = [
      'Projet : ' + pr.titre + '.',
      'Implantation : sur la parcelle ' + (pa ? pa.section + ' ' + pa.numero : '') + ', ' + c.label + '. Distance la plus courte à une limite : ' + (dd.length ? fr(Math.min.apply(null, dd)) + ' m' : 'à compléter') + '.',
      'Dimensions : murs ' + fr(d.L) + ' x ' + fr(d.P) + ' m ; emprise de la toiture ' + fr(d.L + d.ovL + d.ovR) + ' x ' + fr(d.P + d.ovF + d.ovB) + ' m ; hauteur maximale ' + fr(pr.hmax) + ' m.',
      'Surfaces : emprise au sol ' + fr(pr.emprise, 1) + ' m² ; surface de plancher ' + fr(pr.sdp, 1) + ' m².',
      'Murs : ' + pr.murs + ', aspect bois naturel (' + pr.bardage + ').',
      'Toiture : ' + pr.toit + ', couverture ' + pr.couverture + '.',
      'Menuiseries : ' + (pr.menus.length ? pr.menus.join(' ; ') : 'aucune') + '.',
      'Terrain : terrain naturel conservé, pose sur dalle ou plots ; aucun raccordement aux réseaux.',
      'Usage : annexe à l\'habitation (rangement de jardin), sans hébergement.'
    ];
    doc.setFontSize(11); var ty = 30; tx.forEach(function (t) { var l = doc.splitTextToSize(t, Wp - 2 * M); doc.text(l, M, ty); ty += 6.5 * l.length + 2; });
    suivante();
    // 5. façades et toiture
    entete(P_(4), 'Façades cotées en mètres. Matériaux : ' + pr.bardage + '. Couverture : ' + pr.couverture + '.');
    image(I.face, M, 26, 132, 82, 'PNG'); image(I.fond, M + 137, 26, 132, 82, 'PNG'); image(I.gauche, M, 110, 132, 82, 'PNG'); image(I.droite, M + 137, 110, 132, 82, 'PNG');
    doc.setFontSize(8); doc.text('Façade avant', M, 108); doc.text('Façade arrière', M + 137, 108); doc.text('Côté gauche', M, 193); doc.text('Côté droit', M + 137, 193); suivante();
    entete(P_(4) + ' (vue de dessus)', 'Vue de dessus : murs, débords de toiture, extensions et menuiseries.');
    image(I.plan, M, 26, Wp - 2 * M, 165, 'PNG'); suivante();
    // 6. insertion
    entete(P_(5), window.CerVue3D && window.CerVue3D.montage ? 'Montage du projet sur une photo du terrain.' : 'Vue du projet. Pour un montage sur photo : configurateur, « Voir en 3D », « Sur une photo de mon jardin ».');
    image(I.insertion, M, 26, Wp - 2 * M, 165); suivante();
    // 7. photos (cadre à compléter si le client ne les a pas ajoutées)
    entete(P_(6) + '  /  ' + pieces[7][0], 'Photo proche : l\'emplacement de l\'abri. Photo lointaine : le terrain dans le paysage, depuis la rue.');
    var cadre = function (url, x, t) { if (url) return image(url, x, 28, 131, 150); doc.setDrawColor(190); doc.setLineDash([2, 2], 0); doc.rect(x, 28, 131, 150); doc.setLineDash([], 0);
      doc.setFontSize(10); doc.setTextColor(gris[0], gris[1], gris[2]); doc.text(doc.splitTextToSize(t, 110), x + 65.5, 98, { align: 'center' }); doc.setTextColor(40); };
    cadre(D.photos.proche, M, 'Photo à coller ici : l\'endroit où sera posé l\'abri, pris depuis le terrain.');
    cadre(D.photos.loin, M + 138, 'Photo à coller ici : le terrain vu de la rue ou de loin, pour situer l\'abri dans le paysage.');
    doc.setFontSize(8); doc.text(pieces[6][0] + ' - environnement proche', M, 184); doc.text(pieces[7][0] + ' - paysage lointain', M + 138, 184);
    pied();
    return doc;
  }

  // ───────── boutons dans le panneau du configurateur ─────────
  function boutons() {
    var vis = document.querySelector('.cer-plan__vis'); if (!vis || vis.querySelector('.cer-plan__3d')) return !!vis;
    var d = document.createElement('div'); d.className = 'cer-plan__3d';
    d.innerHTML = '<style>.cer-plan__3d{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 2px}.cer-plan__3d button{flex:1 1 140px;border:0;border-radius:22px;padding:10px 14px;font:600 14px Jost,Futura,Arial,sans-serif;cursor:pointer;background:#515136;color:#fff}.cer-plan__3d button.sec{background:#f1efe7;color:#2b2b22}</style>' +
      '<button type="button" data-a="3d">Voir en 3D</button><button type="button" class="sec" data-a="mairie">Mon dossier mairie (PDF)</button>';
    vis.appendChild(d);
    d.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.a === '3d') window.CerVue3D && window.CerVue3D.ouvrir(); else ouvrir(); });
    return true;
  }
  var n = 0, t = setInterval(function () { if (boutons() || ++n > 60) clearInterval(t); }, 500);
  window.CerMairie = { ouvrir: ouvrir, projet: projet };
})();
