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
  // « l'abri » / « le garage » / « le carport », et « de l'abri » / « du garage »… selon le configurateur
  function leA() { var t = E.ST.type; return t === 'garage' ? 'le garage' : t === 'carport' ? 'le carport' : 'l\'abri'; }
  function deA() { var t = E.ST.type; return t === 'garage' ? 'du garage' : t === 'carport' ? 'du carport' : 'de l\'abri'; }
  // recours à l'architecte (R.431-2) : surface de plancher (partie close) au-delà de 150 m²
  function archi(pr) { return pr.formalite === 'pc' && pr.sdp > 150; }
  var LIB_FORM = { aucune: 'Aucune autorisation (sous réserve du PLU)', dp: 'Déclaration préalable de travaux', pc: 'Permis de construire' };

  // ───────── fenêtre ─────────
  var CSS = '.cermr{position:fixed;inset:0;z-index:100001;background:rgba(30,30,24,.6);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Jost,Futura,Arial,sans-serif;color:#2b2b22}' +
    '.cermr .b{position:relative;width:min(980px,100%);max-height:100%;overflow:auto;background:#fff;border-radius:18px;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '.cermr h2{margin:0 0 4px;font-size:21px;padding-right:42px;white-space:normal;overflow-wrap:anywhere}.cermr .sous{color:#77755f;margin:0 0 14px;font-size:14px}' +
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
    '.cermr .zm{position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:6px}.cermr .zm button,.cermr .pas{width:40px!important;height:40px!important;padding:0!important;margin:0!important;border:0!important;border-radius:10px!important;background:rgba(255,255,255,.95)!important;color:#2b2b22!important;font:600 20px/40px Arial!important;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)}' +
    '.cermr .ici{position:absolute;bottom:10px;right:10px;border:0!important;border-radius:18px!important;padding:8px 12px!important;margin:0!important;background:rgba(255,255,255,.95)!important;color:#2b2b22!important;font:600 13px Jost,Arial,sans-serif!important;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)}' +
    '.cermr .rot{display:flex;align-items:center;gap:10px;margin:10px 0}.cermr .rot input{flex:1}.cermr .info{font-size:14px;line-height:1.5}.cermr .alerte{color:#9a3412}' +
    '.cermr .ph{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cermr .ph label{border:1px dashed #cfcab8;border-radius:12px;padding:12px;min-height:110px;align-content:start}.cermr .ph img{max-width:100%;max-height:140px;border-radius:8px;margin-top:6px}' +
    '@media (max-width:640px){.cermr form,.cermr .ph{grid-template-columns:1fr}.cermr{padding:0}.cermr .b{padding:18px 14px;border-radius:0;height:100%;max-height:none}}';
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
      '<label class="l2 sugg">Adresse du terrain où sera posé ' + leA() + '<input type="text" name="adresse" autocomplete="off" required value="' + esc(c.label) + '" placeholder="Numéro, rue, code postal, ville"><ul hidden></ul></label>' +
      '<label class="l2">Le terrain est-il en secteur protégé (abords d\'un monument historique, site classé ou patrimonial) ?<select name="secteur"><option value="nsp">Je ne sais pas</option><option value="non">Non</option><option value="oui">Oui</option></select></label>' +
      '<input type="text" name="site_web" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">' +
      '<label class="chk"><input type="checkbox" name="consentement"> <span>J\'accepte qu\'Abri Cerisier conserve ces informations pour me recontacter au sujet de mon projet.' + (C().confid ? ' <a href="' + esc(C().confid) + '" target="_blank" rel="noopener">Confidentialité</a>' : '') + '</span></label>' +
      '<p class="err"></p></form><div class="act"><button type="button" class="sec" data-a="annuler">Annuler</button><button type="button" data-a="suite">Continuer</button></div>');
    var f = b.querySelector('form'), ad = f.adresse, ul = b.querySelector('.sugg ul'), t = 0, choix = D.adresse, seqAdr = 0;
    if (c.secteur) f.secteur.value = c.secteur;
    ad.addEventListener('input', function () {
      choix = null; clearTimeout(t); var q = ad.value.trim(); if (q.length < 5) { ul.hidden = true; return; }
      t = setTimeout(function () {
        var n = ++seqAdr; // une réponse lente ne doit pas écraser les suggestions d'une saisie plus récente
        fetch('https://api-adresse.data.gouv.fr/search/?limit=5&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
          if (n !== seqAdr) return;
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
        var hd = { 'Content-Type': 'application/json' }; if (C().nonce) hd['X-WP-Nonce'] = C().nonce;
        return fetch(C().rest + 'dossier', { method: 'POST', headers: hd, body: JSON.stringify(corpsReq), credentials: 'same-origin' })
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
  function tuile(c, x, y, z, essai) { // l'IGN refuse parfois une tuile un instant (400) : un second essai, sinon case grise
    return new Promise(function (res) { var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () { res(im); }; im.onerror = function () { if (essai) res(null); else setTimeout(function () { tuile(c, x, y, z, 1).then(res); }, 700); };
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
        commune: f.properties.nom_com, insee: f.properties.code_insee, contenance: f.properties.contenance,
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
  // Carte déplaçable : un doigt (ou la souris) sur l'abri le déplace, ailleurs il fait glisser la carte ; deux doigts ou la molette zooment.
  // Repère « monde » : pixels Web Mercator du niveau 19 (photos IGN les plus fines, environ 19 cm) ; la vue a un centre et un facteur d'agrandissement.
  var Z_MASSE = 19, TUILES = {};
  function tuileCache(c, x, y, z, redessiner) {
    var k = c.l + '/' + z + '/' + x + '/' + y, t = TUILES[k];
    if (!t) { t = TUILES[k] = { ok: false }; tuile(c, x, y, z).then(function (im) { t.ok = true; t.im = im; redessiner(); }); }
    return t;
  }
  // la parcelle trouvée, ou à défaut : la toucher sur la carte (adresse sans numéro, lieu-dit, point posé sur la rue)
  function sousTitre(pa, leA) {
    return pa ? 'Parcelle ' + esc(pa.section + ' ' + pa.numero) + ' à ' + esc(pa.commune) + ' (' + fr(pa.contenance, 0) + ' m²). Faites glisser ' + leA + ' à sa place ; faites glisser la carte pour vous déplacer, zoomez avec deux doigts, la molette ou les boutons. Ce n\'est pas votre parcelle ? Touchez la vôtre sur la carte.'
      : 'Nous n\'avons pas trouvé la parcelle de cette adresse : touchez votre parcelle sur la carte pour la choisir (contours blancs), puis faites glisser ' + leA + ' à sa place.';
  }
  function etape2() {
    var pa = D.parcelle, c = D.client, nomA = E.ST.type === 'garage' ? 'garage' : E.ST.type === 'carport' ? 'carport' : 'abri', leA = nomA === 'abri' ? 'l\'abri' : 'le ' + nomA;
    var b = corps(1, 'Placez votre ' + nomA + ' sur votre terrain',
      sousTitre(pa, leA),
      '<div class="masse"><canvas></canvas><div class="zm"><button type="button" data-z="1" aria-label="Zoomer">+</button><button type="button" data-z="-1" aria-label="Dézoomer">−</button><button type="button" data-z="0" aria-label="Voir toute la parcelle">⤢</button></div>' +
      '<button type="button" class="ici">Amener ' + leA + ' au centre de la vue</button></div>' +
      '<div class="rot"><span>Orientation</span><button type="button" class="pas" data-r="-15">↺</button><input type="range" min="-180" max="180" step="1" value="' + ((D.place && D.place.rot) || 0) + '"><button type="button" class="pas" data-r="15">↻</button><span class="deg"></span></div>' +
      '<div class="info"></div><div class="act"><button type="button" class="sec" data-a="retour">Retour</button><button type="button" data-a="suite">Continuer</button></div>');
    var cv = b.querySelector('canvas'), W = 1200, H = 900; cv.width = W; cv.height = H; var g = cv.getContext('2d');
    var lat0 = pa ? centroide(pa.anneaux[0])[1] : c.lat, m19 = mpp(lat0, Z_MASSE), w19 = function (lon, lat) { return px(lon, lat, Z_MASSE); };
    var anneaux = pa ? pa.anneaux.map(function (a) { return a.map(function (q) { return w19(q[0], q[1]); }); }) : [];
    var autres = {}, infos = {}, cherche = [];
    var adr = w19(c.lon, c.lat);
    // vue initiale : toute la parcelle avec une marge (au moins 22 m de large)
    var V = { cx: adr[0], cy: adr[1], k: 1 };
    var cadrer = function () {
      var xs = [], ys = []; anneaux.forEach(function (a) { a.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });
      if (!xs.length) { xs = [adr[0] - 15 / m19, adr[0] + 15 / m19]; ys = [adr[1] - 11 / m19, adr[1] + 11 / m19]; }
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      V.cx = (x0 + x1) / 2; V.cy = (y0 + y1) / 2;
      V.k = Math.min(W * 0.82 / Math.max(x1 - x0, 22 / m19), H * 0.82 / Math.max(y1 - y0, 16 / m19));
      V.k = Math.max(0.02, Math.min(8, V.k));
    };
    cadrer();
    var pl = D.place && D.place.wx ? D.place : { wx: anneaux.length ? centroide(anneaux[0])[0] : adr[0], wy: anneaux.length ? centroide(anneaux[0])[1] : adr[1], rot: (D.place && D.place.rot) || 0 };
    D.place = pl;
    var S = function (q) { return [(q[0] - V.cx) * V.k + W / 2, (q[1] - V.cy) * V.k + H / 2]; };            // monde → écran
    var Wd = function (sx, sy) { return [(sx - W / 2) / V.k + V.cx, (sy - H / 2) / V.k + V.cy]; };          // écran → monde
    var pr = projet(), d = pr.d, rotInp = b.querySelector('.rot input'), deg = b.querySelector('.deg'), info = b.querySelector('.info');
    function rect(L, P, dx, dz) { // coins de l'abri (x vers la droite, z vers l'avant) en coordonnées monde
      var a = pl.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
      return [[-L / 2 + dx, -P / 2 + dz], [L / 2 + dx, -P / 2 + dz], [L / 2 + dx, P / 2 + dz], [-L / 2 + dx, P / 2 + dz]].map(function (q) {
        var x = q[0] / m19, y = q[1] / m19; return [pl.wx + x * cs - y * sn, pl.wy + x * sn + y * cs]; });
    }
    var toitW = function () { return rect(d.L + d.ovL + d.ovR, d.P + d.ovF + d.ovB, (d.ovR - d.ovL) / 2, (d.ovF - d.ovB) / 2); };
    var trace = function (pts, fill, stroke, dash, lw) { poly(g, pts.map(S), fill, stroke, dash, lw); };
    var prevu = 0, attente = 0;
    var redessiner = function () { if (!prevu) prevu = requestAnimationFrame(function () { prevu = 0; dessiner(); }); };
    function fondCarte() {
      g.fillStyle = '#d9d6cc'; g.fillRect(0, 0, W, H);
      var zt = Math.max(14, Math.min(Z_MASSE, Z_MASSE + Math.round(Math.log2(V.k)))), f = Math.pow(2, Z_MASSE - zt), ts = 256 * f; // taille d'une tuile en pixels monde
      var a = Wd(0, 0), z = Wd(W, H); attente = 0;
      for (var x = Math.floor(a[0] / ts); x <= Math.floor(z[0] / ts); x++) for (var y = Math.floor(a[1] / ts); y <= Math.floor(z[1] / ts); y++) {
        var t = tuileCache(COUCHES.ortho, x, y, zt, redessiner); if (!t.ok) { attente++; continue; } if (!t.im) continue;
        var p0 = S([x * ts, y * ts]), p1 = S([(x + 1) * ts, (y + 1) * ts]);
        g.drawImage(t.im, Math.floor(p0[0]), Math.floor(p0[1]), Math.ceil(p1[0]) - Math.floor(p0[0]), Math.ceil(p1[1]) - Math.floor(p0[1]));
      }
    }
    function dessiner() {
      g.imageSmoothingQuality = 'high'; fondCarte();
      Object.keys(autres).forEach(function (k) { autres[k].forEach(function (an) { trace(an, null, 'rgba(255,255,255,.8)', [], 1.6); }); });
      anneaux.forEach(function (an) { trace(an, null, '#ffd400', [], 4); });
      var murs = rect(d.L, d.P, 0, 0);
      trace(toitW(), 'rgba(255,255,255,.25)', '#ffffff', [10, 6], 2.5); trace(murs, 'rgba(196,184,134,.92)', '#3d3a2e', [], 3);
      var av = S(murs[2]), av2 = S(murs[3]); g.save(); g.fillStyle = '#c2410c'; g.beginPath(); g.arc((av[0] + av2[0]) / 2, (av[1] + av2[1]) / 2, 7, 0, 7); g.fill(); g.restore(); // porte : devant
      var dist = distances(murs, anneaux);
      dist.forEach(function (dd) { if (!dd) return; var A = S(dd.a), B = S(dd.b); g.save(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
        g.setLineDash([]); g.font = 'bold 22px Arial'; g.textAlign = 'center'; var tx = (A[0] + B[0]) / 2, ty = (A[1] + B[1]) / 2, s = fr(dd.d * m19, 2) + ' m';
        g.fillStyle = 'rgba(0,0,0,.65)'; var w = g.measureText(s).width + 12; g.fillRect(tx - w / 2, ty - 15, w, 26); g.fillStyle = '#fff'; g.fillText(s, tx, ty + 6); g.restore(); });
      nord(g, W - 50, 60); echelle(g, 30, H - 30, m19 / V.k);
      var mins = dist.filter(Boolean).map(function (x) { return x.d * m19; }), mn = mins.length ? Math.min.apply(null, mins) : null;
      deg.textContent = pl.rot + '°'; rotInp.value = pl.rot;
      info.innerHTML = mn == null ? 'Placez ' + leA + ' sur votre terrain.' : 'Distance la plus courte à une limite : <b>' + fr(mn) + ' m</b>.' +
        (mn > 0.15 && mn < 3 ? ' <span class="alerte">Si le PLU de votre commune ne dit rien, ' + leA + ' doit être en limite de propriété ou à 3 m au moins.</span>' : '');
      pl.dist = dist.map(function (x) { return x ? x.d * m19 : null; });
    }
    // parcelles voisines autour de la vue (rechargées quand on s'éloigne)
    var voisinage = function () {
      var ctr = Wd(W / 2, H / 2), r = Math.max(W, H) / V.k * m19 * 0.75;
      if (r > 400 || cherche.some(function (q) { return Math.hypot(q[0] - ctr[0], q[1] - ctr[1]) * m19 < q[2] * 0.5 && r <= q[2]; })) return;
      cherche.push([ctr[0], ctr[1], r]);
      var lon = ctr[0] / (256 * Math.pow(2, Z_MASSE)) * 360 - 180, n = Math.PI - 2 * Math.PI * ctr[1] / (256 * Math.pow(2, Z_MASSE)), lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      voisines(lon, lat, r).then(function (vs) { vs.forEach(function (v) { if ((!pa || v.idu !== pa.idu) && !autres[v.idu]) { autres[v.idu] = v.anneaux.map(function (a) { return a.map(function (q) { return w19(q[0], q[1]); }); }); infos[v.idu] = v; } }); redessiner(); });
    };
    var zoom = function (f, sx, sy) { var a = Wd(sx, sy); V.k = Math.max(0.02, Math.min(8, V.k * f)); var b2 = Wd(sx, sy); V.cx += a[0] - b2[0]; V.cy += a[1] - b2[1]; redessiner(); };
    // gestes
    var pts = {}, geste = null;
    var ecran = function (e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    var dedans = function (p, poly2) { var x = p[0], y = p[1], ok = false; for (var i = 0, j = poly2.length - 1; i < poly2.length; j = i++) { var a = poly2[i], c2 = poly2[j];
      if (((a[1] > y) !== (c2[1] > y)) && (x < (c2[0] - a[0]) * (y - a[1]) / (c2[1] - a[1]) + a[0])) ok = !ok; } return ok; };
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', function (e) {
      var p = ecran(e); pts[e.pointerId] = p; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      var ids = Object.keys(pts);
      if (ids.length === 2) { var A = pts[ids[0]], B = pts[ids[1]]; geste = { t: 'pince', d: Math.hypot(A[0] - B[0], A[1] - B[1]), k: V.k, m: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], c: [V.cx, V.cy] }; return; }
      var w = Wd(p[0], p[1]), centreA = S([pl.wx, pl.wy]);
      // marge de prise autour de l'abri en pixels d'écran (le dessin fait 1200 px de large : 28 px n'en faisaient que 8 sur un téléphone)
      var tol = (e.pointerType === 'touch' ? 36 : 20) * W / (cv.getBoundingClientRect().width || W);
      var surAbri = dedans(p, toitW().map(S)) || Math.hypot(p[0] - centreA[0], p[1] - centreA[1]) < tol;
      geste = surAbri ? { t: 'abri', o: [w[0] - pl.wx, w[1] - pl.wy] } : { t: 'carte', p: p, c: [V.cx, V.cy], seul: ids.length === 1 };
      cv.style.cursor = surAbri ? 'move' : 'grabbing';
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId] || !geste) return; var p = ecran(e); pts[e.pointerId] = p;
      if (geste.t === 'abri') { var w = Wd(p[0], p[1]); pl.wx = w[0] - geste.o[0]; pl.wy = w[1] - geste.o[1]; redessiner(); }
      else if (geste.t === 'carte') { V.cx = geste.c[0] - (p[0] - geste.p[0]) / V.k; V.cy = geste.c[1] - (p[1] - geste.p[1]) / V.k; redessiner(); }
      else if (geste.t === 'pince') { var ids = Object.keys(pts), A = pts[ids[0]], B = pts[ids[1]]; if (!B) return;
        var dd = Math.hypot(A[0] - B[0], A[1] - B[1]), m0 = geste.m, mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        V.k = Math.max(0.02, Math.min(8, geste.k * dd / Math.max(10, geste.d)));
        var a = [(m0[0] - W / 2) / geste.k + geste.c[0], (m0[1] - H / 2) / geste.k + geste.c[1]]; // point du monde sous les doigts au départ
        V.cx = a[0] - (mid[0] - W / 2) / V.k; V.cy = a[1] - (mid[1] - H / 2) / V.k; redessiner(); }
    });
    var choisir = function (p) { // une parcelle voisine touchée devient la parcelle du projet
      var idu = Object.keys(autres).filter(function (k) { return autres[k].some(function (an) { return dedans(p, an.map(S)); }); })[0], v = idu && infos[idu];
      if (!v) return;
      if (pa) { autres[pa.idu] = anneaux; infos[pa.idu] = pa; }
      pa = D.parcelle = { commune: v.commune, insee: v.insee, section: v.section, numero: v.numero, contenance: v.contenance, idu: v.idu, anneaux: v.anneaux };
      anneaux = autres[idu]; delete autres[idu];
      if (!dedans([pl.wx, pl.wy], anneaux[0])) { var c0 = centroide(anneaux[0]); pl.wx = c0[0]; pl.wy = c0[1]; } // l'abri suit sur la parcelle choisie
      b.querySelector('.sous').innerHTML = sousTitre(pa, leA); // texte déjà échappé (esc)
      redessiner();
    };
    var lacher = function (e) {
      var q = pts[e.pointerId], tol = 10 * W / (cv.getBoundingClientRect().width || W);
      if (q && geste && geste.t === 'carte' && geste.seul && e.type === 'pointerup' && Math.hypot(q[0] - geste.p[0], q[1] - geste.p[1]) < tol) choisir(q);
      delete pts[e.pointerId]; if (!Object.keys(pts).length) { if (geste && geste.t !== 'abri') voisinage(); geste = null; cv.style.cursor = ''; } else if (geste && geste.t === 'pince') geste = null; };
    cv.addEventListener('pointerup', lacher); cv.addEventListener('pointercancel', lacher);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var p = ecran(e); zoom(e.deltaY > 0 ? 1 / 1.2 : 1.2, p[0], p[1]); clearTimeout(cv._vt); cv._vt = setTimeout(voisinage, 400); }, { passive: false });
    b.querySelectorAll('.zm button').forEach(function (bt) { bt.onclick = function () { var z = +bt.dataset.z; if (z) zoom(z > 0 ? 1.5 : 1 / 1.5, W / 2, H / 2); else { cadrer(); redessiner(); } setTimeout(voisinage, 300); }; });
    b.querySelector('.ici').onclick = function () { var w = Wd(W / 2, H / 2); pl.wx = w[0]; pl.wy = w[1]; redessiner(); };
    rotInp.addEventListener('input', function () { pl.rot = +rotInp.value; redessiner(); });
    b.querySelectorAll('.rot .pas').forEach(function (bt) { bt.onclick = function () { pl.rot = ((pl.rot + +bt.dataset.r + 540) % 360) - 180; redessiner(); }; });
    info.textContent = 'Chargement de la photo aérienne…';
    dessiner(); voisinage();
    D.masse = { cv: cv, dessiner: dessiner, enAttente: function () { return attente; } };
    b.querySelector('[data-a=retour]').onclick = etape1;
    b.querySelector('[data-a=suite]').onclick = function () {
      var n = 0, go = function () { dessiner(); if (attente && n++ < 30) return setTimeout(go, 150); D.images.masse = cv.toDataURL('image/jpeg', 0.9); etape3(); };
      go();
    };
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
      '<div class="ph"><label>Photo proche : l\'endroit où sera posé ' + leA() + '<input type="file" accept="image/*,.heic,.heif" data-k="proche">' + (D.photos.proche ? '<img src="' + D.photos.proche + '">' : '') + '</label>' +
      '<label>Photo lointaine : le terrain dans son environnement, depuis la rue<input type="file" accept="image/*,.heic,.heif" data-k="loin">' + (D.photos.loin ? '<img src="' + D.photos.loin + '">' : '') + '</label></div>' +
      '<p class="info" style="margin-top:12px">' + (sans3d() ? 'Le document d\'insertion est à compléter par un photomontage du carport sur une photo du terrain : un cadre vous attend dans le dossier, un conseiller Abri Cerisier peut vous aider.' : 'Pour le document d\'insertion, nous utilisons ' + (window.CerVue3D && window.CerVue3D.montage ? 'votre montage photo réalisé dans la vue 3D.' : 'une vue 3D de votre projet. Pour un montage sur une photo de votre jardin : « Voir en 3D » puis « Sur une photo de mon jardin ».')) + '</p>' +
      '<div class="act"><button type="button" class="sec" data-a="retour">Retour</button><button type="button" data-a="suite">Créer mon dossier PDF</button></div>');
    b.querySelectorAll('input[type=file]').forEach(function (inp) {
      inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; if (!f) return; reduire(f, 1800).then(function (url) { D.photos[inp.dataset.k] = url; etape3(); }); });
    });
    b.querySelector('[data-a=retour]').onclick = etape2;
    b.querySelector('[data-a=suite]').onclick = etape4;
  }
  // Photos HEIC (iPhone) : lues telles quelles si le navigateur sait le faire (Safari récent), sinon converties en JPEG
  // dans le navigateur ; la bibliothèque (1,3 Mo, cdnjs) n'est chargée qu'à ce moment-là, rien ne passe par le serveur
  window.CerHeic = function (f) {
    if (!f || !(/\.hei[cf]$/i.test(f.name || '') || /hei[cf]/i.test(f.type || ''))) return Promise.resolve(f);
    var lisible = new Promise(function (res) { var im = new Image(), u = URL.createObjectURL(f); im.onload = function () { URL.revokeObjectURL(u); res(true); }; im.onerror = function () { URL.revokeObjectURL(u); res(false); }; im.src = u; });
    var go = function () { return window.heic2any({ blob: f, toType: 'image/jpeg', quality: 0.9 }).then(function (b) { return Array.isArray(b) ? b[0] : b; }); };
    return lisible.then(function (ok) {
      if (ok) return f;
      if (window.heic2any) return go();
      return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
        s.integrity = 'sha512-VjmsArkf8Vv2yyvbXCyVxp+R3n4N2WyS1GEQ+YQxa7Hu0tx836WpY4nW9/T1W5JBmvuIsxkVH/DlHgp7NEMjDw=='; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }).then(go);
    });
  };
  function reduire(f, max) { return window.CerHeic(f).then(function (f2) { return reduire0(f2, max); }); }
  function reduire0(f, max) { return new Promise(function (res) { var im = new Image(); im.onload = function () { var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.85)); }; im.src = URL.createObjectURL(f); }); }

  // ───────── 4. PDF ─────────
  function logo() { // logo Abri Cerisier blanc (fichier officiel « 6• Logo »), posé sur les bandeaux verts du PDF
    var u = (C().tex || '') + 'logo-abri-cerisier-blanc.png';
    return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) { return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.readAsDataURL(b); }); }).catch(function () { return null; });
  }
  function jspdf() { return window.jspdf ? Promise.resolve(window.jspdf) : new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.integrity = 'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA=='; s.crossOrigin = 'anonymous'; s.onload = function () { res(window.jspdf); }; s.onerror = rej; document.head.appendChild(s); }); }
  function vueMoteur(side, w, h) { // dessin du configurateur, cotes comprises → image PNG
    var ST = E.ST, d = E.calcDims(), sv = { scale: ST.scale, picto: ST.picto, mur: ST.murSeul }, svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('width', w * 2.5); svg.setAttribute('height', h * 2.5);
    try { ST.picto = false; ST.murSeul = false;
      if (side === 'plan') { ST.scale = null; E.drawPlan(svg, d, w, h); } else { ST.scale = E.commonScale(d, w, h); E.drawElev(svg, d, side, w, h); }
    } finally { ST.scale = sv.scale; ST.picto = sv.picto; ST.murSeul = sv.mur; }
    return new Promise(function (res) { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = w * 2.5; c.height = h * 2.5; var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.86)); };
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
      .then(function () { if (sans3d()) { I.insertion = null; return; } etat('Vue 3D du projet…'); fermerTemp(); return charger3D().then(function (V) { return V.capture(); }).then(function (u) { I.insertion = u; }, function () { I.insertion = null; }); })
      .then(function () { rouvrir(); etat('Mise en page du PDF…'); return logo().then(function (l) { I.logo = l; return jspdf(); }); })
      .then(function (J) { var doc = construirePdf(J, pr, I); var nom = 'dossier-mairie-' + (D.client.nom || 'abri').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf';
        // téléphone : un téléchargement lancé en fin de calcul est bloqué (iPhone surtout) ; le client touche lui-même le lien,
        // et peut l'enregistrer dans Fichiers ou l'envoyer par mail avec le partage du téléphone
        var blob = doc.output('blob'), url = URL.createObjectURL(blob), tel = window.matchMedia && matchMedia('(pointer:coarse)').matches;
        var fic = null; try { fic = new File([blob], nom, { type: 'application/pdf' }); } catch (e) {}
        var partage = !!(tel && fic && navigator.canShare && navigator.canShare({ files: [fic] }));
        if (!tel) doc.save(nom);
        corps(3, 'Votre dossier est prêt', tel ? 'Touchez le bouton pour ouvrir votre dossier PDF.' : 'Le PDF « ' + esc(nom) + ' » est téléchargé.', '<div class="act" style="justify-content:flex-start"><a class="btn" data-a="pdf" href="' + url + '" download="' + esc(nom) + '" target="_blank" rel="noopener" style="text-decoration:none">' + (tel ? 'Ouvrir mon dossier (PDF)' : 'Télécharger à nouveau') + '</a>' + (partage ? '<button type="button" data-a="partager">Enregistrer ou envoyer</button>' : '') + '</div><p class="info">Il reste à remplir et signer le formulaire officiel (' + esc(LIB_FORM[pr.formalite].toLowerCase()) + ') sur service-public.fr, puis à le déposer en mairie avec ce dossier.' + (archi(pr) ? ' Au-delà de 150 m² de surface de plancher, le permis doit être établi par un architecte.' : '') + ' Un conseiller Abri Cerisier peut vous accompagner.</p><div class="act"><button type="button" data-a="fin">Fermer</button></div>');
        if (partage) ov.querySelector('[data-a=partager]').onclick = function () { navigator.share({ files: [fic], title: 'Dossier mairie' }).catch(function () {}); };
        ov.querySelector('[data-a=fin]').onclick = function () { fermer(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); };
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

  var LOGO_R = 0;
  function construirePdf(J, pr, I) {
    if (I.logo) { var lp = new J.jsPDF().getImageProperties(I.logo); LOGO_R = lp.height / lp.width; }
    var doc = new J.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true }), Wp = 297, Hp = 210, M = 14, c = D.client, pa = D.parcelle, d = pr.d;
    var vert = [81, 81, 54], gris = [119, 117, 95];
    // pièces du formulaire cerfa 13703 (déclaration préalable, maison individuelle et annexes) ou 13406 (permis de construire) : DP1 à DP8 / PCMI1 à PCMI8
    var pre = pr.formalite === 'pc' ? 'PCMI' : 'DP', cerfa = pr.formalite === 'pc' ? 'cerfa n° 13406' : 'cerfa n° 13703';
    var pieces = [[pre + '1', 'Plan de situation du terrain'], [pre + '2', 'Plan de masse coté'], [pre + '3', 'Plan en coupe'], [pre + '4', 'Notice descriptive'],
      [pre + '5', 'Plans des façades et de la toiture'], [pre + '6', 'Document graphique d\'insertion'], [pre + '7', 'Photographie de l\'environnement proche'], [pre + '8', 'Photographie du paysage lointain']];
    var P_ = function (i) { return pieces[i][0] + ' - ' + pieces[i][1]; };
    var page = 1;
    var entete = function (titre, sous) { doc.setFillColor(81, 81, 54); doc.rect(0, 0, Wp, 18, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(titre, M, 9.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(225, 224, 210); doc.text((c.prenom + ' ' + c.nom + '  -  ' + c.label).slice(0, 120), M, 14.5);
      if (I.logo) doc.addImage(I.logo, 'PNG', Wp - M - 46, 9 - 46 * LOGO_R / 2, 46, 46 * LOGO_R, 'logo'); doc.setTextColor(40);
      if (sous) { doc.setFontSize(10); doc.setTextColor(gris[0], gris[1], gris[2]); doc.text(sous, M, 23.8); doc.setTextColor(40); } };
    var pied = function (x0) { doc.setFontSize(7.5); doc.setTextColor(gris[0], gris[1], gris[2]); x0 = x0 || M;
      var t = doc.splitTextToSize('Dossier préparé avec le configurateur Abri Cerisier le ' + new Date().toLocaleDateString('fr-FR') + '. Le plan local d\'urbanisme (PLU) de votre commune s\'applique : vérifiez les règles avant dépôt.', Wp - M - x0 - 18);
      doc.text(t, x0, Hp - 6 - 3.2 * (t.length - 1));
      doc.text('Page ' + page, Wp - M, Hp - 6, { align: 'right' }); doc.setTextColor(40); };
    var image = function (url, x, y, w, h, fmt) { if (!url) { doc.setDrawColor(200); doc.rect(x, y, w, h); doc.setFontSize(10); doc.text('Image indisponible', x + w / 2, y + h / 2, { align: 'center' }); return; }
      var p = doc.getImageProperties(url), k = Math.min(w / p.width, h / p.height), ww = p.width * k, hh = p.height * k; doc.addImage(url, fmt || (url.indexOf('image/png') > 0 ? 'PNG' : 'JPEG'), x + (w - ww) / 2, y + (h - hh) / 2, ww, hh, 'i' + url.length + url.slice(-40).replace(/[^a-z0-9]/gi, '')); }; // même image = une seule copie dans le PDF
    var suivante = function (x0) { pied(x0); doc.addPage(); page++; };

    // 1. page de garde
    doc.setFillColor(81, 81, 54); doc.rect(0, 0, 100, Hp, 'F');
    if (I.logo) doc.addImage(I.logo, 'PNG', M, 14, 72, 72 * LOGO_R, 'logo');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text(doc.splitTextToSize(LIB_FORM[pr.formalite], 80), M, 48);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(pr.nom + ' en bois', 80), M, 80);
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
    ligne('Formalité', LIB_FORM[pr.formalite] + (pr.formalite === 'aucune' ? ' : jusqu\'à 5 m², hors secteur protégé.' : pr.formalite === 'dp' ? ' : de 5 à 20 m² (ou jusqu\'à 20 m² en secteur protégé).' : ' : plus de 20 m².' + (archi(pr) ? ' Au-delà de 150 m² de surface de plancher, le permis doit être établi par un architecte (article R.431-2 du code de l\'urbanisme).' : '')));
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
    image(I.face, M, 26, 132, 82); image(I.fond, M + 137, 26, 132, 82); image(I.gauche, M, 110, 132, 82); image(I.droite, M + 137, 110, 132, 82);
    doc.setFontSize(8); doc.text('Façade avant', M, 108); doc.text('Façade arrière', M + 137, 108); doc.text('Côté gauche', M, 193); doc.text('Côté droit', M + 137, 193); suivante();
    entete(P_(4) + ' (vue de dessus)', 'Vue de dessus : murs, débords de toiture, extensions et menuiseries.');
    image(I.plan, M, 26, Wp - 2 * M, 165); suivante();
    // 6. insertion
    if (!I.insertion && sans3d()) { // carport : pas de vue 3D, cadre pour le photomontage
      entete(P_(5), 'Photomontage du projet sur une photo du terrain, à compléter.');
      doc.setDrawColor(190); doc.setLineDash([2, 2], 0); doc.rect(M, 26, Wp - 2 * M, 165); doc.setLineDash([], 0); doc.setFontSize(11); doc.setTextColor(120);
      doc.text('Photomontage à coller ici : le carport dessiné sur une photo du terrain.', Wp / 2, 108, { align: 'center' }); doc.setTextColor(0); suivante();
    } else {
      entete(P_(5), window.CerVue3D && window.CerVue3D.montage ? 'Montage du projet sur une photo du terrain.' : 'Vue du projet. Pour un montage sur photo : configurateur, « Voir en 3D », « Sur une photo de mon jardin ».');
      image(I.insertion, M, 26, Wp - 2 * M, 165); suivante();
    }
    // 7. photos (cadre à compléter si le client ne les a pas ajoutées)
    entete(P_(6) + '  /  ' + pieces[7][0], 'Photo proche : l\'emplacement ' + deA() + '. Photo lointaine : le terrain dans le paysage, depuis la rue.');
    var cadre = function (url, x, t) { if (url) return image(url, x, 28, 131, 150); doc.setDrawColor(190); doc.setLineDash([2, 2], 0); doc.rect(x, 28, 131, 150); doc.setLineDash([], 0);
      doc.setFontSize(10); doc.setTextColor(gris[0], gris[1], gris[2]); doc.text(doc.splitTextToSize(t, 110), x + 65.5, 98, { align: 'center' }); doc.setTextColor(40); };
    cadre(D.photos.proche, M, 'Photo à coller ici : l\'endroit où sera posé ' + leA() + ', pris depuis le terrain.');
    cadre(D.photos.loin, M + 138, 'Photo à coller ici : le terrain vu de la rue ou de loin, pour situer ' + leA() + ' dans le paysage.');
    doc.setFontSize(8); doc.text(pieces[6][0] + ' - environnement proche', M, 184); doc.text(pieces[7][0] + ' - paysage lointain', M + 138, 184);
    pied();
    return doc;
  }

  // ───────── boutons dans le panneau du configurateur ─────────
  function sans3d() { return ((window.CER_CFG || {}).kind || E.ST.type) === 'carport'; } // type déclaré par la page : connu avant que le moteur ne lise le formulaire
  function boutons() {
    var vis = document.querySelector('.cer-plan__vis'); if (!vis || vis.querySelector('.cer-plan__3d')) return !!vis;
    if (sans3d() && !C().mairie) return true; // carport vu par un visiteur : aucun bouton
    var d = document.createElement('div'); d.className = 'cer-plan__3d';
    d.innerHTML = '<style>.cer-plan__3d{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 2px}.cer-plan__3d button{flex:1 1 140px;border:0;border-radius:22px;padding:10px 14px;font:600 14px Jost,Futura,Arial,sans-serif;cursor:pointer;background:#515136;color:#fff}.cer-plan__3d button.sec{background:#f1efe7;color:#2b2b22}</style>' +
      // carport : pas encore de modèle 3D (poteaux, bandeaux, charpente) : seul le dossier mairie est proposé
      (sans3d() ? '' : '<button type="button" data-a="3d">Voir en 3D</button>') + (C().mairie ? '<button type="button" class="sec" data-a="mairie">Mon dossier mairie (PDF)</button>' : ''); // dossier : l'équipe connectée (réglage)
    vis.appendChild(d);
    d.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.a === '3d') voir3D(); else ouvrir(); });
    return true;
  }
  // vue 3D téléchargée au premier clic seulement (window.CER_3D.vue3d) ; l'abri qui se construit s'affiche pendant ce temps
  var charge3d = null;
  function charger3D() {
    if (window.CerVue3D) return Promise.resolve(window.CerVue3D);
    if (charge3d) return charge3d;
    return (charge3d = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = C().vue3d; sc.async = true;
      sc.onload = function () { window.CerVue3D ? res(window.CerVue3D) : rej(new Error('vue 3D')); }; sc.onerror = function () { charge3d = null; rej(new Error('vue 3D')); }; document.head.appendChild(sc); }));
  }
  var ATTENTE = '<svg viewBox="0 0 260 190" style="width:min(260px,60vw)" aria-hidden="true"><line x1="10" y1="151" x2="250" y2="151" stroke="#6f8a48" stroke-width="4" stroke-linecap="round"/>' +
    [0, 1, 2, 3, 4, 5, 6].map(function (i) { return '<rect class="l" x="50" y="' + (150 - (i + 1) * 13) + '" width="160" height="12" rx="1.5" fill="#bdb07e" stroke="#857a50" style="animation-delay:' + (i * 0.16) + 's"/>'; }).join('') +
    '<polygon class="l" points="36,61 130,12 224,61 210,61 130,26 50,61" fill="#43474b" style="animation-delay:1.2s"/></svg><span>Construction de votre abri en 3D…</span>';
  function voir3D() {
    var w = document.createElement('div'); w.className = 'cer3d-attente';
    w.innerHTML = '<style>.cer3d-attente{position:fixed;inset:0;z-index:100000;background:rgba(207,219,228,.97);display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;font:500 16px Jost,Futura,Arial,sans-serif;color:#2b2b22}' +
      '@keyframes cer3dA{0%,8%{opacity:0;transform:translateY(-14px)}18%,86%{opacity:1;transform:none}100%{opacity:0}}.cer3d-attente .l{opacity:0;animation:cer3dA 3.2s ease-out infinite;transform-box:fill-box}</style>' + ATTENTE;
    document.body.appendChild(w);
    charger3D().then(function (V) { var p = V.ouvrir(); w.remove(); return p; })
      .catch(function () { w.querySelector('span').textContent = 'La vue 3D n\u2019a pas pu se charger. Réessayez dans un instant.'; setTimeout(function () { w.remove(); }, 2500); });
  }
  var n = 0, t = setInterval(function () { if (boutons() || ++n > 60) clearInterval(t); }, 500);
  window.CerMairie = { ouvrir: ouvrir, projet: projet };
})();
