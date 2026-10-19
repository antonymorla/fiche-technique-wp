/**
 * Abri Cerisier — mesure des configurateurs (includes/stats.php).
 *
 * Note ce que font les visiteurs sur les configurateurs, le panier, la page devis et la commande : options changées,
 * étapes finies, 3D, réalité augmentée, clics, refus du panier, erreurs. Jamais ce qu'ils tapent dans un formulaire
 * (nom, mail, téléphone, adresse, code promo).
 * Un identifiant de visite tiré au hasard, gardé dans l'onglet (sessionStorage) ; un seul envoi groupé à la sortie de la page.
 * Sur les autres pages du site, le script retient seulement d'où vient la visite (moteur, publicité, lien interne), sans rien envoyer.
 * window.cerStat(nom, détail) : utilisé aussi par cer-configurateur.js, cer-mairie.js et cer-vue3d.js.
 */
(function () {
  'use strict';
  var C = window.CER_STATS;
  window.cerStat = function () {};
  if (!C || !C.url || !window.JSON) return;

  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { } return null; };
  var aCookie = function (n) { return new RegExp('(^|;\\s*)' + n + '=').test(document.cookie); };
  var court = function (s, n) { return String(s == null ? '' : s).replace(/[• \s]+/g, ' ').trim().slice(0, n || 60); };
  var chemin = function (u) { try { return court(new URL(u, location.href).pathname.replace(/\/+$/, '') || '/', 60); } catch (e) { return ''; } };
  var ici = location.hostname.replace(/^www\./, '');

  // ───────── visite : identifiant, source, page d'entrée (30 min sans activité = nouvelle visite) ─────────
  var maintenant = Date.now(), V = ss('cer_v'), vt = +ss('cer_vt') || 0;
  if (!V || !/^[a-z0-9]{12}$/.test(V) || maintenant - vt > 30 * 60000) {
    var abc = 'abcdefghijklmnopqrstuvwxyz0123456789', h = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(12)) : null;
    V = ''; for (var i = 0; i < 12; i++) V += abc[(h ? h[i] : Math.floor(Math.random() * 256)) % 36];
    ss('cer_v', V); ss('cer_s', ''); ss('cer_e', '');
  }
  ss('cer_vt', String(maintenant));
  var S = ss('cer_s');
  if (!S) {
    var q = location.search, ref = document.referrer, hote = ref ? (ref.split('/')[2] || '').replace(/^www\./, '') : '', m = q.match(/[?&]utm_source=([a-z0-9_-]+)/i);
    S = /[?&](gclid|gbraid|wbraid)=/.test(q) ? 'google-ads' : /[?&]fbclid=/.test(q) ? 'meta' : m ? ('utm-' + m[1].toLowerCase()).slice(0, 20) :
      !hote ? 'direct' : hote === ici ? 'interne' : /(^|\.)google\./.test(hote) ? 'google' : /(^|\.)bing\./.test(hote) ? 'bing' :
      /facebook|instagram|^fb\.|^l\.fb/.test(hote) ? 'meta' : /destombes/.test(hote) ? 'destombes' : /chatgpt|openai|perplexity|copilot|gemini|claude/.test(hote) ? 'ia' :
      /qwant|duckduckgo|yahoo|ecosia|brave/.test(hote) ? 'autre-moteur' : 'autre';
    ss('cer_s', S); ss('cer_e', chemin(location.href));
  }
  if (!C.page) return; // autre page du site : la source est retenue pour la suite de la visite, rien n'est envoyé

  // ───────── essais et équipe : notés à part ─────────
  if (/[?&]apercu=stats\b/.test(location.search)) document.cookie = 'cer_apercu_stats=1; max-age=2592000; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  if (C.mode === 'test' && !aCookie('cer_apercu_stats')) return;
  var X = C.equipe || aCookie('cer_essai_devis') ? 2 : aCookie('cer_apercu_stats') ? 1 : 0;

  var ua = navigator.userAgent, tactile = navigator.maxTouchPoints > 0;
  var A = /iPad|Tablet/i.test(ua) || (tactile && /Macintosh/.test(ua)) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'tablette' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'ordinateur';

  // ───────── file d'événements, envoi groupé ─────────
  var Q = [], NB = 0, CLES = /^(vue|3d_ouvrir|3d_pret|3d_echec|ar|ar_ok|ar_echec|panier_clic|panier_ok|panier_refus|champ_manquant|hors_bornes|clic_devis|devis_envoi|clic_commande|commande_ok|erreur_js|ressource_echec|ajax_erreur|abandon)$/;
  function stat(ev, d) {
    if (NB >= 400 || !/^[a-z0-9_]{2,24}$/.test(ev)) return;
    NB++; Q.push([Date.now(), ev, d || null]);
    if (Q.length >= 60) envoyer();
    if (CLES.test(ev)) {
      try { var o = { event: 'cer_' + ev, cer_page: C.page }; for (var k in d || {}) o['cer_' + k] = d[k]; (window.dataLayer = window.dataLayer || []).push(o); } catch (e) { }
      try { if (typeof window.clarity === 'function') window.clarity('event', 'cer_' + ev); } catch (e) { }
    }
  }
  function envoyer() {
    if (!Q.length) return;
    var corps = JSON.stringify({ v: V, p: C.page, a: A, s: S, x: X, e: Q.splice(0, Q.length) });
    try { if (navigator.sendBeacon && navigator.sendBeacon(C.url, new Blob([corps], { type: 'text/plain;charset=UTF-8' }))) return; } catch (e) { }
    try { fetch(C.url, { method: 'POST', body: corps, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }); } catch (e) { }
  }
  window.cerStat = stat;
  try { if (typeof window.clarity === 'function') { window.clarity('set', 'cer_page', C.page); window.clarity('set', 'cer_source', S); } } catch (e) { }

  // ───────── erreurs de la page ─────────
  var NE = 0;
  window.addEventListener('error', function (e) {
    if (NE >= 10) return;
    var t = e.target;
    if (t && t !== window && /^(SCRIPT|LINK|IMG)$/.test(t.tagName || '')) {
      var u = t.src || t.href || '';
      if (/abri-cerisier-fiche-technique|wapf|woocommerce|konte/.test(u)) { NE++; stat('ressource_echec', { u: u.split('?')[0].split('/').slice(-2).join('/') }); }
      return;
    }
    var f = String(e.filename || '');
    if (!e.message || /^Script error\.?$/.test(e.message) || /^(chrome|moz|safari|safari-web)-extension:/.test(f)) return; // extensions et scripts d'autres sites, sans détail
    NE++; stat('erreur_js', { m: court(e.message, 90), f: court(f.split('?')[0].split('/').pop(), 40), l: e.lineno || 0 });
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    if (NE >= 10) return;
    var r = e.reason, m = r && r.message ? r.message : String(r);
    if (!m || m === 'undefined' || /^(AbortError|NotAllowedError)/.test(m)) return;
    NE++; stat('erreur_js', { m: court('promesse : ' + m, 90) });
  });

  // ───────── temps passé, état à la sortie ─────────
  var CFG = /^(abri|garage|carport)$/.test(C.page), actif = 0, depuis = document.visibilityState === 'hidden' ? 0 : Date.now();
  var OPTIONS = 0, PRIX = 0, ETAPES = { faites: 0, N: 0, cur: '' }, AJOUTE = false, FINI = false;
  var DERNIER = '';
  function etat(fin) {
    if (depuis) { actif += Date.now() - depuis; depuis = fin ? 0 : Date.now(); }
    if (CFG) lireEtapes();
    var d = { s: Math.round(actif / 1000) };
    if (CFG) { d.o = OPTIONS; d.ef = ETAPES.faites; d.n = ETAPES.N; d.e = ETAPES.cur; if (PRIX) d.prix = PRIX; }
    var sig = JSON.stringify(d); if (sig !== DERNIER) { DERNIER = sig; stat('etat', d); }
    if (fin && CFG && !AJOUTE && !FINI) { FINI = true; stat('abandon', { e: ETAPES.cur || '(début)', ef: ETAPES.faites, s: d.s, prix: PRIX || 0 }); }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { etat(false); depuis = 0; envoyer(); } else depuis = Date.now();
  });
  window.addEventListener('pagehide', function () { etat(true); envoyer(); });

  // ───────── clics : boutons connus, puis tout autre lien ou bouton (libellé seulement) ─────────
  var NC = 0, T3D = 0;
  var libelle = function (el) { return court(el.getAttribute('aria-label') || el.textContent || el.value || el.title || '', 40); };
  function clic(e) {
    var el = e.target && e.target.closest ? e.target.closest('a, button, input[type=submit], input[type=button], [role=button], [role=tab]') : null;
    if (!el) return;
    var lib = libelle(el), href = el.getAttribute('href') || '';
    // configurateur
    if (el.matches('.single_add_to_cart_button')) return stat('panier_clic', { prix: PRIX || 0, ef: ETAPES.faites, n: ETAPES.N });
    if (el.closest('.cer-plan__3d')) { if (el.dataset.a === '3d') { T3D = Date.now(); return stat('3d_ouvrir'); } return stat('mairie'); }
    if (el.closest('.cer3d')) {
      if (el.matches('.x')) return stat('3d_ferme', { s: T3D ? Math.round((Date.now() - T3D) / 1000) : 0 });
      if (el.dataset.a === 'ar') return stat('ar');
      if (el.dataset.a === 'photo') return stat('montage_photo');
      if (el.dataset.a === 'valider') return stat('montage_valide');
      return stat('3d_vue', { v: el.dataset.v || lib });
    }
    if (el.closest('.cer-plan__eco')) return stat('moins_cher', { q: court(el.getAttribute('data-eco') || lib, 30) });
    if (el.closest('.cer-plan__tabs')) return stat('onglet', { v: el.getAttribute('data-v') || lib });
    if (el.closest('.cer-prog')) return stat('barre_etape', { e: lib });
    if (el.closest('.wapf-field-container, .wapf-wrapper')) return; // choix d'options : notés par « option »
    // panier, devis, commande
    if (/generer-un-devis/.test(href)) return stat('clic_devis', { z: C.page });
    if (el.matches('.checkout-button, #place_order') || (C.page === 'panier' && /\/commande\/?$|\/checkout\/?$/.test(href))) return stat(el.id === 'place_order' ? 'clic_payer' : 'clic_commande');
    if (el.matches('[name=apply_coupon]')) return stat('code_promo');
    if (el.matches('[name=update_cart]')) return stat('maj_panier');
    if (/empty[-_]cart/.test(href) || /^panier vide$|vider le panier/i.test(lib)) return stat('panier_vide');
    if (el.matches('a.remove, .product-remove a')) return stat('retirer');
    if (/partager/i.test(lib)) return stat('partager');
    if (NC >= 40) return;
    NC++;
    var zone = el.closest('.cer-plan') ? 'panneau' : el.closest('header, nav, .site-header, #masthead') ? 'menu' : el.closest('footer, .site-footer') ? 'pied' : 'page';
    stat('clic', { l: lib || court(href, 40), z: zone });
  }
  document.addEventListener('click', clic, true);
  // la photo de réalisation et le prix sont des zones cliquables sans bouton
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('.cer-plan__real')) stat('photo_reelle');
    else if (t.closest('.cer-plan__prix')) stat('detail_prix');
  }, true);

  // ───────── configurateur : options, étapes, blocages, prix, alertes ─────────
  function lireNombre(txt) { // « 8 730 € », « 8 730,29 € » : la virgule est décimale, les espaces séparent les milliers
    var s = String(txt || '').replace(/[^\d,.]/g, ''); if (!s) return 0;
    var i = Math.max(s.lastIndexOf(','), s.lastIndexOf('.')), dec = i >= 0 && s.length - i - 1 <= 2 ? s.slice(i + 1) : '';
    var ent = (dec || i < 0 ? s.slice(0, i < 0 ? s.length : i) : s).replace(/[,.]/g, '');
    return Math.round(parseFloat(ent + (dec ? '.' + dec : '')) || 0);
  }
  function question(c) { return court(((c && c.querySelector('.wapf-field-label')) || {}).textContent || '', 60); }
  function valeur(t) {
    if (t.type === 'radio' || t.type === 'checkbox') { var l = t.getAttribute('data-wapf-label') || ((t.closest('label') || {}).textContent) || t.value; return court((t.checked ? '' : 'retiré : ') + l, 60); }
    if (t.tagName === 'SELECT') return court((t.options[t.selectedIndex] || {}).text || t.value, 60);
    if (t.type === 'number') return court(t.value, 12);
    return ''; // champ texte : jamais lu
  }
  var NOTEES = {}, TOUCHE = [];
  function lireEtapes() {
    var bar = document.querySelector('.cer-prog'), et = bar && bar._et; if (!et || !et.length) { TOUCHE = []; return; }
    var cur = 0; while (cur < et.length - 1 && et[cur].fait) cur++;
    ETAPES = { faites: et.filter(function (x) { return x.fait; }).length, N: et.length, cur: court(et[cur].n, 30) };
    et.forEach(function (x, i) {
      if (x.fait && !NOTEES[x.n] && TOUCHE.some(function (s) { return x.secs.indexOf(s) >= 0; })) { NOTEES[x.n] = 1; stat('etape_finie', { e: court(x.n, 30), i: i + 1, n: et.length }); }
    });
    TOUCHE = [];
  }
  function brancherConfigurateur() {
    var form = document.querySelector('form.cart'); if (!form) return;
    var tE = 0;
    form.addEventListener('change', function (e) {
      var t = e.target; if (!e.isTrusted || !t || !t.name || /^cer_plan/.test(t.name)) return;
      var c = t.closest('.wapf-field-container'), q = question(c) || court(t.name, 40);
      if (/^aide au choix/i.test(q)) return stat('aide', { f: q.replace(/^aide au choix\s*[—–-]?\s*/i, '') });
      OPTIONS++; stat('option', { f: q, v: valeur(t) });
      var sec = c && c.closest('.wapf-section'); if (sec) TOUCHE.push(sec);
      clearTimeout(tE); tE = setTimeout(function () { lireEtapes(); }, 900);
    }, true);
    var tI = 0;
    form.addEventListener('invalid', function (e) { if (Date.now() - tI < 800) return; tI = Date.now(); stat('champ_manquant', { f: question(e.target.closest && e.target.closest('.wapf-field-container')) || court(e.target.name, 40) }); }, true);
    // panneau « Votre abri en direct » : construit après le chargement
    var essais = 0, t = setInterval(function () {
      var prix = document.querySelector('.cer-plan__prix strong'), warn = document.querySelector('.cer-plan__warn');
      if ((!prix || !warn) && ++essais < 60) return; clearInterval(t);
      var dits = {};
      if (prix) new MutationObserver(function () {
        var tx = court(prix.textContent, 90);
        if (/minimum|maximum/i.test(tx)) { if (!dits[tx]) { dits[tx] = 1; stat('hors_bornes', { m: tx }); } }
        else { var p = lireNombre(tx); if (p > 0) PRIX = p; }
      }).observe(prix, { childList: true, characterData: true, subtree: true });
      if (warn) new MutationObserver(function () {
        Array.prototype.forEach.call(warn.querySelectorAll('p'), function (p) { var tx = court(p.textContent, 90); if (tx && !dits[tx]) { dits[tx] = 1; stat('alerte', { m: tx }); } });
      }).observe(warn, { childList: true, subtree: true });
    }, 500);
  }

  // ───────── panier (WooCommerce / Konte) : ajout réussi ou refusé, avec le message ─────────
  function brancherAjax() {
    var $ = window.jQuery; if (!$ || !$.fn) return false;
    var action = function (s) { var u = (s && s.url) || '', m = u.match(/wc-ajax=([a-z_]+)/) || String((s && s.data) || '').match(/(?:^|&)action=([a-z0-9_]+)/); return m ? m[1] : chemin(u); };
    $(document).ajaxComplete(function (ev, xhr, s) {
      var a = action(s); if (!/add_to_cart/.test(a)) return;
      var j = xhr.responseJSON, ko = xhr.status !== 200 || (j && (j.error || j.success === false));
      if (!ko) { AJOUTE = true; return stat('panier_ok', { prix: PRIX || 0 }); }
      var msg = ''; try { msg = (j && (j.notices || (j.data && j.data.message) || j.message)) || xhr.responseText || ''; } catch (x) { }
      stat('panier_refus', { st: xhr.status, m: court(String(msg).replace(/<[^>]+>/g, ' '), 90) });
    });
    $(document).ajaxError(function (ev, xhr, s) { var a = action(s); if (/add_to_cart/.test(a) || xhr.status === 0) return; stat('ajax_erreur', { a: court(a, 30), st: xhr.status }); });
    return true;
  }
  function messagesWoo() { // ajout au panier sans AJAX : la page revient avec le message de WooCommerce
    var err = document.querySelector('.woocommerce-error, .woocommerce-notices-wrapper .is-error'), ok = document.querySelector('.woocommerce-message');
    if (CFG && err && err.offsetParent) stat('panier_refus', { st: 0, m: court(err.textContent, 90) });
    if (CFG && ok && /panier/i.test(ok.textContent)) { AJOUTE = true; stat('panier_ok', { prix: 0 }); }
  }

  // ───────── démarrage selon la page ─────────
  function demarrer() {
    var P = window.performance, nav = P && P.getEntriesByType ? P.getEntriesByType('navigation')[0] : null, r = document.referrer;
    var d = { e: ss('cer_e') || '', w: window.innerWidth || 0 };
    if (r && r.split('/')[2] && r.split('/')[2].replace(/^www\./, '') === ici) d.r = chemin(r);
    if (nav && nav.responseStart > 0) d.ttfb = Math.round(nav.responseStart);
    if (C.page === 'panier') {
      var lignes = document.querySelectorAll('.cart_item, .woocommerce-cart-form__cart-item'), types = {};
      Array.prototype.forEach.call(lignes, function (l) { var a = l.querySelector('a[href*="/produit/configurateur"]'); if (a) types[(a.getAttribute('href').match(/configurateur-?([a-z]*)/) || [])[1] || 'abri'] = 1; });
      d.nb = lignes.length; d.cfg = Object.keys(types).join('+');
    }
    if (C.page === 'merci') { var tt = document.querySelector('.woocommerce-order-overview__total .amount, .order-total .amount'); stat('commande_ok', { ttc: tt ? lireNombre(tt.textContent) : 0 }); }
    stat('vue', d);
    if (CFG) { brancherConfigurateur(); messagesWoo(); }
    // la visite suit le formulaire de devis et la commande : le serveur note le devis produit sous la même visite
    Array.prototype.forEach.call(document.querySelectorAll('form[action*="admin-post"], form.checkout, form.woocommerce-checkout'), function (f) {
      if (f.querySelector('input[name=cer_visite]')) return;
      var h = document.createElement('input'); h.type = 'hidden'; h.name = 'cer_visite'; h.value = V; f.appendChild(h);
      if (f.matches('[action*="admin-post"]')) {
        f.addEventListener('focusin', function () { if (!f._cerDebut) { f._cerDebut = true; stat('devis_debut'); } });
        f.addEventListener('submit', function () { stat('devis_envoi'); envoyer(); });
        // champ refusé par le formulaire (nom du champ et message, jamais la saisie)
        var tV = 0; f.addEventListener('invalid', function (e) { if (Date.now() - tV < 800) return; tV = Date.now(); stat('devis_invalide', { f: court(e.target.name, 30), m: court(e.target.validationMessage, 80) }); }, true);
      }
    });
    if (!brancherAjax()) window.addEventListener('load', brancherAjax);
    window.addEventListener('load', function () {
      setTimeout(function () { var n = P && P.getEntriesByType ? P.getEntriesByType('navigation')[0] : null; if (n && n.loadEventEnd) stat('perf', { dom: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }); }, 0);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
