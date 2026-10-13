/*!
 * Visuel en direct des configurateurs Abri Cerisier (abri, garage, carport).
 * Lit les choix du configurateur du site (WAPF), dessine l'abri avec le moteur du générateur de plan (CerPlan),
 * affiche la fiche technique avec les cotes calculées comme le site, et joint les vues au panier pour le devis.
 * Réglages fournis par le plugin : window.CER_CFG = { kind: 'abri' | 'garage' | 'carport', version }.
 */
(function () {
  'use strict';
  var CFG = window.CER_CFG || {};
  if (!window.CerPlan || !CFG.kind) return;
  var E = window.CerPlan, ST = E.ST;

  // ── Champs des configurateurs (identifiants WAPF relevés sur les pages du site) ──
  var MAPS = {
    abri: {
      lar: { sm: 'abd0e3e', sel: '3d0c5fd', num: 'ea2e8b7' }, pro: { sm: '2b198c4', sel: 'f5301a4', num: 'ceb97a0' },
      toit: ['ab05175'], orient: ['65ad968', 'e14f4f0'], pente: ['d345f3d', '316d1b5'], sys: ['3ec5448'], ep: ['5b29cdd'],
      bard: ['cfad244', '6c48ecc', '1e0e5a2', 'fa4ccc4'], couv: ['feabbf9', '3fa0fbb', '42f2a4f'], gout: ['ee8bcb3'],
      reh: { q: '4cfda5e', n: 'af57fcc' }, plan: ['d85fc32'], pign: ['5ed03dc'], profu: ['3869f3f'], soub: ['fd182b9'],
      pp: ['a0a0a85'], isom: ['c55fac3'], isot: ['67eccc2'],
      ext: { q: '2a21884', m: { fond: '332ab45', gauche: 'fb3dce9', droite: '4dbeea3', face: '417e37c' },
        rq: { face: '8e6cf2b', fond: 'f0ec21a', gauche: 'fadfe0f', droite: '8aa219a' },
        rs: { face: '50e0fac', fond: '0a1e6b8', gauche: '3ffcfa1', droite: '95db202' }, type: ['2fdae02', 'fb4fb2c'] },
      pext: { q: 'd7e07ef' },
      men: { type: 'ae1b55e', specific: ['ea71efa', 'fc21333', 'e583b9f', '5955c88', 'da2562f', '91dfcf4', '84ddbca', 'c0df40d', '41dbb3d', '1fd6c5b', 'bbc4dca', '23affe1'],
        opt: ['d86e030', '8fe32da'], garage: null }
    },
    garage: {
      lar: { sm: '54eee0e', sel: 'ae1de82', num: '3ef605e' }, pro: { sm: '24e5c52', sel: 'a1d354f', num: 'ab80f95' },
      toit: ['e0656df'], orient: ['0813bd0', '8eca213'], pente: ['deffd3c', 'ebef2f6'], sys: ['eceeadb'], ep: ['dbbbb52'],
      bard: ['4a06bf9', '2a3b113', '5bfec13', '5a0e9f2'], couv: ['d1ac115', 'a72f0f0', '32350ae'], gout: ['fa9b171'],
      reh: { q: '1d54ffa', n: '02eefe8' }, plan: ['629bcda'], pign: ['f1d4e6f'], profu: ['d71daf3'], soub: ['478fa40'],
      pp: ['b5e1b38'], isom: ['cd454cc'], isot: ['d4230fa'],
      ext: { q: 'c13ccea', m: { fond: 'fd1f800', gauche: 'dac3caf', droite: '74ec3e5', face: 'ae31213' },
        rq: { face: 'f40cca6', fond: '7c29fac', gauche: '1e23fe8', droite: '5cee052' },
        rs: { face: 'c4b422c', fond: '51bea7d', gauche: 'a7403ef', droite: 'eace337' }, type: ['a326aeb', 'acfbece'] },
      pext: { q: 'a3fda0a' },
      men: { type: '4fa82ea', specific: ['b4f2bdc', '0aa34c0', 'a154c3e', '0dd9ae4', '7f72ea9', '5ae35e5', 'e4ea58b', 'baa8b15', '6bbd4d4', 'd504110', 'dc7ffad', 'adb330a'],
        opt: ['abd0fbd', '2c9edd0'], garage: '9dfacda' }
    },
    carport: {
      lar: { sm: '6a0b809', sel: '05254a4', num: '1196d7b' }, pro: { sm: '3d89f71', sel: 'baec4ce', num: '8be1c4f' },
      ados: ['1ce6f02'], toit: ['a14d4e4'], bandeau: ['afcef0a'], orient: ['02a009e', 'ee27fe6'], pente: ['eef52ce', '1604e95'],
      pot: ['25251c8'], espL: ['29ccded'], espP: ['2199535'], reh: { q: 'd292e23', n: ['bff5905', '1049eb0', 'e99494f'] },
      clos: { q: '71bc1a9', sides: '15b2a59', type: ['9ccc9e2', 'a3d30ce'] }, couv: ['2dc93ac', 'b12bc55'], gout: ['b9ea023'], supp: ['75b3e36']
    }
  };
  var M = MAPS[CFG.kind];
  // Vraies photos de pose (fiches produits + médiathèque), décrites image par image le 09/10/2026 avec les valeurs du configurateur ;
  // images IA (et fichiers « ChatGPT-Image… »), rendus, montages, vues intérieures, studios et ouvrages repeints écartés. Détail : photothèque-réalisations/ (Dropbox).
  // p = photo, u = fiche, c = légende, k = ouvrage, t = toit, s = système, b = bardage, bd = sens, te = teinte, cv = couverture,
  // po = portes [largeur, style, vitrage], fe = fenêtres [style, matière], pg = porte de garage, ex = extension, g = gouttière,
  // cp = carport {pot, ados, bandeau, fermeture}, L × P = dimensions, ta = taille, q = qualité, v = vue partielle, i / gr = même ouvrage
  var REAL = [{"p":"2026/04/IMG_9526-660x495.jpeg","c":"Abri QUADRO en ossature, bardage vertical grisé, porte intégrée au bardage, petite fenêtre fixe, abri bûches ouvert à droite","k":"abri","t":"QUADRO","i":2,"u":"abri-bois-moderne-quadro-350-x-3-m-abri-buches-destockage","s":"ossature","b":"autre","bd":"v","te":"gris","cv":"invisible","po":[["simple","bardee","pleine"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":3.5,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2025/05/IMG_4077-660x396.jpg","c":"Carport toit plat 2 places, poteaux aluminium et bandeau métallique gris anthracite","k":"carport","t":"TOIT_PLAT","i":5,"u":"carport-6x6m-poteaux-bois-exo-17x17cm-bandeaux-clin-28mm","te":"gris","cv":"invisible","cp":{"pot":"alu","ados":false,"bandeau":"bac_bandeau","fermeture":"aucune"},"L":6.0,"P":6.0,"ta":"tres_grand","q":"moyenne"},{"p":"2025/05/IMG_20230627_124700-002-660x880.jpg","c":"Carport toit plat 1 place, bandeau trois lames horizontales autoclave, six poteaux bois sur plots, gouttière et descente noire","k":"carport","t":"TOIT_PLAT","i":11,"u":"carport-3x6m-poteaux-bois-14x14cm-bandeaux-clin-28mm","te":"vert","cv":"invisible","g":true,"cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"L":3.0,"P":6.0,"ta":"grand","q":"bonne"},{"p":"2025/05/IMG_5604-660x495.jpg","c":"Carport toit plat 2 places, bandeau trois lames horizontales autoclave, six poteaux bois avec jambes de force, gouttière et descente noire","k":"carport","t":"TOIT_PLAT","i":13,"u":"carport-6x6m-poteaux-bois-19x19cm-bandeaux-clin-28mm","te":"vert","cv":"bac","g":true,"cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"L":6.0,"P":6.0,"ta":"tres_grand","q":"bonne"},{"p":"2025/05/IMG_6786-660x495.jpg","c":"Carport toit plat 2 places, bandeau trois lames horizontales autoclave, poteaux bois avec jambes de force, sur dalle béton","k":"carport","t":"TOIT_PLAT","i":15,"u":"carport-6x6m-poteaux-bois-14x14cm-bandeaux-clin-28mm","te":"vert","cv":"bac","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"L":6.0,"P":6.0,"ta":"tres_grand","q":"bonne","gr":15},{"p":"2025/04/IMG_6787-660x495.jpg","c":"Carport toit plat 2 places, bandeau trois lames horizontales autoclave, poteaux bois avec jambes de force, sur dalle béton","k":"carport","t":"TOIT_PLAT","i":16,"u":"carport-6x6m-poteaux-bois-12x12cm-bandeaux-clin-28mm","te":"vert","cv":"bac","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"L":6.0,"P":6.0,"ta":"tres_grand","q":"bonne","gr":15},{"p":"2025/04/20210901_193214-002-660x495.jpg","c":"Abri QUADRO en ossature, bardage vertical autoclave vert ajouré, porte double et porte simple vitrées, plancher d'accès devant la porte double","k":"abri","t":"QUADRO","i":17,"u":"abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-5x4m-couverture-epdm-colle-sur-osb","s":"ossature","b":"ps_vert_ajoure","bd":"v","te":"vert","cv":"invisible","po":[["double","contemporaine","vitree"],["simple","contemporaine","vitree"]],"g":false,"L":5.0,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2025/04/Resized_20230629_101306.jpg","c":"Abri QUADRO en ossature, bardage vertical ajouré teinte miel, porte vitrée trois carreaux","k":"abri","t":"QUADRO","i":19,"u":"abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-3x3m-couverture-epdm-colle-sur-osb","s":"ossature","b":"ps_vert_ajoure","bd":"v","te":"miel","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"moyenne"},{"p":"2025/04/IMG_20230517_122318-002-660x880.jpg","c":"Abri QUADRO en ossature, bardage vertical gris, grande porte vitrée alu gris anthracite, terrasse bois devant","k":"abri","t":"QUADRO","i":20,"u":"abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-3x2m-couverture-epdm-colle-sur-osb","s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","alu","vitree"]],"g":false,"L":3.0,"P":2.0,"ta":"moyen","q":"bonne","gr":20},{"p":"2025/10/a5d6ee40-ad60-4df0-9c87-e5ae7fd038b1-e1759393115287-660x543.png","c":"Abri QUADRO en ossature, bardage vertical gris ajouré, porte vitrée quatre carreaux, châssis vitré étroit sur le côté","k":"abri","t":"QUADRO","i":22,"u":"abri-de-jardin-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-25x2m-couverture-epdm-colle-sur-osb","s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["verticale","bois"]],"g":false,"L":2.5,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2025/04/Abri-de-jardin-MONTFORT-250-m-x-4-m-660x495.jpg","c":"Abri 1 pan en ossature, bardage horizontal autoclave vert, porte double pleine, fenêtre à petits bois avec volets, terrasse couverte à droite, shingle brun et gouttière","k":"abri","t":"1PAN","i":23,"u":"abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-brun-21x130-3x4m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":3.0,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2025/04/IMG_2051-660x495.jpg","c":"Abri 1 pan en ossature, bardage horizontal autoclave vert, porte double pleine, deux fenêtres à petits bois, petit auvent avec plancher à gauche, shingle brun","k":"abri","t":"1PAN","i":24,"u":"abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-25x5m-couverture-shingle-noir","s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":2.5,"P":5.0,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_1846-660x495.jpeg","c":"Abri 1 pan en ossature, bardage horizontal autoclave brun, porte simple pleine, fenêtre avec volets, shingle brun","k":"abri","t":"1PAN","i":25,"u":"abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-2x25m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"shingle_b","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.0,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/Abri_jardin_BRUYERES_autoclave_15x35auvent_1C-rotated-e1738251834225-660x992.jpg","c":"Abri 1 pan adossé à la maison, bardage horizontal autoclave vert, porte simple pleine en façade étroite, fenêtre à volets et jardinière sur le côté","k":"abri","t":"1PAN","i":26,"u":"abri-de-jardin-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-15x3m-couverture-shingle-brun","s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":1.5,"P":3.0,"ta":"petit","q":"moyenne"},{"p":"2025/04/IMG_7580-660x495.jpeg","c":"Abri 2 pans en ossature, bardage horizontal autoclave brun, porte double pleine, fenêtre, terrasse couverte avec plancher à droite","k":"abri","t":"2PANS","i":27,"u":"abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-brun-21x130-4x25m-couverture-shingle-brun","s":"ossature","b":"sr_brun","bd":"h","te":"brun","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":4.0,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2025/04/Abri_jardin_NANDY_autoclave_350x350_1-660x513.jpg","c":"Abri 2 pans en ossature, bardage horizontal autoclave vert, porte double pleine, fenêtre à petits bois avec volets et jardinière","k":"abri","t":"2PANS","i":28,"u":"abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x3m-couverture-shingle-noir","s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.5,"P":3.0,"ta":"grand","q":"moyenne"},{"p":"2024/06/20231005_120413-660x703.jpg","c":"Abri 2 pans en ossature, bardage horizontal Ayous, porte double pleine, fenêtre avec volet coulissant, gouttières et descentes noires","k":"abri","t":"2PANS","i":29,"u":"abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-ayous-21x125-3x3m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","s":"ossature","b":"ayous125","bd":"h","te":"ayous","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":true,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_9452-660x803.jpeg","c":"Abri 2 pans en ossature, bardage horizontal autoclave, porte simple pleine, fenêtre avec volets et jardinière","k":"abri","t":"2PANS","i":30,"u":"abri-de-jardin-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-25x2m-couverture-shingle-brun","s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.0,"ta":"moyen","q":"bonne","gr":30},{"p":"2025/01/Abri-de-jardin-moderne-ROQUEBRUNE-2.jpg","c":"Abri toit plat en ossature, bardage horizontal autoclave brun, porte double pleine, deux fenêtres à petits bois avec volets et jardinières, rampe d'accès","k":"abri","t":"TOIT_PLAT","i":31,"u":"abri-de-jardin-toit-plat-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-brun-21x130-4x3m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"invisible","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"g":false,"L":4.0,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2025/01/Abri-de-jardin-MONTFORT-Toit-Plat-BARBIZON-660x474.jpg","c":"Abri toit plat en ossature, bardage horizontal autoclave vert, porte pleine à barres en Z ouverte, fenêtre à petits bois avec volets","k":"abri","t":"TOIT_PLAT","i":32,"u":"abri-de-jardin-toit-plat-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-25x2m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"L":2.5,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2025/04/IMG_7754-660x495.jpg","c":"Garage QUADRO en ossature, bardage vertical ajouré, porte basculante habillée du même bardage","k":"garage","t":"QUADRO","i":33,"u":"garage-bois-quadro-en-ossature-bois-bardage-bardage-srn-20x70-gris-35x6m-couverture-epdm-colle-sur-osb","s":"ossature","b":"srn_gris","bd":"v","te":"brun","cv":"invisible","pg":"gris_ajoure","g":false,"L":3.5,"P":6.0,"ta":"tres_grand","q":"bonne"},{"p":"2025/04/PHOTO-2024-07-12-20-11-57-660x762.jpg","c":"Garage 1 pan en ossature, bardage horizontal autoclave vert, porte basculante métallique gris anthracite","k":"garage","t":"1PAN","i":34,"u":"garage-bois-1-pan-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x6m-couverture-shingle-vert","s":"ossature","b":"sr_vert","bd":"h","te":"vert","pg":"metal","g":false,"L":3.5,"P":6.0,"ta":"tres_grand","q":"bonne"},{"p":"2025/04/IMG_1871-660x495.jpeg","c":"Garage 2 pans en ossature, bardage horizontal autoclave vert, porte basculante métallique gris anthracite, porte de service pleine, fenêtre à volets, shingle vert","k":"garage","t":"2PANS","i":35,"u":"garage-bois-2-pans-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x55m-couverture-shingle-brun","s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_v","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"pg":"metal","g":false,"L":3.5,"P":5.5,"ta":"grand","q":"bonne","gr":35},{"p":"2025/04/IMG_3422-660x495.jpg","c":"Garage toit plat en ossature, bardage horizontal autoclave vert, porte basculante bois à lames verticales","k":"garage","t":"TOIT_PLAT","i":36,"u":"garage-bois-toit-plat-en-ossature-bois-bardage-bardage-sapin-rouge-autoclave-vert-21x130-35x6m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","fe":[["?","bois"]],"pg":"bois_vert_v","g":false,"L":3.5,"P":6.0,"ta":"tres_grand","q":"moyenne"},{"p":"2025/04/DSCF1404-660x495.jpg","c":"Double garage toit plat, bandeau trois lames horizontales, deux portes basculantes bois autoclave horizontales, descentes de gouttière noires","k":"garage","t":"TOIT_PLAT","i":37,"u":"garage-bois-toit-plat-en-madrier-ep-45mm-6x6m-couverture-bac-acier-63-100mm-gris-ral-7016","te":"vert","cv":"invisible","pg":"bois_vert_h","g":true,"L":6.0,"P":6.0,"ta":"tres_grand","q":"moyenne","v":"partielle"},{"p":"2025/04/IMG_1013-660x445.jpg","c":"Garage 2 pans en madriers à angles croisés, porte basculante ouverte, auvent latéral à gauche sur poteau","k":"garage","t":"2PANS","i":38,"u":"garage-bois-2-pans-en-madrier-ep-45mm-45x6m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","s":"madrier","b":"madrier","bd":"h","te":"vert","ex":{"f":"ouverte","pl":false},"g":false,"L":4.5,"P":6.0,"ta":"tres_grand","q":"bonne","gr":38},{"p":"2025/04/IMGP0526-660x495.jpg","c":"Garage toit plat en madriers à angles croisés, porte basculante bois à lames verticales, gouttière sous le bandeau","k":"garage","t":"TOIT_PLAT","i":39,"u":"garage-bois-toit-plat-en-madrier-ep-28mm-35x5m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"madrier","b":"madrier","bd":"h","te":"miel","cv":"invisible","pg":"bois_vert_v","g":true,"L":3.5,"P":5.0,"ta":"grand","q":"moyenne"},{"p":"2025/04/IMG_1014-660x483.jpg","c":"Garage 2 pans en madriers, porte basculante bois à lames verticales, long auvent ouvert sur poteaux à gauche, shingle noir","k":"garage","t":"2PANS","i":40,"u":"garage-bois-2-pans-en-madrier-ep-28mm-3x5m-couverture-shingle-brun","s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"shingle_n","pg":"bois_vert_v","ex":{"f":"ouverte","pl":false},"g":false,"L":3.0,"P":5.0,"ta":"grand","q":"bonne","gr":38},{"p":"2024/06/4bb2acbe-3c71-4c1f-9631-3d25aab776a0-660x589.jpg","c":"Abri toit plat en madriers, porte semi-vitrée trois carreaux, fenêtre hublot","k":"abri","t":"TOIT_PLAT","i":42,"u":"abri-de-jardin-toit-plat-en-madrier-ep-28mm-333x283m-couverture-bac-acier-63-100mm-gris-ral-7016-3","s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"L":3.33,"P":2.83,"ta":"moyen","q":"bonne","gr":42},{"p":"2025/09/Resized_20230629_171126-660x577.jpg","c":"Abri toit plat en madriers, porte double vitrée quatre carreaux par vantail","k":"abri","t":"TOIT_PLAT","i":43,"u":"abri-de-jardin-toit-plat-en-madrier-ep-28mm-333x283m-couverture-bac-acier-63-100mm-gris-ral-7016-2","s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","vitree"]],"g":false,"L":3.33,"P":2.83,"ta":"moyen","q":"bonne"},{"p":"2024/06/4bb2acbe-3c71-4c1f-9631-3d25aab776a0-660x589.jpg","c":"Abri toit plat en madriers, porte semi-vitrée trois carreaux, fenêtre hublot","k":"abri","t":"TOIT_PLAT","i":44,"u":"abri-de-jardin-toit-plat-en-madrier-ep-28mm-283x233m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"L":2.83,"P":2.33,"ta":"moyen","q":"bonne","gr":42},{"p":"2025/01/IMG_1615-660x691.jpg","c":"Abri toit plat en madriers, porte double pleine à panneaux de lames horizontales","k":"abri","t":"TOIT_PLAT","i":46,"u":"abri-de-jardin-toit-plat-en-madrier-ep-28mm-283x283m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","pleine"]],"g":false,"L":2.83,"P":2.83,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_5501-660x495.jpg","c":"Abri toit plat en madriers, porte semi-vitrée, fenêtre fixe, auvent ouvert sur deux poteaux à gauche","k":"abri","t":"TOIT_PLAT","i":47,"u":"abri-de-jardin-toit-plat-en-madrier-ep-28mm-283x183m-couverture-bac-acier-63-100mm-gris-ral-7016","s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":2.83,"P":1.83,"ta":"moyen","q":"bonne","gr":47},{"p":"2024/06/IMG_6948-660x604.jpeg","c":"Abri 1 pan en madriers, rives festonnées, porte semi-vitrée à petits bois, fenêtre à petits bois avec volets","k":"abri","t":"1PAN","i":48,"u":"abri-de-jardin-1-pan-en-madrier-ep-28mm-15x3m-couverture-shingle-vert","s":"madrier","b":"madrier","bd":"h","te":"vert","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":1.5,"P":3.0,"ta":"petit","q":"bonne"},{"p":"2024/06/IMG_7686-660x880.jpg","c":"Abri 2 pans en madriers, rives festonnées, porte double pleine cintrée, fenêtre à petits bois avec volets, plancher bois sur le côté droit","k":"abri","t":"2PANS","i":49,"u":"abri-de-jardin-2-pans-en-madrier-ep-28mm-35x3m-couverture-shingle-brun","s":"madrier","b":"madrier","bd":"h","te":"miel","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.5,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2025/01/Abri-de-jardin-ISOLA-660x371.jpg","c":"Abri 2 pans en madriers, rives festonnées, porte simple pleine, fenêtre à petits bois avec volets et jardinière, terrasse couverte avec plancher à gauche","k":"abri","t":"2PANS","i":50,"u":"abri-de-jardin-2-pans-en-madrier-ep-28mm-3x25m-couverture-panneaux-tuiles-acier-63-100mm-gris-ral-7016","s":"madrier","b":"madrier","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":3.0,"P":2.5,"ta":"moyen","q":"moyenne"},{"p":"2025/01/IMG_3136-660x582.jpg","c":"Abri 2 pans en madriers, porte semi-vitrée à petits bois, fenêtre à croisillons avec volets et jardinière","k":"abri","t":"2PANS","i":51,"u":"abri-de-jardin-2-pans-en-madrier-ep-28mm-25x2m-couverture-shingle-noir","s":"madrier","b":"madrier","bd":"h","te":"miel","cv":"shingle_n","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2025/01/DSC01300-660x495.jpg","c":"Abri 2 pans en madriers, porte double pleine, fenêtre à croisillons avec volets","k":"abri","t":"2PANS","i":52,"u":"abri-de-jardin-2-pans-en-madrier-ep-28mm-4x3m-couverture-shingle-vert","s":"madrier","b":"madrier","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":4.0,"P":3.0,"ta":"grand","q":"bonne","gr":52},{"p":"2024/06/20230404_145244-660x880.jpg","c":"Abri 2 pans en madriers, porte simple pleine, fenêtre à croisillons avec volets","k":"abri","t":"2PANS","i":53,"u":"abri-de-jardin-2-pans-en-madrier-ep-28mm-2x2m-couverture-shingle-brun","s":"madrier","b":"madrier","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"L":2.0,"P":2.0,"ta":"petit","q":"bonne"},{"p":"2024/02/Abri-Contemporain-L-1024x768-1-768x576.jpeg","c":"Abri toit plat en ossature, bardage autoclave horizontal, porte vitrée contemporaine, hublot, auvent ouvert à gauche","k":"abri","t":"TOIT_PLAT","i":54,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["hublot","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"ta":"grand","q":"bonne"},{"p":"2024/02/IMG_5602-1024x768-1-768x576.jpg","c":"Carport double toit plat en pin autoclave, bandeau en lames horizontales, poteaux bois avec jambes de force","k":"carport","t":"TOIT_PLAT","i":55,"te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"ta":"tres_grand","q":"bonne"},{"p":"2024/02/IMG_5603-1024x768-1-768x576.jpg","c":"Carport double toit plat en pin autoclave, bandeau en lames horizontales, poteaux bois avec jambes de force","k":"carport","t":"TOIT_PLAT","i":56,"te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"ta":"tres_grand","q":"bonne"},{"p":"2024/02/IMG_5616-1024x768-1-768x576.jpg","c":"Garage triple toit plat en bardage autoclave vert horizontal, trois portes basculantes métal anthracite, local attenant avec porte bois et deux petites fenêtres","k":"garage","t":"TOIT_PLAT","i":57,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"fe":[["contemporaine","bois"],["contemporaine","bois"]],"pg":"metal","ta":"tres_grand","q":"bonne"},{"p":"2024/02/IMG_5617-1024x768-1-768x576.jpg","c":"Garage triple toit plat en bardage autoclave vert horizontal, trois portes basculantes métal anthracite","k":"garage","t":"TOIT_PLAT","i":58,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","pg":"metal","ta":"tres_grand","q":"bonne"},{"p":"2024/02/IMG_5619-1024x768-1-768x576.jpg","c":"Garage triple toit plat en bardage autoclave vert, portes basculantes métal ouvertes, local attenant avec porte bois","k":"garage","t":"TOIT_PLAT","i":59,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"fe":[["contemporaine","bois"],["contemporaine","bois"]],"pg":"metal","ta":"tres_grand","q":"bonne"},{"p":"2024/02/IMG-1560-1024x669-1-768x502.jpg","c":"Abri QUADRO en bardage Douglas noir vertical, porte vitrée à cadre noir, deux fenêtres verticales, auvent sur poteau à droite","k":"abri","t":"QUADRO","i":60,"s":"ossature","b":"douglas_noir","bd":"v","te":"noir","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["verticale","?"],["verticale","?"]],"ex":{"f":"ouverte","pl":false},"g":false,"ta":"grand","q":"bonne"},{"p":"2024/02/55e4b1c6-c831-4a87-a4b1-f74e04b6b1f4-768x576.jpg","c":"Garage QUADRO en bardage vertical sombre, porte basculante habillée du même bardage, éclairage en façade","k":"garage","t":"QUADRO","i":61,"s":"ossature","b":"douglas_noir","bd":"v","te":"noir","cv":"invisible","pg":"noir_ajoure","g":false,"ta":"grand","q":"moyenne"},{"p":"2024/02/Resized_20230629_101256-1024x662-1-768x497.jpg","c":"Abri QUADRO en bardage vertical ajouré gris, porte vitrée contemporaine, fenêtre verticale","k":"abri","t":"QUADRO","i":62,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["verticale","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/02/IMG_20230517_122318-002-768x1024-1.jpg","c":"Abri QUADRO en bardage vertical gris, porte vitrée à cadre anthracite, terrasse bois en façade","k":"abri","t":"QUADRO","i":63,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"ta":"moyen","q":"bonne","gr":20},{"p":"2024/02/Resized_20220510_180206-768x576.jpg","c":"Abri QUADRO en Ayous vertical aléatoire, bandeau composite anthracite, auvent sur poteau alu avec plancher bois","k":"abri","t":"QUADRO","i":64,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","po":[["simple","bardee","pleine"]],"ex":{"f":"pleine","pl":true},"g":false,"ta":"grand","q":"bonne","v":"partielle"},{"p":"2024/02/IMG_7842-2-copie-1024x768-1-768x576.png","c":"Abri QUADRO en Ayous vertical aléatoire avec auvent sur poteau alu, plancher bois et porte intégrée au bardage","k":"abri","t":"QUADRO","i":65,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","po":[["simple","bardee","pleine"]],"ex":{"f":"pleine","pl":true},"g":false,"ta":"tres_grand","q":"bonne"},{"p":"2024/02/Abri_jardin_SAVIGNY_autoclave_500x400auventbucher_1-1024x543-1-768x407.jpg","c":"Chalet 2 pans en bardage autoclave horizontal, toit prolongé en terrasse couverte avec plancher et garde-corps, fenêtres à volets et jardinières, gouttière","k":"abri","t":"2PANS","i":66,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"shingle_b","po":[["simple","z","pleine"]],"fe":[["classique","bois"],["classique","bois"],["classique","bois"]],"ex":{"f":"ajouree","pl":true},"g":true,"ta":"tres_grand","q":"bonne"},{"p":"2024/02/IMG_6228-768x588.jpg","c":"Abri 2 pans en bardage autoclave vert horizontal, porte double pleine, fenêtre à croisillons avec volets et jardinière","k":"abri","t":"2PANS","i":67,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/02/IMG_8575-1024x768-1-768x576.jpg","c":"Abri 1 pan en bardage autoclave horizontal, shingle brun, porte double pleine, fenêtre à croisillons avec volets, extension ouverte avec plancher à droite","k":"abri","t":"1PAN","i":68,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"ta":"grand","q":"bonne"},{"p":"2024/02/IMG_4209-768x576.jpg","c":"Abri 2 pans en bardage autoclave horizontal, shingle brun, porte double pleine, petite fenêtre avec volets","k":"abri","t":"2PANS","i":69,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":69},{"p":"2024/03/IMG_5501-768x576.png","c":"Abri toit plat en bardage autoclave vert horizontal, porte semi-vitrée contemporaine, fenêtre fixe, auvent ouvert à gauche","k":"abri","t":"TOIT_PLAT","i":70,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"ta":"moyen","q":"bonne","gr":47},{"p":"2024/03/IMG_6723-768x576.jpg","c":"Abri QUADRO en bardage vertical gris, auvent fermé sur deux côtés à gauche, porte ouverte sur le local","k":"abri","t":"QUADRO","i":71,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","bardee","pleine"]],"ex":{"f":"pleine","pl":false},"g":false,"ta":"grand","q":"bonne"},{"p":"2024/05/Garage-Carport-ANJOU-1.jpg","c":"Carport 2 pans en pin autoclave accolé à un local fermé en bardage vert horizontal avec porte double pleine","k":"carport","t":"2PANS","i":72,"b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"g":false,"cp":{"pot":"bois","ados":false,"fermeture":"un_cote"},"ta":"tres_grand","q":"bonne"},{"p":"2024/06/IMG_1611-768x576.jpg","c":"Abri toit plat en bardage autoclave vert horizontal, porte double semi-vitrée contemporaine, fenêtre fixe","k":"abri","t":"TOIT_PLAT","i":73,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/2019-09-20-09.49.19-768x576.jpg","c":"Abri QUADRO en bardage vertical gris, porte vitrée contemporaine à cadre bois","k":"abri","t":"QUADRO","i":74,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_2186-768x576.jpg","c":"Abri toit plat en bardage autoclave vert horizontal, porte double vitrée contemporaine, hublot sur le côté","k":"abri","t":"TOIT_PLAT","i":75,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","vitree"]],"fe":[["hublot","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":75},{"p":"2024/06/IMG_2187-768x576.jpg","c":"Abri toit plat en bardage autoclave vert horizontal, porte double vitrée contemporaine","k":"abri","t":"TOIT_PLAT","i":76,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","vitree"]],"g":false,"ta":"moyen","q":"bonne","gr":75},{"p":"2024/06/IMG_2203-768x576.jpg","c":"Abri toit plat en bardage autoclave vert horizontal, porte semi-vitrée contemporaine, fenêtre fixe","k":"abri","t":"TOIT_PLAT","i":77,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_6945-768x576.jpeg","c":"Abri 1 pan en bardage autoclave horizontal, porte semi-vitrée à petits bois, fenêtre à croisillons avec volets, rive décorative","k":"abri","t":"1PAN","i":78,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":78},{"p":"2024/06/IMG_6949-768x576.jpeg","c":"Abri 1 pan en bardage autoclave horizontal, shingle brun, porte semi-vitrée à petits bois, fenêtre à croisillons avec volets","k":"abri","t":"1PAN","i":79,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"shingle_b","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":78},{"p":"2024/06/IMG_6950-768x576.jpeg","c":"Abri toit plat en bardage autoclave vert horizontal, porte semi-vitrée contemporaine, hublot en façade","k":"abri","t":"TOIT_PLAT","i":80,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":80},{"p":"2024/06/IMG_6950-1-768x655.jpeg","c":"Abri toit plat en bardage autoclave vert horizontal, porte semi-vitrée contemporaine, hublot en façade","k":"abri","t":"TOIT_PLAT","i":81,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_28011-1-768x694.jpg","c":"Abri QUADRO en bardage Douglas noir vertical ajouré, porte vitrée à cadre noir","k":"abri","t":"QUADRO","i":82,"s":"ossature","b":"douglas_noir","bd":"v","te":"noir","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_2688-768x576.jpg","c":"Abri 1 pan en bardage autoclave vert horizontal, porte semi-vitrée à petits bois, fenêtre à croisillons avec volets et jardinière, auvent ouvert à droite, gouttière","k":"abri","t":"1PAN","i":83,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":false},"g":true,"ta":"grand","q":"bonne","gr":83},{"p":"2024/06/IMG_2689-768x576.jpg","c":"Abri 1 pan en bardage autoclave vert horizontal, porte semi-vitrée à petits bois, fenêtre à croisillons avec volets et jardinière, auvent ouvert à droite, gouttière","k":"abri","t":"1PAN","i":84,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":false},"g":true,"ta":"grand","q":"bonne","gr":83},{"p":"2024/06/IMG_2693-768x576.jpg","c":"Abri 2 pans en bardage autoclave vert horizontal, panneaux tuiles acier gris, porte double pleine, deux fenêtres à volets, gouttière","k":"abri","t":"2PANS","i":85,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"tuile_g","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"g":true,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_2797-768x576.jpg","c":"Chalet 2 pans en bardage autoclave horizontal, porte-fenêtre double avec volets sur le pignon, fenêtres à volets, gouttière","k":"abri","t":"2PANS","i":86,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["double","porte_fenetre","vitree"]],"fe":[["classique","bois"],["classique","bois"]],"g":true,"ta":"tres_grand","q":"bonne","gr":86},{"p":"2024/06/IMG_2798-768x576.jpg","c":"Chalet 2 pans en bardage autoclave horizontal, porte-fenêtre double avec volets sur le pignon, fenêtres à volets, gouttière","k":"abri","t":"2PANS","i":87,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["double","porte_fenetre","vitree"]],"fe":[["classique","bois"],["classique","bois"]],"g":true,"ta":"tres_grand","q":"bonne","gr":86},{"p":"2024/06/IMG_2799-768x576.jpg","c":"Chalet 2 pans en bardage autoclave horizontal, façade longue avec deux fenêtres à volets, shingle noir et gouttière","k":"abri","t":"2PANS","i":88,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","fe":[["classique","bois"],["classique","bois"]],"g":true,"ta":"tres_grand","q":"bonne","gr":86},{"p":"2024/06/IMG_2800-768x576.jpg","c":"Chalet 2 pans en bardage autoclave horizontal, façade longue avec deux fenêtres doubles à volets, shingle noir et gouttière","k":"abri","t":"2PANS","i":89,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","fe":[["classique","bois"],["classique","bois"]],"g":true,"ta":"tres_grand","q":"bonne","gr":86},{"p":"2024/06/IMG_2854-768x576.jpg","c":"Abri toit plat en bardage autoclave vert horizontal, deux portes doubles semi-vitrées contemporaines, hublot, plancher bois le long de la façade","k":"abri","t":"TOIT_PLAT","i":90,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"],["double","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"ta":"grand","q":"bonne","gr":90},{"p":"2024/06/IMG_2855-768x576.jpg","c":"Abri toit plat en bardage autoclave vert horizontal, deux portes doubles semi-vitrées contemporaines, hublot, plancher bois le long de la façade","k":"abri","t":"TOIT_PLAT","i":91,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"],["double","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"ta":"grand","q":"bonne","gr":90},{"p":"2024/06/IMG_6664-768x576.jpg","c":"Abri 2 pans en bardage autoclave vertical, porte-fenêtre, fenêtres bois, toit prolongé en auvent sur poteaux au-dessus d'une terrasse bois","k":"abri","t":"2PANS","i":92,"s":"ossature","b":"sr_vert_v","bd":"v","te":"gris","po":[["double","porte_fenetre","vitree"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/IMG_2862-768x576.jpg","c":"Petit abri toit plat en bardage autoclave vert horizontal, porte semi-vitrée contemporaine, fenêtre fixe verticale","k":"abri","t":"TOIT_PLAT","i":93,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["verticale","bois"]],"g":false,"ta":"petit","q":"bonne","gr":90},{"p":"2024/06/IMG_2875-768x576.jpg","c":"Abri 2 pans en bardage autoclave vert horizontal, porte double pleine avec rampe bois, fenêtre à croisillons avec volets et jardinière","k":"abri","t":"2PANS","i":94,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":94},{"p":"2024/06/IMG_2876-768x576.jpg","c":"Abri 2 pans en bardage autoclave vert horizontal, porte double pleine avec rampe bois, fenêtre à croisillons avec volets et jardinière","k":"abri","t":"2PANS","i":95,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne","gr":94},{"p":"2024/06/IMG_4833-768x582.jpg","c":"Abri 2 pans en bardage bois horizontal de teinte rosée, porte double pleine, fenêtre à croisillons avec volets et jardinière, extension ouverte avec plancher à droite","k":"abri","t":"2PANS","i":96,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","cv":"tuile_r","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"grand","q":"bonne","gr":96},{"p":"2024/06/IMG_4834-768x637.jpg","c":"Abri 2 pans en bardage bois horizontal de teinte rosée, tuiles rouges, porte double pleine, fenêtre avec volets et jardinière, extension ouverte à droite","k":"abri","t":"2PANS","i":97,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","cv":"tuile_r","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"grand","q":"bonne","gr":96},{"p":"2024/06/IMG_7797-768x432.jpg","c":"Abri QUADRO en bardage Douglas noir vertical ajouré, porte vitrée à cadre noir","k":"abri","t":"QUADRO","i":98,"s":"ossature","b":"douglas_noir","bd":"v","te":"noir","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_3450-768x576.jpg","c":"Abri 1 pan en bardage autoclave vert horizontal, shingle brun, porte double pleine, grande fenêtre bois, gouttière","k":"abri","t":"1PAN","i":99,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":true,"ta":"grand","q":"bonne","gr":99},{"p":"2024/06/IMG_3451-768x576.jpg","c":"Abri 1 pan en bardage autoclave vert horizontal, shingle brun, porte double pleine, fenêtre bois, gouttière et descente","k":"abri","t":"1PAN","i":100,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":true,"ta":"grand","q":"bonne","gr":99},{"p":"2024/06/Resized_image0000001-768x566.jpg","c":"Abri QUADRO en bardage vertical gris, deux portes vitrées contemporaines, auvent ouvert avec plancher bois à droite","k":"abri","t":"QUADRO","i":101,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","semi"],["simple","contemporaine","vitree"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"grand","q":"bonne"},{"p":"2024/06/image0000001-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert horizontal, porte simple à trois vitrages, fenêtre hublot","k":"abri","t":"TOIT_PLAT","i":102,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_9708-768x576.jpeg","c":"Abri toit plat en ossature, bardage autoclave vert, porte semi-vitrée, fenêtre fixe, auvent ouvert à droite","k":"abri","t":"TOIT_PLAT","i":103,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_9714-768x576.jpeg","c":"Abri 1 pan en ossature, bardage autoclave vert, porte bois pleine à pentures, petite fenêtre à volets","k":"abri","t":"1PAN","i":104,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.3,"P":1.6,"ta":"petit","q":"bonne"},{"p":"2024/06/IMG_3644-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, shingle brun, porte double semi-vitrée à petits bois, auvent fermé sur trois côtés dans le prolongement","k":"abri","t":"2PANS","i":105,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","mortaisee","semi"]],"ex":{"f":"pleine","pl":true},"g":false,"L":3.5,"P":6.0,"ta":"tres_grand","q":"bonne","gr":105},{"p":"2024/06/IMG_3645-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, shingle brun, porte double semi-vitrée à petits bois, grand auvent fermé sur trois côtés","k":"abri","t":"2PANS","i":106,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","mortaisee","semi"]],"ex":{"f":"pleine","pl":true},"g":false,"L":3.5,"P":6.0,"ta":"tres_grand","q":"bonne","gr":105},{"p":"2024/06/IMG_3739-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double semi-vitrée, fenêtre fixe, auvent fermé à gauche sur dalle","k":"abri","t":"TOIT_PLAT","i":107,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["double","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"pleine","pl":false},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"bonne","gr":107},{"p":"2024/06/IMG_3740-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double semi-vitrée, fenêtre fixe, petit auvent ouvert à gauche","k":"abri","t":"TOIT_PLAT","i":108,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":5.5,"P":2.5,"ta":"grand","q":"bonne","gr":107},{"p":"2024/06/Resized_20200610_175012.jpeg","c":"Abri toit plat en ossature, bardage autoclave vert horizontal, porte vitrée à quatre carreaux, fenêtre hublot","k":"abri","t":"TOIT_PLAT","i":109,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["hublot","bois"]],"g":false,"L":3.4,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_3946-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double semi-vitrée, petite fenêtre latérale, auvent ouvert à droite","k":"abri","t":"TOIT_PLAT","i":110,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":3.7,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_4025-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte vitrée et fenêtres à volets, terrasse couverte en façade, gouttière","k":"abri","t":"2PANS","i":111,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["simple","porte_fenetre","vitree"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":4.5,"P":5.5,"ta":"tres_grand","q":"bonne","gr":111},{"p":"2024/06/IMG_4026-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, shingle noir, terrasse couverte sur plancher bois, gouttière noire","k":"abri","t":"2PANS","i":112,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["simple","porte_fenetre","vitree"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":4.5,"P":5.5,"ta":"tres_grand","q":"bonne","gr":111},{"p":"2024/06/IMG_4029-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, shingle noir, fenêtres à volets, terrasse couverte en façade","k":"abri","t":"2PANS","i":113,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":4.5,"P":5.5,"ta":"tres_grand","q":"bonne","gr":111},{"p":"2024/06/IMG_0327-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave brun, porte semi-vitrée à petits bois, fenêtres à volets, terrasse couverte avec barrière","k":"abri","t":"2PANS","i":114,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":4.2,"P":4.5,"ta":"grand","q":"bonne","gr":114},{"p":"2024/06/IMG_0328-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave brun, porte semi-vitrée à petits bois, fenêtres à volets, terrasse couverte avec barrière","k":"abri","t":"2PANS","i":115,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":4.2,"P":4.5,"ta":"grand","q":"bonne","gr":114},{"p":"2024/06/IMG_0332-768x576.jpeg","c":"Abri 1 pan en ossature, bardage autoclave brun, porte bois pleine à pentures, petite fenêtre à volets","k":"abri","t":"1PAN","i":116,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.1,"P":1.6,"ta":"petit","q":"bonne"},{"p":"2024/06/IMG_4150-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double bois pleine en pignon, rampe d'accès","k":"abri","t":"TOIT_PLAT","i":117,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":5.0,"ta":"grand","q":"bonne","gr":117},{"p":"2024/06/IMG_4151-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double bois pleine, rampe d'accès bois","k":"abri","t":"TOIT_PLAT","i":118,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","z","pleine"]],"g":false,"L":3.0,"P":5.0,"ta":"grand","q":"bonne","gr":117},{"p":"2024/06/IMG_4210-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte tierce bois pleine en pignon, fenêtre à volets","k":"abri","t":"2PANS","i":119,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["tierce","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne","gr":69},{"p":"2024/06/IMG_4211-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte tierce bois pleine, fenêtre à volets","k":"abri","t":"2PANS","i":120,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["tierce","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne","gr":69},{"p":"2024/06/20210902_123336-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave brun, porte double semi-vitrée à petits bois en pignon","k":"abri","t":"2PANS","i":121,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","po":[["double","mortaisee","semi"]],"g":false,"L":4.8,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2024/06/20210902_123358-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave brun, shingle noir, porte double semi-vitrée à petits bois","k":"abri","t":"2PANS","i":122,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"shingle_n","po":[["double","mortaisee","semi"]],"g":false,"L":4.8,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_4648-768x576.jpg","c":"Abri cube toit plat, bardage pin autoclave vertical, porte double semi-vitrée, plan en L","k":"abri","t":"QUADRO","i":123,"s":"ossature","b":"sr_vert_v","bd":"v","te":"miel","cv":"invisible","po":[["double","contemporaine","semi"]],"g":false,"ta":"tres_grand","q":"bonne","gr":123},{"p":"2024/06/IMG_4649-768x576.jpg","c":"Abri cube en L, bardage pin autoclave vertical, porte double semi-vitrée, fenêtre hublot","k":"abri","t":"QUADRO","i":124,"s":"ossature","b":"sr_vert_v","bd":"v","te":"miel","cv":"invisible","po":[["double","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"ta":"tres_grand","q":"bonne","gr":123},{"p":"2024/06/IMG_4650-768x576.jpg","c":"Abri cube en L, bardage pin autoclave vertical, fenêtre hublot en bout","k":"abri","t":"QUADRO","i":125,"s":"ossature","b":"sr_vert_v","bd":"v","te":"miel","cv":"invisible","fe":[["hublot","bois"]],"g":false,"ta":"tres_grand","q":"bonne","gr":123},{"p":"2024/06/IMG_1862-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave brun, shingle gris foncé, porte double bois cintrée, fenêtre à petits bois avec volets et jardinière","k":"abri","t":"2PANS","i":126,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"shingle_n","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"q":"bonne","v":"partielle"},{"p":"2024/06/IMG_1869-768x576.jpeg","c":"Garage 2 pans en ossature, bardage autoclave vert, porte basculante métallique anthracite, porte de service bois sur le côté","k":"garage","t":"2PANS","i":127,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"pg":"metal","g":false,"L":3.5,"P":5.0,"ta":"grand","q":"bonne","gr":35},{"p":"2024/06/IMG_4890-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double bois pleine, fenêtre à volets","k":"abri","t":"TOIT_PLAT","i":128,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":4.0,"P":3.0,"ta":"grand","q":"bonne","gr":128},{"p":"2024/06/IMG_4891-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double bois pleine, fenêtre à volets","k":"abri","t":"TOIT_PLAT","i":129,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":4.0,"P":3.0,"ta":"grand","q":"bonne","gr":128},{"p":"2024/06/IMG_5063-768x576.jpg","c":"Abri toit plat en ossature, bardage vertical gris, porte alu anthracite à vitrage dépoli","k":"abri","t":"TOIT_PLAT","i":130,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","alu","vitree"]],"g":false,"L":3.0,"P":2.6,"ta":"moyen","q":"bonne","gr":130},{"p":"2024/06/IMG_5064-768x576.jpg","c":"Abri toit plat en ossature, bardage vertical gris, haute fenêtre verticale sur le côté","k":"abri","t":"TOIT_PLAT","i":131,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","fe":[["verticale","bois"]],"g":false,"L":3.0,"P":2.6,"ta":"moyen","q":"bonne","gr":130},{"p":"2024/06/IMG_5200-768x576.jpeg","c":"Abri toit plat en ossature, bardage autoclave vert, porte double semi-vitrée, auvent ouvert à gauche sur plancher bois","k":"abri","t":"TOIT_PLAT","i":132,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_20220329_152154-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double semi-vitrée à petits bois, fenêtre à volets, auvent ouvert à droite","k":"abri","t":"2PANS","i":133,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","mortaisee","semi"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":false},"g":true,"L":5.5,"P":3.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_20220329_152202-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, shingle brun, porte double semi-vitrée, auvent ouvert sur le côté, gouttière","k":"abri","t":"2PANS","i":134,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","mortaisee","semi"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":false},"g":true,"L":5.5,"P":3.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_5460-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double semi-vitrée à petits bois, gouttière noire","k":"abri","t":"2PANS","i":135,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","mortaisee","semi"]],"g":true,"L":3.4,"P":3.0,"ta":"grand","q":"bonne","gr":135},{"p":"2024/06/IMG_5461-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double semi-vitrée à petits bois en pignon","k":"abri","t":"2PANS","i":136,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","mortaisee","semi"]],"g":true,"L":3.4,"P":3.0,"ta":"grand","q":"bonne","gr":135},{"p":"2024/06/IMG_5500-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte semi-vitrée, fenêtre fixe, petit auvent ouvert à gauche","k":"abri","t":"TOIT_PLAT","i":137,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":3.4,"P":2.0,"ta":"moyen","q":"bonne","gr":47},{"p":"2024/06/image0000011-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave brun, porte double étroite à petits bois, deux fenêtres à petits bois","k":"abri","t":"TOIT_PLAT","i":138,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"invisible","po":[["double","mortaisee","semi"]],"fe":[["classique","bois"],["classique","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2024/06/FB_IMG_1661763511653-768x346.jpg","c":"Carport 2 places toit plat, bandeau métallique anthracite, fermé sur un côté par des lames grises horizontales et au fond par un bardage bois","k":"carport","t":"TOIT_PLAT","i":139,"b":"autre","bd":"h","te":"gris","cv":"invisible","cp":{"ados":false,"bandeau":"bac_bandeau","fermeture":"deux_cotes"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/IMG_6859-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave vert, deux portes doubles semi-vitrées à petits bois, rive festonnée","k":"abri","t":"2PANS","i":140,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","mortaisee","semi"],["double","mortaisee","semi"]],"g":true,"L":5.4,"P":3.0,"ta":"grand","q":"bonne","gr":140},{"p":"2024/06/IMG_6864-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave vert, toiture en panneaux tuiles acier gris, deux portes doubles semi-vitrées","k":"abri","t":"2PANS","i":141,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"tuile_g","po":[["double","mortaisee","semi"],["double","mortaisee","semi"]],"g":false,"L":4.7,"P":3.5,"ta":"grand","q":"bonne","gr":140},{"p":"2024/06/IMG_6868-768x576.jpg","c":"Petit abri cube en Ayous vertical, porte double intégrée au bardage","k":"abri","t":"QUADRO","i":142,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","po":[["double","bardee","pleine"]],"g":false,"L":2.2,"P":1.4,"ta":"petit","q":"bonne"},{"p":"2024/06/IMG_6878-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte bois pleine, fenêtres à volets, terrasse couverte avec barrière","k":"abri","t":"2PANS","i":143,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":4.0,"P":4.5,"ta":"grand","q":"bonne","gr":143},{"p":"2024/06/IMG_6879-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte bois pleine entre deux fenêtres à volets, terrasse couverte avec barrière","k":"abri","t":"2PANS","i":144,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":4.0,"P":4.5,"ta":"grand","q":"bonne","gr":143},{"p":"2024/06/IMG_6946-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double à petits bois avec volets, fenêtre à volets, rive festonnée","k":"abri","t":"2PANS","i":145,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","mortaisee","semi"]],"fe":[["classique","bois"]],"L":4.5,"P":4.0,"ta":"grand","q":"bonne","gr":80},{"p":"2024/06/IMG_6947-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double et fenêtres à volets, gouttière noire","k":"abri","t":"2PANS","i":146,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","mortaisee","semi"]],"fe":[["classique","bois"],["classique","bois"]],"g":true,"L":4.5,"P":4.0,"ta":"grand","q":"bonne","gr":80},{"p":"2024/06/IMG_6950-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, shingle vert, porte double bois pleine, fenêtres à volets, auvent ouvert à droite","k":"abri","t":"2PANS","i":147,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_v","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":false},"g":true,"L":5.4,"P":3.5,"ta":"grand","q":"bonne","gr":80},{"p":"2024/06/132120185_o-768x512.jpg","c":"Garage 2 pans en ossature, bardage autoclave, toiture bac acier, porte basculante bois à lames verticales en pignon","k":"garage","t":"2PANS","i":148,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"bac","fe":[["classique","bois"],["classique","bois"],["classique","bois"]],"pg":"bois_vert_v","g":false,"L":5.0,"P":6.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/132120195_o-768x502.jpg","c":"Grand abri 2 pans en ossature, bardage autoclave, toiture bac acier, porte semi-vitrée et trois fenêtres","k":"abri","t":"2PANS","i":149,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"bac","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"],["classique","bois"],["classique","bois"]],"g":false,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/IMG-1561-768x665.jpg","c":"Abri cube en bardage Douglas noir vertical, porte alu vitrée dépolie, auvent ouvert à droite","k":"abri","t":"QUADRO","i":150,"s":"ossature","b":"douglas_noir","bd":"v","te":"noir","cv":"invisible","po":[["simple","alu","vitree"]],"ex":{"f":"ouverte","pl":false},"g":false,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG-1554-768x576.jpg","c":"Garage toit plat en ossature, bardage autoclave vert, porte basculante métallique ouverte, fenêtre à volets sur le côté","k":"garage","t":"TOIT_PLAT","i":151,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","fe":[["classique","bois"]],"pg":"metal","g":false,"L":4.0,"P":5.0,"ta":"grand","q":"bonne","gr":151},{"p":"2024/06/IMG-1555-768x576.jpg","c":"Garage toit plat en ossature, bardage autoclave vert, porte basculante métallique blanche","k":"garage","t":"TOIT_PLAT","i":152,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","pg":"metal","g":false,"ta":"grand","q":"bonne","gr":151},{"p":"2024/06/IMG-1556-768x576.jpg","c":"Garage toit plat en ossature, bardage autoclave vert horizontal, porte basculante métal sur le pignon, dalle béton devant","k":"garage","t":"TOIT_PLAT","i":153,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","pg":"metal","g":false,"L":3.0,"P":5.5,"ta":"grand","q":"bonne","gr":151},{"p":"2024/06/IMG-1560-1-768x576.jpg","c":"Garage toit plat en ossature vu de côté, bardage autoclave vert horizontal, fenêtre bois avec volets","k":"garage","t":"TOIT_PLAT","i":154,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","fe":[["classique","bois"]],"g":false,"L":3.0,"P":5.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_8179-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert horizontal, porte double semi-vitrée à trois carreaux, fenêtre fixe","k":"abri","t":"TOIT_PLAT","i":155,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"g":false,"L":5.0,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2024/06/2b5d17e4-2fd2-46d1-a58b-3b96aed6c14f-768x507.jpg","c":"Garage toit plat en ossature, bardage autoclave vert horizontal, porte basculante métal anthracite, porte de service bois à l'arrière","k":"garage","t":"TOIT_PLAT","i":156,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"pg":"metal","g":false,"L":3.0,"P":6.5,"ta":"grand","q":"bonne"},{"p":"2024/06/9017b70a-19aa-436f-b429-6fc23db6e200-768x786.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert horizontal, porte simple semi-vitrée sur le pignon, gouttière noire","k":"abri","t":"1PAN","i":157,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","contemporaine","semi"]],"g":true,"L":2.8,"P":4.0,"ta":"grand","q":"bonne","gr":157},{"p":"2024/06/dee1490b-c9f3-45d6-b6f5-b42f9fb64c1c-768x718.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert horizontal, couverture shingle, porte double bois pleine, gouttière noire","k":"abri","t":"1PAN","i":158,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["double","z","pleine"]],"g":true,"L":2.8,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2024/06/317d8e4e-ca57-43f3-8aaf-1e297a13c629-768x794.jpg","c":"Garage toit plat en ossature, bardage autoclave vert horizontal, porte basculante métal, fenêtre bois à volets sur le côté","k":"garage","t":"TOIT_PLAT","i":159,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","fe":[["classique","bois"]],"pg":"metal","g":false,"L":3.0,"P":5.0,"ta":"grand","q":"bonne","gr":159},{"p":"2024/06/08277da0-2b6c-4581-9fac-a1289a6fac06-768x868.jpg","c":"Chalet 2 pans en madrier autoclave vert, porte double semi-vitrée à petits bois, fenêtre à croisillons, volets et jardinière, terrasse bois devant","k":"abri","t":"2PANS","i":160,"s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"shingle_n","po":[["double","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":4.0,"P":3.5,"ta":"grand","q":"bonne"},{"p":"2024/06/7f000932-f068-459f-b1e7-016afb704ec3-768x576.jpg","c":"Garage cube QUADRO, bardage pin brun posé vertical, porte basculante habillée du même bardage, appliques murales","k":"garage","t":"QUADRO","i":161,"s":"ossature","b":"autre","bd":"v","te":"brun","cv":"invisible","pg":"autre","L":3.2,"P":7.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/895e1b4a-2186-4c2c-9ef9-a80071246db6-768x576.jpg","c":"Garage cube QUADRO vu de l'arrière, bardage vertical, porte de service vitrée à trois carreaux sur le pignon","k":"garage","t":"QUADRO","i":162,"s":"ossature","b":"autre","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"L":3.2,"P":7.0,"ta":"tres_grand","q":"moyenne","v":"partielle"},{"p":"2024/06/1c53e23b-d8e1-442a-bfaf-cc4b33f4bc2a-768x576.jpg","c":"Garage cube QUADRO, bardage pin brun posé vertical, porte basculante bardée assortie","k":"garage","t":"QUADRO","i":163,"s":"ossature","b":"autre","bd":"v","te":"brun","cv":"invisible","pg":"autre","L":3.2,"P":7.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/IMG_7578-768x1024.jpeg","c":"Abri 2 pans en ossature, bardage bois exotique huilé horizontal, porte double à pentures, fenêtre bois à volets et jardinière","k":"abri","t":"2PANS","i":167,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_9364-768x576.jpg","c":"Garage 2 pans en ossature, bardage autoclave vert horizontal, grandes portes battantes bois à pentures, porte de service et fenêtre à volet sur le côté","k":"garage","t":"2PANS","i":168,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"pg":"autre","g":false,"L":3.2,"P":5.5,"ta":"grand","q":"bonne","gr":168},{"p":"2024/06/IMG_9365-768x576.jpg","c":"Garage 2 pans en ossature, bardage autoclave vert horizontal, portes battantes bois à pentures sur le pignon","k":"garage","t":"2PANS","i":169,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","pg":"autre","g":false,"L":3.2,"P":5.5,"ta":"grand","q":"bonne","gr":168},{"p":"2024/06/IMG_9688-768x576.jpg","c":"Garage toit plat en ossature, bardage autoclave vert horizontal, bandeau de rive métal gris anthracite, porte basculante métal, fenêtre fixe et porte de service sur le côté","k":"garage","t":"TOIT_PLAT","i":170,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"fe":[["contemporaine","bois"]],"pg":"metal","g":true,"L":3.2,"P":5.0,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_9786-768x576.jpg","c":"Abri toit plat en madrier autoclave vert, entrée en retrait sous le toit, porte semi-vitrée à trois carreaux dépolis, grand hublot","k":"abri","t":"TOIT_PLAT","i":171,"s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"L":3.6,"P":2.3,"ta":"moyen","q":"bonne","gr":171},{"p":"2024/06/IMG_9787-768x576.jpg","c":"Abri toit plat en madrier autoclave vert, porte semi-vitrée en retrait, hublot sur la partie avancée","k":"abri","t":"TOIT_PLAT","i":172,"s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"g":false,"L":3.6,"P":2.3,"ta":"moyen","q":"bonne","gr":171},{"p":"2024/06/IMG_3438-2-768x576.jpeg","c":"Rangée de garages toit plat en ossature, bardage autoclave horizontal, portes basculantes métal anthracite, une porte ouverte sur l'intérieur","k":"garage","t":"TOIT_PLAT","i":173,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","pg":"metal","ta":"tres_grand","q":"bonne","v":"partielle"},{"p":"2024/06/1000004662-768x576.jpg","c":"Carport double toit plat, poteaux bois à jambes de force, bandeau en lames horizontales, côtés et fond fermés en claire-voie horizontale","k":"carport","t":"TOIT_PLAT","i":174,"b":"autre","bd":"h","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"deux_cotes"},"L":6.0,"P":8.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/1000004663-768x576.jpg","c":"Carport double toit plat, bandeau en lames horizontales, côté long et fond fermés en claire-voie horizontale pin autoclave vert","k":"carport","t":"TOIT_PLAT","i":175,"b":"autre","bd":"h","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"deux_cotes"},"L":6.0,"P":8.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/1000004664-768x576.jpg","c":"Carport toit plat vu de l'arrière, fond et côté fermés en claire-voie horizontale pin autoclave vert, bandeau en lames horizontales","k":"carport","t":"TOIT_PLAT","i":176,"b":"autre","bd":"h","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"deux_cotes"},"L":6.0,"P":8.0,"ta":"tres_grand","q":"bonne","v":"partielle"},{"p":"2024/06/3DBB11E6-1-002.jpg","c":"Carport double toit plat, poteaux bois à jambes de force, bandeau en lames horizontales, fond fermé en bardage autoclave vert jointif","k":"carport","t":"TOIT_PLAT","i":177,"b":"sr_vert","bd":"h","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"fond"},"L":5.5,"P":5.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/IMG_7735-768x576.jpg","c":"Carport toit plat ouvert, 4 poteaux bois à jambes de force en Y, bandeau en lames verticales ajourées brunes","k":"carport","t":"TOIT_PLAT","i":178,"te":"brun","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"autre","fermeture":"aucune"},"L":5.5,"P":5.0,"ta":"tres_grand","q":"bonne","gr":178},{"p":"2024/06/IMG_7737-768x576.jpg","c":"Carport toit plat ouvert, poteaux bois à jambes de force, bandeau en lames verticales ajourées brunes, sous-face en chevrons apparents","k":"carport","t":"TOIT_PLAT","i":179,"te":"brun","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"autre","fermeture":"aucune"},"L":5.5,"P":5.0,"ta":"tres_grand","q":"bonne","gr":178},{"p":"2024/06/IMG_9139-768x432.jpg","c":"Carport double toit plat, poteaux et bandeau lisses gris anthracite, chevrons bois apparents en sous-face","k":"carport","t":"TOIT_PLAT","i":180,"te":"gris","cv":"invisible","cp":{"pot":"alu","ados":false,"bandeau":"bac_bandeau","fermeture":"aucune"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"moyenne"},{"p":"2024/06/DSC06352-768x431.jpg","c":"Carport double 2 pans ouvert, 4 poteaux bois, ferme apparente en pignon, charpente pin autoclave","k":"carport","t":"2PANS","i":181,"te":"vert","cp":{"pot":"bois","ados":false,"bandeau":"autre","fermeture":"aucune"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"bonne"},{"p":"2024/06/DSC06357-768x431.jpg","c":"Carport double 2 pans ouvert, poteaux bois à jambes de force, couverture shingle brun, gouttière et descente noires","k":"carport","t":"2PANS","i":182,"te":"vert","cv":"shingle_b","g":true,"cp":{"pot":"bois","ados":false,"bandeau":"autre","fermeture":"aucune"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"bonne"},{"p":"2025/01/IMG_2056-768x576.jpeg","c":"Abri cube QUADRO, bardage Ayous vertical aléatoire, porte double bardée, bûcher ouvert intégré à gauche","k":"abri","t":"QUADRO","i":183,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","po":[["double","bardee","pleine"]],"ex":{"f":"pleine","pl":false},"L":5.0,"P":2.5,"ta":"grand","q":"bonne","gr":183},{"p":"2025/01/Abri-de-jardin-MONTFORT-Toit-Plat-768x768.jpg","c":"Abri toit plat en ossature, bardage autoclave vert horizontal, porte simple bois à pentures, fenêtre bois à volets","k":"abri","t":"TOIT_PLAT","i":186,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":3.5,"ta":"grand","q":"bonne"},{"p":"2025/04/PHOTO-2024-07-12-20-11-57-1-768x487.jpg","c":"Garage 1 pan en ossature, bardage autoclave vert horizontal, couverture shingle noir, porte basculante métal, fenêtre à volets et porte de service sur le côté","k":"garage","t":"1PAN","i":187,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"pg":"metal","g":false,"L":3.0,"P":6.5,"ta":"grand","q":"bonne"},{"p":"2025/04/284832790_366736098886531_9074259038809327325_n-3-768x616.jpg","c":"Abri cube QUADRO, bardage Ayous vertical aléatoire, porte vitrée à cadre noir à trois carreaux","k":"abri","t":"QUADRO","i":188,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","po":[["simple","alu","vitree"]],"ta":"moyen","q":"bonne"},{"p":"2025/04/IMG_7247-768x613.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert horizontal, porte semi-vitrée à petits bois, fenêtre à croisillons et volets, shingle","k":"abri","t":"1PAN","i":189,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2025/04/GARAGE-EMB-45-600-768x576.jpg","c":"Garage double 2 pans en madrier, deux portes basculantes bois autoclave vert à lames verticales, rives chantournées","k":"garage","t":"2PANS","i":190,"s":"madrier","b":"madrier","bd":"h","te":"vert","pg":"bois_vert_v","g":false,"ta":"tres_grand","q":"bonne"},{"p":"2025/05/IMG_9584-768x576.jpg","c":"Abri ouvert toit plat en ossature, bardage autoclave vert horizontal, façade entièrement ouverte, plancher bois","k":"abri","t":"TOIT_PLAT","i":191,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","g":false,"L":3.0,"P":1.8,"ta":"moyen","q":"bonne"},{"p":"2025/05/IMG_9482-768x934.jpeg","c":"Petit abri ouvert toit plat en ossature, bardage autoclave vert horizontal, plancher bois","k":"abri","t":"TOIT_PLAT","i":192,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","g":false,"L":2.5,"P":1.5,"ta":"petit","q":"bonne","gr":192},{"p":"2025/05/IMG_9483-768x906.jpeg","c":"Petit abri ouvert toit plat en ossature, bardage autoclave vert horizontal, plancher bois","k":"abri","t":"TOIT_PLAT","i":193,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","g":false,"L":2.5,"P":1.5,"ta":"petit","q":"bonne","gr":192},{"p":"2025/05/IMG_9583-768x576.jpg","c":"Abri ouvert 1 pan, poteaux à jambes de force, ossature apparente à l'intérieur, bardage autoclave vert horizontal, plancher bois","k":"abri","t":"1PAN","i":194,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","g":false,"L":4.0,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2025/05/IMG_9486-768x736.jpeg","c":"Abri ouvert 1 pan, poteaux à jambes de force, ossature apparente, bardage autoclave vert horizontal, plancher bois","k":"abri","t":"1PAN","i":195,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","g":false,"L":4.0,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2025/06/IMG_3172-rotated.jpg","c":"Deux abris toit plat en ossature, bardage autoclave horizontal : l'un avec porte double vitrée et hublot, l'autre avec porte semi-vitrée et fenêtre fixe","k":"abri","t":"TOIT_PLAT","i":196,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["double","contemporaine","vitree"],["simple","contemporaine","semi"]],"fe":[["hublot","bois"],["contemporaine","bois"]],"g":false,"q":"moyenne","v":"partielle"},{"p":"2025/09/20240913_124336-768x576.jpg","c":"Abri cube QUADRO, bardage Ayous vertical aléatoire, longue fenêtre bandeau à cadre noir","k":"abri","t":"QUADRO","i":198,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","fe":[["bandeau","alu"]],"ta":"grand","q":"bonne"},{"p":"2025/10/IMG_2213_2.jpg","c":"Abri cube sans débord, bardage horizontal brun, porte vitrée à trois carreaux, hublot sur le côté","k":"abri","t":"QUADRO","i":200,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["hublot","bois"]],"L":4.0,"P":2.5,"ta":"grand","q":"bonne","gr":200},{"p":"2026/03/IMG_9207-768x531.jpg","c":"Garage double cube QUADRO, bardage Ayous vertical aléatoire patiné, porte de garage bardée assortie, appliques murales","k":"garage","t":"QUADRO","i":201,"s":"ossature","b":"ayous_alea","bd":"v","te":"gris","cv":"invisible","fe":[["verticale","bois"]],"pg":"ayous_alea","ta":"tres_grand","q":"bonne"},{"p":"2026/04/IMG_0855-1024x768-768x576.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert horizontal, shingle brun, porte double bois à pentures, fenêtre à croisillons et volets, rampe d'accès","k":"abri","t":"1PAN","i":202,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":true,"L":4.5,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2026/04/IMG_7445-768x571.jpeg","c":"Abri cube QUADRO, bardage vertical gris, deux fenêtres verticales étroites, porte sur le côté avec petit plancher bois","k":"abri","t":"QUADRO","i":203,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","?","?"]],"fe":[["verticale","bois"],["verticale","bois"]],"L":3.0,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2026/04/ASIA-350-X-570-1024x768-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave horizontal, hublot, porte vitrée étroite et double porte vitrée à petits bois","k":"abri","t":"TOIT_PLAT","i":204,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["simple","contemporaine","vitree"],["double","porte_fenetre","vitree"]],"fe":[["hublot","bois"]],"g":false,"L":5.5,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2026/04/IMG_4507-edited-scaled-768x576.jpeg","c":"Garage 2 pans en madriers, porte basculante en lames bois verticales teinte brune","k":"garage","t":"2PANS","i":205,"s":"madrier","b":"madrier","bd":"h","te":"brun","pg":"autre","g":false,"ta":"grand","q":"bonne"},{"p":"2026/04/IMG_6033-768x576.jpeg","c":"Abri cube QUADRO, bardage métal à joint debout gris anthracite, porte alu noire vitrée","k":"abri","t":"QUADRO","i":206,"s":"ossature","b":"autre","bd":"v","te":"gris","cv":"invisible","po":[["simple","alu","vitree"]],"g":false,"L":2.8,"P":3.2,"ta":"moyen","q":"bonne","gr":206},{"p":"2026/04/IMG_6032-768x576.jpeg","c":"Abri cube QUADRO, bardage métal à joint debout gris anthracite, porte alu noire vitrée trois carreaux","k":"abri","t":"QUADRO","i":207,"s":"ossature","b":"autre","bd":"v","te":"gris","cv":"invisible","po":[["simple","alu","vitree"]],"g":false,"L":2.8,"P":3.2,"ta":"moyen","q":"bonne","gr":206},{"p":"2026/04/IMG_9451-768x856.jpeg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte pleine et fenêtre à volets et jardinière en pignon, seuil en plancher bois","k":"abri","t":"2PANS","i":208,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.0,"ta":"moyen","q":"bonne","gr":30},{"p":"2024/02/IMG_4208-3-1-1024x614-1024x614-1-768x461.jpg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, porte double pleine et fenêtre à petits bois avec volets en pignon","k":"abri","t":"2PANS","i":209,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2024/02/IMG_5557-1024x768-1-768x576.jpg","c":"Carport toit plat en pin autoclave, poteaux bois à jambes de force, bandeau en lames horizontales","k":"carport","t":"TOIT_PLAT","i":210,"te":"miel","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"aucune"},"L":6.0,"P":3.5,"ta":"tres_grand","q":"bonne"},{"p":"2024/02/2b5d17e4-2fd2-46d1-a58b-3b96aed6c14f-1024x768-1-768x576.jpg","c":"Garage toit plat en ossature, bardage autoclave horizontal, porte basculante métal gris anthracite, porte de service au fond","k":"garage","t":"TOIT_PLAT","i":211,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["simple","z","pleine"]],"pg":"metal","g":false,"L":3.0,"P":6.0,"ta":"grand","q":"bonne"},{"p":"2024/02/4c1c3639-c567-4ade-a465-6af83b51d385-768x1024-1.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, double porte vitrée, deux fenêtres à petits bois avec volets, gouttière","k":"abri","t":"2PANS","i":212,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","contemporaine","vitree"]],"fe":[["classique","bois"],["classique","bois"]],"g":true,"L":4.0,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2024/02/317d8e4e-ca57-43f3-8aaf-1e297a13c629-768x1024-1.jpg","c":"Garage toit plat en ossature, bardage autoclave horizontal, porte basculante métal blanche, fenêtre à volet sur le côté","k":"garage","t":"TOIT_PLAT","i":213,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","fe":[["classique","bois"]],"pg":"metal","g":false,"L":3.0,"P":5.0,"ta":"grand","q":"bonne","gr":159},{"p":"2024/02/9017b70a-19aa-436f-b429-6fc23db6e200-768x1024-1.jpg","c":"Abri 1 pan en ossature, bardage autoclave horizontal, couverture bac acier, porte semi-vitrée trois carreaux en pignon","k":"abri","t":"1PAN","i":214,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"bac","po":[["simple","contemporaine","semi"]],"g":false,"L":2.5,"P":4.5,"ta":"grand","q":"bonne","gr":157},{"p":"2024/02/4bb2acbe-3c71-4c1f-9631-3d25aab776a0-768x1024-1.jpg","c":"Abri toit plat en ossature, bardage autoclave horizontal, hublot et porte semi-vitrée trois carreaux","k":"abri","t":"TOIT_PLAT","i":215,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["hublot","bois"]],"L":2.5,"P":3.0,"ta":"moyen","q":"bonne","gr":42},{"p":"2024/02/IMG_0678-768x1024-1.jpg","c":"Abri 2 pans en ossature, bardage autoclave, shingle brun, porte pleine et fenêtre à volets et jardinière en pignon, auvent ouvert à droite sur plancher bois","k":"abri","t":"2PANS","i":216,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"shingle_b","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":2.2,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/02/Abri_jardin_ROQUEBRUNE_autoclave_300x500_3-768x576.jpg","c":"Abri 1 pan en ossature, bardage autoclave horizontal, shingle brun, porte double pleine, deux fenêtres à petits bois avec volets","k":"abri","t":"1PAN","i":217,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"g":false,"L":5.0,"P":3.0,"ta":"grand","q":"moyenne"},{"p":"2024/02/IMG_0696-768x1024-1.jpg","c":"Abri 1 pan en ossature, bardage autoclave horizontal, porte double pleine, fenêtre latérale avec volet bois","k":"abri","t":"1PAN","i":218,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"L":2.3,"P":2.3,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_1770-768x576.jpg","c":"Abri 1 pan en madriers, porte semi-vitrée à petits bois, fenêtre à petits bois avec volet","k":"abri","t":"1PAN","i":219,"s":"madrier","b":"madrier","bd":"h","te":"miel","cv":"shingle_n","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.0,"ta":"petit","q":"bonne","gr":219},{"p":"2024/06/IMG_1771-768x576.jpg","c":"Abri 1 pan en madriers, shingle noir, porte semi-vitrée à petits bois, fenêtre à petits bois avec volet","k":"abri","t":"1PAN","i":220,"s":"madrier","b":"madrier","bd":"h","te":"miel","cv":"shingle_n","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.0,"ta":"petit","q":"moyenne","gr":219},{"p":"2024/06/IMG_3544.jpg","c":"Abri toit plat en ossature, bardage autoclave horizontal, double porte vitrée dépolie, fenêtre fixe, auvent ouvert à droite","k":"abri","t":"TOIT_PLAT","i":221,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["double","contemporaine","vitree"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":4.5,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_7445-2-768x463.jpeg","c":"Abri cube QUADRO, bardage vertical gris, deux fenêtres verticales, porte latérale avec marche en plancher bois","k":"abri","t":"QUADRO","i":222,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["verticale","bois"],["verticale","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_2692-768x576.jpg","c":"Abri 1 pan en ossature, bardage autoclave horizontal, vu de l'arrière","k":"abri","t":"1PAN","i":223,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","g":false,"L":3.2,"P":4.0,"ta":"grand","q":"moyenne","v":"partielle","gr":83},{"p":"2024/06/IMG_6651-768x576.jpg","c":"Abri 2 pans en ossature, bardage vertical autoclave, porte-fenêtre double et bandeau vitré en bois teinté, auvent avant sur terrasse bois","k":"abri","t":"2PANS","i":224,"s":"ossature","b":"sr_vert_v","bd":"v","te":"miel","cv":"shingle_n","po":[["double","porte_fenetre","vitree"]],"fe":[["bandeau","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":4.0,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_2861-768x576.jpg","c":"Petit abri toit plat en ossature, bardage autoclave horizontal, porte semi-vitrée dépolie et fenêtre fixe","k":"abri","t":"TOIT_PLAT","i":225,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["simple","contemporaine","semi"]],"fe":[["contemporaine","bois"]],"g":false,"L":2.0,"P":1.5,"ta":"petit","q":"bonne","gr":90},{"p":"2024/06/IMG_2877-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, pignon en lames verticales, vu de l'arrière","k":"abri","t":"2PANS","i":226,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","g":false,"L":3.0,"P":3.5,"ta":"grand","q":"bonne","v":"partielle","gr":94},{"p":"2024/06/IMG_2912-768x660.jpg","c":"Abri 2 pans en madriers, porte pleine et fenêtre à petits bois en pignon","k":"abri","t":"2PANS","i":228,"s":"madrier","b":"madrier","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_2939-768x576.jpg","c":"Abri 1 pan en ossature, bardage autoclave horizontal, panneaux tuiles acier rouges, porte double pleine, fenêtre à volets, gouttière","k":"abri","t":"1PAN","i":229,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"tuile_r","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":true,"L":2.6,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/Resized_image0000001002-768x576.jpg","c":"Abri QUADRO en ossature, bardage vertical pin autoclave, porte vitrée quatre carreaux, extension ouverte à droite sur plancher bois","k":"abri","t":"QUADRO","i":230,"s":"ossature","b":"ps_vert_ajoure","bd":"v","te":"vert","cv":"invisible","po":[["simple","contemporaine","vitree"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":5.0,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2024/06/Resized_image0000001001-768x576.jpg","c":"Abri QUADRO en ossature, bardage vertical pin autoclave, porte vitrée étroite, grande extension à droite fermée au fond et sur le côté, plancher bois","k":"abri","t":"QUADRO","i":231,"s":"ossature","b":"ps_vert_ajoure","bd":"v","te":"vert","cv":"invisible","po":[["simple","contemporaine","vitree"]],"ex":{"f":"pleine","pl":true},"g":false,"L":5.5,"P":3.0,"ta":"grand","q":"bonne"},{"p":"2024/06/Resized_image0000011-768x399.jpg","c":"Abri QUADRO en ossature, bardage vertical gris, porte vitrée et fenêtre verticale, extension ouverte à droite sur plancher bois","k":"abri","t":"QUADRO","i":232,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["verticale","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"moyenne"},{"p":"2024/06/IMG_2213-768x533.jpg","c":"Abri cube sans débord, bardage horizontal brun, porte vitrée trois carreaux, hublot sur le côté","k":"abri","t":"QUADRO","i":233,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"invisible","po":[["simple","contemporaine","vitree"]],"fe":[["hublot","bois"]],"g":false,"L":3.0,"P":2.2,"ta":"moyen","q":"bonne","gr":200},{"p":"2024/06/Resized_20200612_124000-768x373.jpeg","c":"Abri toit plat en ossature, bardage autoclave horizontal, double porte vitrée à carreaux dépolis","k":"abri","t":"TOIT_PLAT","i":234,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"invisible","po":[["double","contemporaine","vitree"]],"g":false,"L":3.5,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_3837-768x576.jpg","c":"Abri QUADRO en ossature, bardage vertical gris, porte bardée, extension à droite fermée au fond et sur le côté, sol béton","k":"abri","t":"QUADRO","i":235,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","bardee","pleine"]],"ex":{"f":"pleine","pl":false},"g":false,"L":5.5,"P":2.5,"ta":"grand","q":"bonne","gr":235},{"p":"2024/06/IMG_3838-768x576.jpg","c":"Abri QUADRO en ossature, bardage vertical gris, porte bardée, extension à droite fermée au fond et sur le côté","k":"abri","t":"QUADRO","i":236,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","bardee","pleine"]],"ex":{"f":"pleine","pl":false},"g":false,"L":5.5,"P":2.5,"ta":"grand","q":"bonne","gr":235},{"p":"2024/06/IMG_4027-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, deux fenêtres à volets en pignon, gouttière, auvent sur plancher en bout de toiture","k":"abri","t":"2PANS","i":237,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":4.5,"P":4.0,"ta":"grand","q":"moyenne","gr":111},{"p":"2024/06/IMG_4028-768x576.jpg","c":"Pignon d'abri 2 pans en ossature, bardage autoclave horizontal, deux fenêtres à volets, pignon en lames verticales","k":"abri","t":"2PANS","i":238,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","fe":[["classique","bois"],["classique","bois"]],"g":true,"L":4.5,"P":4.0,"ta":"grand","q":"moyenne","v":"partielle","gr":111},{"p":"2024/06/20210902_101607-768x576.jpg","c":"Abri 2 pans en madriers avec cloison intérieure, couverture bac acier, vu de l'arrière","k":"abri","t":"2PANS","i":239,"s":"madrier","b":"madrier","bd":"h","te":"miel","cv":"bac","g":false,"ta":"grand","q":"bonne","v":"partielle"},{"p":"2024/06/IMG_1856-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, panneaux tuiles acier gris, porte pleine en pignon sur plancher bois","k":"abri","t":"2PANS","i":240,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"tuile_g","po":[["double","z","pleine"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"moyenne","gr":240},{"p":"2024/06/IMG_1858-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, panneaux tuiles acier gris, fenêtre à volets et porte pleine en pignon","k":"abri","t":"2PANS","i":241,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","cv":"tuile_g","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"moyenne","v":"partielle","gr":240},{"p":"2024/06/IMG_1859-768x576.jpeg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, porte double pleine et fenêtre à volets en pignon","k":"abri","t":"2PANS","i":242,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"moyenne","gr":240},{"p":"2024/06/IMG_1868-768x1024.jpeg","c":"Garage 2 pans en ossature, bardage autoclave horizontal, porte basculante métal anthracite, porte de service sur le côté","k":"garage","t":"2PANS","i":243,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"pg":"metal","g":false,"L":3.0,"P":5.0,"ta":"grand","q":"bonne","gr":35},{"p":"2024/06/IMG_5241-768x576.jpg","c":"Abri QUADRO allongé en ossature, bardage vertical gris, double porte bardée, deux fenêtres verticales","k":"abri","t":"QUADRO","i":246,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["double","bardee","pleine"]],"fe":[["verticale","bois"],["verticale","bois"]],"g":true,"L":7.0,"P":2.5,"ta":"grand","q":"bonne","gr":246},{"p":"2024/06/IMG_5242-768x576.jpg","c":"Abri QUADRO allongé en ossature, bardage vertical gris, double porte bardée entre deux fenêtres verticales","k":"abri","t":"QUADRO","i":247,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["double","bardee","pleine"]],"fe":[["verticale","bois"],["verticale","bois"]],"g":true,"L":7.0,"P":2.5,"ta":"grand","q":"bonne","gr":246},{"p":"2024/06/IMG_3141-768x1024.jpeg","c":"Petit abri 1 pan en ossature, bardage autoclave horizontal, porte double pleine cintrée, gouttière","k":"abri","t":"1PAN","i":248,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"g":true,"L":2.2,"P":2.0,"ta":"petit","q":"bonne"},{"p":"2024/06/IMG_20220329_152225-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, vu côté pignon sans ouverture, gouttières vers récupérateur, auvent latéral sur poteau","k":"abri","t":"2PANS","i":249,"s":"ossature","b":"sr_vert","bd":"h","te":"miel","ex":{"f":"ouverte","pl":false},"g":true,"ta":"grand","q":"bonne","v":"partielle"},{"p":"2024/06/image001-768x1024.jpg","c":"Petit abri toit plat en ossature, bardage autoclave vert, double porte semi-vitrée à carreaux dépolis","k":"abri","t":"TOIT_PLAT","i":250,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["double","contemporaine","semi"]],"g":false,"L":2.2,"P":1.5,"ta":"petit","q":"bonne"},{"p":"2024/06/image0000001-1-768x576.jpg","c":"Abri toit plat en ossature, bardage autoclave vert, porte pleine, deux fenêtres à volets dont une avec jardinière, rampe et terrasse en bois","k":"abri","t":"TOIT_PLAT","i":251,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","po":[["simple","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"L":2.5,"P":3.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/image000000.jpg","c":"Abri en bardage Ayous vertical aléatoire, porte vitrée cinq carreaux, auvent attenant fermé au fond sur dalle béton","k":"abri","t":"QUADRO","i":252,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","po":[["simple","contemporaine","vitree"]],"ex":{"f":"pleine","pl":false},"g":false,"ta":"grand","q":"bonne"},{"p":"2024/06/20221102_135746-002-768x1024.jpg","c":"Abri 2 pans en madriers, porte pleine, fenêtre à petits bois avec volets et jardinière en pignon","k":"abri","t":"2PANS","i":253,"s":"madrier","b":"madrier","bd":"h","te":"miel","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.5,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/IMG_6951-768x576.jpg","c":"Abri 2 pans en ossature, bardage autoclave horizontal, shingle vert, auvent avant ouvert sur poteaux à jambes de force, gouttière","k":"abri","t":"2PANS","i":254,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_v","ex":{"f":"ouverte","pl":false},"g":true,"L":4.5,"P":3.0,"ta":"grand","q":"bonne","gr":80},{"p":"2024/06/quadro-pour-bon-coin.jpg","c":"Abri cube QUADRO en ossature, bardage vertical ajouré gris, porte contemporaine à trois vitrages","k":"abri","t":"QUADRO","i":255,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"ta":"moyen","q":"moyenne"},{"p":"2024/06/20230413_133948-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double pleine en pignon, deux fenêtres à volets, auvent sur plancher à droite","k":"abri","t":"2PANS","i":256,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"mixte","pl":true},"g":false,"L":4.5,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2024/06/20230413_134049-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double pleine, deux fenêtres à volets, auvent terrasse sur plancher bois à droite","k":"abri","t":"2PANS","i":257,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"],["classique","bois"]],"ex":{"f":"mixte","pl":true},"g":false,"L":4.5,"P":4.0,"ta":"grand","q":"bonne"},{"p":"2024/06/d1a30bcb-abaf-4b21-b694-612ce58061af-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte simple pleine en pignon, planches de rive festonnées","k":"abri","t":"2PANS","i":258,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_b","po":[["simple","z","pleine"]],"g":false,"L":2.3,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2024/06/4a0c4cfa-95f0-47af-a73f-3e7b3162678c-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte simple pleine en pignon, planches de rive festonnées","k":"abri","t":"2PANS","i":259,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"g":false,"L":2.3,"P":3.0,"ta":"moyen","q":"bonne"},{"p":"2024/06/a6ef3801-9189-4804-b5fd-c7938af530bf-768x576.jpg","c":"Garage cube QUADRO en ossature, bardage vertical ajouré de teinte brune, porte de service vitrée, appliques murales","k":"garage","t":"QUADRO","i":260,"s":"ossature","bd":"v","te":"brun","cv":"invisible","po":[["simple","contemporaine","vitree"]],"pg":"autre","ta":"grand","q":"faible"},{"p":"2024/06/e227508b-093e-4541-b5db-399853a221c7-768x576.jpg","c":"Garage cube QUADRO, bardage vertical ajouré de teinte brune, porte basculante habillée du même bardage vertical","k":"garage","t":"QUADRO","i":261,"s":"ossature","bd":"v","te":"brun","cv":"invisible","pg":"autre","ta":"grand","q":"moyenne"},{"p":"2024/06/25fd5418-c310-407c-9f25-5dfc8ddbcfc3-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert vertical, couverture bac acier, porte double pleine en pignon, fenêtre à volet sur le côté","k":"abri","t":"2PANS","i":262,"s":"ossature","b":"sr_vert_v","bd":"v","te":"vert","cv":"bac","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.2,"P":5.0,"ta":"grand","q":"bonne"},{"p":"2024/06/346df855-d8b3-4c1a-acb5-1a9d2cc8b16b-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert vertical, couverture bac acier, porte double pleine en pignon, fenêtre à volet sur le côté","k":"abri","t":"2PANS","i":263,"s":"ossature","b":"sr_vert_v","bd":"v","te":"vert","cv":"bac","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":3.2,"P":5.0,"ta":"grand","q":"bonne"},{"p":"2024/06/e01e7012-525d-40ec-96b9-99a145b34970-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert vertical, couverture bac acier anthracite, fenêtre à volet en façade latérale","k":"abri","t":"2PANS","i":264,"s":"ossature","b":"sr_vert_v","bd":"v","te":"vert","cv":"bac","fe":[["classique","bois"]],"g":false,"L":3.2,"P":5.0,"ta":"grand","q":"bonne"},{"p":"2024/06/1122ee39-cf06-4c22-bc7b-0b2a36e9994a-768x576.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert vertical, couverture tuiles acier rouges, porte double pleine, auvent ouvert sur plancher à droite","k":"abri","t":"1PAN","i":265,"s":"ossature","b":"sr_vert_v","bd":"v","te":"vert","cv":"tuile_r","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":3.5,"P":2.5,"ta":"moyen","q":"bonne"},{"p":"2024/06/Resized_20230629_121703.jpg","c":"Abri 1 pan en ossature, bardage autoclave brun, porte double pleine, fenêtre à volets, bûcher ouvert sur plancher à gauche, gouttière","k":"abri","t":"1PAN","i":266,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":4.0,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2024/06/Resized_20230629_121712-768x432.jpg","c":"Abri 1 pan en ossature, bardage autoclave brun, porte double pleine, fenêtre à volets, bûcher ouvert sur plancher à gauche","k":"abri","t":"1PAN","i":267,"s":"ossature","b":"sr_brun","bd":"h","te":"brun","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":true,"L":4.0,"P":2.5,"ta":"grand","q":"bonne"},{"p":"2024/06/IMG_7683-768x1024.jpg","c":"Abri 2 pans en ossature, bardage autoclave vert, porte double pleine, fenêtre à petits bois et volets, rives festonnées, extension sur plancher à droite","k":"abri","t":"2PANS","i":268,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"moyen","q":"bonne"},{"p":"2024/06/20231005_120355-768x1024.jpg","c":"Abri 2 pans en ossature, bardage horizontal brun-orangé, porte double pleine, fenêtre à volet coulissant bardé, gouttières et descentes noires","k":"abri","t":"2PANS","i":269,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["contemporaine","bois"]],"g":true,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne","gr":269},{"p":"2024/06/20231005_120417-768x1024.jpg","c":"Abri 2 pans en ossature, bardage horizontal brun-orangé, porte double pleine, fenêtre bois à volet coulissant ouvert, gouttières","k":"abri","t":"2PANS","i":270,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","cv":"shingle_b","po":[["double","z","pleine"]],"fe":[["contemporaine","bois"]],"g":true,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne","gr":269},{"p":"2024/06/20231005_120533-768x1024.jpg","c":"Abri 2 pans en ossature, bardage horizontal brun-orangé, porte double pleine, fenêtre bois à volet coulissant, gouttières","k":"abri","t":"2PANS","i":271,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","po":[["double","z","pleine"]],"fe":[["contemporaine","bois"]],"g":true,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne","gr":269},{"p":"2024/06/IMG_2780-768x1024.jpg","c":"Petit abri 2 pans en ossature, bardage autoclave vert, porte simple semi-vitrée à petits bois, fenêtre à volet et jardinière","k":"abri","t":"2PANS","i":272,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","mortaisee","semi"]],"fe":[["classique","bois"]],"g":false,"L":1.8,"P":2.0,"ta":"petit","q":"bonne"},{"p":"2024/06/IMG_9366-768x576.jpg","c":"Garage 2 pans en ossature, bardage autoclave vert, grandes portes battantes doubles en planches à pentures noires","k":"garage","t":"2PANS","i":273,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","pg":"autre","g":false,"ta":"grand","q":"bonne","gr":168},{"p":"2024/06/IMG_0859-2-768x576.jpeg","c":"Garage triple toit plat en ossature, bardage autoclave vert, trois portes basculantes métalliques anthracite","k":"garage","t":"TOIT_PLAT","i":274,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","pg":"metal","ta":"tres_grand","q":"bonne"},{"p":"2024/06/Abri_jardin_BRUYERES_autoclave_15x35auvent_1A-768x1154.jpg","c":"Abri 1 pan adossé à la maison, bardage autoclave vert, fenêtre à volets et jardinière, auvent sur plancher en bout pour ranger les vélos","k":"abri","t":"1PAN","i":275,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"moyen","q":"moyenne"},{"p":"2024/06/IMG_7736-768x530.jpg","c":"Carport 2 places toit plat, quatre poteaux bois avec jambes de force, bandeau pin autoclave vert vertical ajouré","k":"carport","t":"TOIT_PLAT","i":276,"b":"ps_vert_ajoure","bd":"v","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"ps_vert_ajoure","fermeture":"aucune"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"bonne","gr":178},{"p":"2024/06/IMG_9141-768x432.jpg","c":"Carport toit plat à poteaux métal anthracite, bandeau lisse anthracite, charpente bois apparente, fond fermé en lames horizontales brunes","k":"carport","t":"TOIT_PLAT","i":278,"b":"sr_brun","bd":"h","te":"brun","cv":"invisible","cp":{"pot":"alu","ados":false,"bandeau":"autre","fermeture":"fond"},"ta":"tres_grand","q":"moyenne","v":"partielle","gr":278},{"p":"2024/06/IMG_9142-768x432.jpg","c":"Carport 2 places toit plat, poteaux métal anthracite, bandeau lisse anthracite, charpente bois apparente en sous-face","k":"carport","t":"TOIT_PLAT","i":279,"b":"sr_brun","bd":"h","te":"miel","cv":"invisible","cp":{"pot":"alu","ados":false,"bandeau":"autre","fermeture":"fond"},"ta":"tres_grand","q":"bonne","gr":278},{"p":"2025/01/IMG_2058-768x551.jpeg","c":"Abri cube QUADRO en ossature, bardage Ayous vertical à lames alternées, deux fenêtres verticales","k":"abri","t":"QUADRO","i":280,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","fe":[["verticale","alu"],["verticale","alu"]],"ex":{"f":"mixte","pl":false},"g":true,"ta":"grand","q":"bonne","gr":183},{"p":"2025/01/IMG_2059-768x576.jpeg","c":"Abri cube QUADRO en ossature, bardage Ayous vertical à lames alternées, bûcher intégré ouvert sur un côté","k":"abri","t":"QUADRO","i":281,"s":"ossature","b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","ex":{"f":"mixte","pl":false},"ta":"grand","q":"bonne","gr":183},{"p":"2025/04/IMG_0060-rotated.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert, porte simple pleine, fenêtre à petits bois et volets, rive festonnée","k":"abri","t":"1PAN","i":282,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.2,"P":2.5,"ta":"moyen","q":"moyenne"},{"p":"2025/04/IMG-0056-002-768x576.jpg","c":"Carport 2 places toit plat, poteaux bois avec jambes de force, bandeau en lames horizontales pin autoclave vert, deux panneaux claustra au fond","k":"carport","t":"TOIT_PLAT","i":283,"b":"autre","bd":"h","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"clin","fermeture":"fond"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"bonne"},{"p":"2025/04/ISOLA-1-pente-rotated.jpg","c":"Abri 1 pan en ossature, bardage autoclave vert, porte simple pleine, fenêtre à petits bois et volets, rive festonnée","k":"abri","t":"1PAN","i":284,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"shingle_n","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"g":false,"L":2.2,"P":2.5,"ta":"moyen","q":"moyenne"},{"p":"2025/05/IMG_9484-768x1061.jpeg","c":"Petit abri toit plat en ossature, bardage autoclave vert horizontal, bandeau de toit débordant","k":"abri","t":"TOIT_PLAT","i":285,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","cv":"invisible","g":false,"ta":"petit","q":"bonne","gr":192},{"p":"2025/09/DSC01300-768x296.jpg","c":"Abri 2 pans en madriers, porte double pleine, fenêtre à petits bois et volets, couverture tuiles rouges","k":"abri","t":"2PANS","i":287,"s":"madrier","b":"madrier","bd":"h","te":"vert","cv":"tuile_r","po":[["double","z","pleine"]],"fe":[["classique","bois"]],"g":false,"ta":"moyen","q":"moyenne","gr":52},{"p":"2025/09/20250120_171625-768x576.jpg","c":"Carport 2 places toit plat en Ayous vertical à lames alternées, poteaux habillés, local fermé accolé à droite","k":"carport","t":"QUADRO","i":288,"b":"ayous_alea","bd":"v","te":"ayous","cv":"invisible","g":true,"cp":{"pot":"bois","ados":false,"bandeau":"ayous_alea","fermeture":"un_cote"},"ta":"tres_grand","q":"moyenne"},{"p":"2025/09/IMG_7735-768x251.jpg","c":"Carport 2 places toit plat, poteaux bois avec jambes de force, bandeau pin autoclave vert vertical ajouré","k":"carport","t":"TOIT_PLAT","i":289,"b":"ps_vert_ajoure","bd":"v","te":"vert","cv":"invisible","cp":{"pot":"bois","ados":false,"bandeau":"ps_vert_ajoure","fermeture":"aucune"},"L":6.0,"P":5.0,"ta":"tres_grand","q":"moyenne","gr":178},{"p":"2025/10/IMG_7796-768x432.jpg","c":"Abri toit plat en ossature, bardage vertical gris, porte contemporaine vitrée, auvent avant sur deux poteaux couvrant une terrasse","k":"abri","t":"TOIT_PLAT","i":290,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"ex":{"f":"ouverte","pl":false},"g":false,"ta":"grand","q":"bonne"},{"p":"2026/04/BRUYERES-300-C-1-935x1024-768x841.jpg","c":"Abri 1 pan adossé à la maison, bardage autoclave vert, porte simple pleine en pignon, fenêtre à volets et jardinière","k":"abri","t":"1PAN","i":291,"s":"ossature","b":"sr_vert","bd":"h","te":"vert","po":[["simple","z","pleine"]],"fe":[["classique","bois"]],"ex":{"f":"ouverte","pl":true},"g":false,"ta":"moyen","q":"moyenne"},{"p":"2026/04/IMG_22171.jpeg","c":"Abri cube QUADRO en ossature, bardage vertical ajouré gris, porte contemporaine vitrée, marche-terrasse en bois","k":"abri","t":"QUADRO","i":293,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"ta":"moyen","q":"bonne"},{"p":"2026/04/Abri-de-jardin-BARBIZON-941x1024-768x836.jpg","c":"Abri toit plat en ossature, bardage Ayous horizontal, porte bardée, fenêtre bois à volet coulissant bardé","k":"abri","t":"TOIT_PLAT","i":294,"s":"ossature","b":"ayous125","bd":"h","te":"ayous","cv":"invisible","po":[["simple","bardee","pleine"]],"fe":[["contemporaine","bois"]],"g":false,"L":3.0,"P":2.0,"ta":"moyen","q":"bonne"},{"p":"2026/04/IMG_9529-768x1024.jpeg","c":"Abri cube QUADRO en ossature, bardage vertical ajouré gris, petite fenêtre bois, auvent ouvert sur deux poteaux à droite","k":"abri","t":"QUADRO","i":295,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","bardee","pleine"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"bonne","gr":295},{"p":"2026/04/IMG_9531-768x576.jpeg","c":"Abri cube QUADRO en ossature, bardage vertical ajouré gris, auvent ouvert sur poteaux avec fond en lames verticales brunes","k":"abri","t":"QUADRO","i":296,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","ex":{"f":"ouverte","pl":false},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"bonne","gr":295},{"p":"2026/04/IMG_9530-768x1024.jpeg","c":"Abri cube QUADRO en ossature, bardage vertical ajouré gris, petite fenêtre bois, auvent ouvert sur deux poteaux à droite","k":"abri","t":"QUADRO","i":297,"s":"ossature","b":"srn_gris","bd":"v","te":"gris","cv":"invisible","po":[["simple","bardee","pleine"]],"fe":[["contemporaine","bois"]],"ex":{"f":"ouverte","pl":false},"g":false,"L":5.0,"P":2.5,"ta":"grand","q":"bonne","gr":295},{"p":"2026/04/IMG_6034-768x576.jpeg","c":"Abri cube QUADRO, bardage bac acier anthracite à joints verticaux, porte contemporaine vitrée","k":"abri","t":"QUADRO","i":302,"s":"ossature","b":"autre","bd":"v","te":"noir","cv":"invisible","po":[["simple","contemporaine","vitree"]],"g":false,"L":3.0,"P":3.0,"ta":"moyen","q":"bonne","gr":206}];
  REAL.forEach(function (r) { r.p = '/wp-content/uploads/' + r.p; if (r.u) r.u = '/produit/' + r.u; });
  if (!M) return;

  var form = null;
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var fr = function (v, d) { return (Math.round(v * 100) / 100).toFixed(d == null ? 2 : d).replace('.', ','); };

  // ── Lecture du formulaire (champs visibles seulement, comme ce que le site retient) ──
  function nm(fid, suf) { return 'wapf[field_' + fid + (suf || '') + ']'; }
  function els(fid, suf) {
    var n = nm(fid, suf);
    return Array.prototype.filter.call(form.querySelectorAll('[name="' + n + '"],[name="' + n + '[]"]'), function (e) {
      return !e.disabled && e.type !== 'hidden' && !e.closest('.wapf-hide');
    });
  }
  function choices(fid, suf) {
    var out = [];
    els(fid, suf).forEach(function (e) {
      if (e.tagName === 'SELECT') {
        var o = e.options[e.selectedIndex];
        if (o && o.value) out.push({ label: o.text.trim(), price: o.getAttribute('data-wapf-price') || '', value: o.value });
      } else if ((e.type === 'radio' || e.type === 'checkbox') && e.checked) {
        out.push({ label: e.getAttribute('data-wapf-label') || '', price: e.getAttribute('data-wapf-price') || '', value: e.value });
      }
    });
    return out;
  }
  function choice(fid, suf) { return choices(fid, suf)[0] || null; }
  function first(list, suf) { for (var i = 0; i < (list || []).length; i++) { var c = choice(list[i], suf); if (c) return c; } return null; }
  function num(fid, suf) {
    var e = els(fid, suf).filter(function (x) { return x.type === 'number' || x.type === 'text'; })[0];
    if (!e) return null;
    var v = parseFloat(String(e.value).replace(',', '.'));
    return isNaN(v) ? null : v;
  }
  function yes(fid) { var c = choice(fid); return !!c && /^oui/i.test(c.label); }
  function dim(D) { // dimension choisie : liste, ou saisie sur mesure
    var sm = choice(D.sm);
    if (sm && /^oui/i.test(sm.label)) return num(D.num);
    var c = choice(D.sel);
    var v = c ? parseFloat(String(c.label).replace(',', '.')) : NaN;
    return isNaN(v) ? null : v;
  }

  // ── Traduction des libellés du site vers les réglages du moteur ──
  var T = {
    toit: function (l) { return /1 PAN/i.test(l) ? '1PAN' : /2 PANS/i.test(l) ? '2PANS' : /TOIT PLAT/i.test(l) ? 'TOIT_PLAT' : /QUADRO/i.test(l) ? 'QUADRO' : null; },
    orient: function (l) { return /fond/i.test(l) ? 'fond' : /droite/i.test(l) ? 'droite' : /gauche/i.test(l) ? 'gauche' : /avant/i.test(l) ? 'face' : null; },
    pente: function (l) { var m = /(\d+)\s*°/.exec(l || ''); return m ? m[1] : null; },
    bard: function (l) {
      return /Dibond/i.test(l) ? 'dibond' : /SRN|gris/i.test(l) ? 'srn_gris' : /Douglas/i.test(l) ? 'douglas_noir'
        : /21x45|aléatoire/i.test(l) ? 'ayous_alea' : /Ayous/i.test(l) ? 'ayous125' : /brun/i.test(l) ? 'sr_brun' : 'sr_vert';
    },
    couv: function (l) {
      return /EPDM/i.test(l) ? 'epdm' : /Shingle Noir/i.test(l) ? 'shingle_n' : /Shingle brun/i.test(l) ? 'shingle_b' : /Shingle vert/i.test(l) ? 'shingle_v'
        : /tuiles?.*Rou|Prêt pour tuiles/i.test(l) ? 'tuile_r' : /tuiles?/i.test(l) ? 'tuile_g' : 'bac';
    },
    plan: function (l) { return !l || /^non/i.test(l) ? 'non' : /pin/i.test(l) ? 'pin21' : /21\s*mm/i.test(l) ? 'epicea21iso' : 'epicea15'; },
    pot: function (l) { return /19/.test(l) ? 0.19 : /14/.test(l) ? 0.14 : /aluminium 15/i.test(l) ? 0.15 : 0.12; },
    // bandeaux du carport (options du site) : bac acier, ajouré gris 20×70, ajouré vert 20×60, Ayous aléatoire 21×45 / 21×90
    bandeau: function (l) { return /bac acier|métallique/i.test(l) ? 'bac_bandeau' : /Ayou/i.test(l) ? 'ayous_alea' : /gris/i.test(l) ? 'srn_gris' : /ajour/i.test(l) ? 'ps_vert_ajoure' : /vertical/i.test(l) ? 'sr_vert_v' : 'sr_vert'; },
    remplissage: function (l) { return /ajour/i.test(l) ? 'ajouree' : /clin/i.test(l) ? 'clin' : 'ossature'; }
  };
  // Code de prix du site → menuiserie du catalogue du moteur (même codes ; « vitrée » du site = 3/4 vitrée)
  var CODE2P = {};
  E.MPRESETS.forEach(function (p) { if (p.sku) CODE2P[p.sku] = p; });
  CODE2P.PBSV = CODE2P.PBSV34; CODE2P.PBDV = CODE2P.PBDV34;
  function codeOf(c) { var m = /menuiseries;\s*([A-Za-z0-9]+)/.exec((c && c.price) || ''); return m ? m[1] : null; }

  // ── Placement des menuiseries : automatique, ajustable par le client (mémorisé par menuiserie) ──
  var PLACE = {};   // clé (suffixe WAPF) → { wall, pos, rail, auto:false }
  var adosSide = 'gauche';

  function suffixes(fid) {
    var s = {}, re = new RegExp('^wapf\\[field_' + fid + '(_clone_\\d+)?\\]');
    Array.prototype.forEach.call(form.querySelectorAll('[name^="wapf[field_' + fid + '"]'), function (e) {
      var m = re.exec(e.name);
      if (m && !e.closest('.wapf-hide')) s[m[1] || ''] = 1;
    });
    return Object.keys(s).sort(function (a, b) { return (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0); });
  }

  function readMenus(d, cfg) {
    var out = [], gdoor = null;
    if (!M.men) return { menus: out, gdoor: gdoor };
    suffixes(M.men.type).forEach(function (suf) {
      var ty = choice(M.men.type, suf);
      if (!ty) return;
      if (M.men.garage && /garage/i.test(ty.label)) {
        var g = choice(M.men.garage, suf), gc = codeOf(g);
        if (gc && !gdoor) gdoor = { code: gc, label: g.label };
        return;
      }
      var c = first(M.men.specific, suf), code = codeOf(c), p = code && CODE2P[code];
      if (!p) return;
      var o = first(M.men.opt, suf);
      var optCode = o ? (/lookuptable\(menuiseries;\s*([A-Za-z0-9]+)/.exec(o.price) || [])[1] : '';
      if (optCode === 'SV') optCode = '';
      out.push({ key: suf || 'm0', preset: p.id, label: p.label, siteLabel: c.label, type: p.type, lw: p.lw, lh: p.lh, img: p.img || '', opt: optCode || '', code: code });
    });
    return { menus: out, gdoor: gdoor };
  }

  // Pose automatique : portes en façade puis côtés ; fenêtres réparties ; rien qui chevauche
  function autoPlace(list, d, gW) {
    var walls = ST.type === 'carport' ? E.closList().slice() : ['face', 'gauche', 'droite', 'fond'];
    var len = function (w) { return (w === 'face' || w === 'fond') ? d.L * 100 : d.P * 100; };
    var used = {};
    walls.forEach(function (w) { used[w] = []; });
    if (gW && used.face) used.face.push([d.L * 50 - gW / 2 - 10, d.L * 50 + gW / 2 + 10]);
    var fits = function (w, a, b) { return a >= 10 && b <= len(w) - 10 && used[w].every(function (u) { return b <= u[0] || a >= u[1]; }); };
    list.forEach(function (m) { // les menuiseries placées par le client occupent déjà leur place
      var pl = PLACE[m.key]; if (!pl || pl.auto || !used[pl.wall]) return;
      var c = pl.pos / 100 * len(pl.wall), z = E.isSliding(m) && !E.isDoubleM(m) ? m.lw : 0, dr = pl.rail === 'droite';
      used[pl.wall].push([c - m.lw / 2 - 15 - (dr ? 0 : z), c + m.lw / 2 + 15 + (dr ? z : 0)]);
    });
    var order = list.slice().sort(function (a, b) { return (a.type === 'porte' ? 0 : 1) - (b.type === 'porte' ? 0 : 1); });
    order.forEach(function (m) {
      var pl = PLACE[m.key];
      if (pl && !pl.auto) return;
      var pref = m.type === 'porte' ? ['face', 'gauche', 'droite', 'fond'] : ['face', 'gauche', 'droite', 'fond'];
      var done = false;
      for (var i = 0; i < pref.length && !done; i++) {
        var w = pref[i];
        if (!used[w]) continue;
        var L = len(w), cands = [0.5, 0.25, 0.75, 0.15, 0.85, 0.35, 0.65];
        for (var j = 0; j < cands.length && !done; j++) {
          var c = cands[j] * L, a = c - m.lw / 2 - 15, b = c + m.lw / 2 + 15;
          var zone = E.isSliding(m) ? m.lw : 0; // une coulissante a besoin de la place pour s'ouvrir
          if (fits(w, a - zone, b)) { used[w].push([a - zone, b]); PLACE[m.key] = { wall: w, pos: Math.round(c / L * 100), rail: 'gauche', auto: true }; done = true; }
        }
      }
      if (!done) PLACE[m.key] = { wall: walls[0] || 'face', pos: 50, rail: 'gauche', auto: true };
    });
  }
  // Règle d'Antony (13/10/2026) : deux menuiseries ne se chevauchent jamais, porte de garage comprise.
  // Mur par mur : largeur + 10 cm de jeu de chaque côté (donc 10 cm au moins des angles), plus la course d'une coulissante.
  // Celle que le client déplace garde sa place ; les autres glissent à la place libre la plus proche, sinon passent sur un autre mur.
  var ACTIF = null, SANS_PLACE = [], NOTE_PLACE = '';
  var WLAB = { face: 'la façade', gauche: 'le côté gauche', droite: 'le côté droit', fond: 'le fond' };
  function separer(list, d, gW) {
    var walls = ST.type === 'carport' ? E.closList().slice() : ['face', 'gauche', 'droite', 'fond'];
    SANS_PLACE = []; NOTE_PLACE = '';
    if (!walls.length) return;
    var len = function (w) { return (w === 'face' || w === 'fond') ? d.L * 100 : d.P * 100; };
    var used = {}; walls.forEach(function (w) { used[w] = []; });
    if (gW && used.face) used.face.push([d.L * 50 - gW / 2 - 10, d.L * 50 + gW / 2 + 10]);
    var span = function (m, pl, c) {
      var z = E.isSliding(m) && !E.isDoubleM(m) ? m.lw : 0, dr = pl.rail === 'droite';
      return [c - m.lw / 2 - 10 - (dr ? 0 : z), c + m.lw / 2 + 10 + (dr ? z : 0)];
    };
    // 0,5 cm de tolérance : la position est gardée au dixième de %, une porte calée à 10 cm de l'angle ne doit pas être repoussée pour 0,05 cm
    var libre = function (w, sp) { return sp[0] >= -0.5 && sp[1] <= len(w) + 0.5 && used[w].every(function (u) { return sp[1] <= u[0] + 0.5 || sp[0] >= u[1] - 0.5; }); };
    var rang = function (m) { var pl = PLACE[m.key] || {}; return m.key === ACTIF ? 0 : (pl.auto ? 2 : 1); };
    // Tassement (remarque d'Antony, 13/10/2026 : porte de 80 + fenêtre de 53,5 sur 2 m « ça passe largement ») : quand une menuiserie posée
    // d'office ne trouve plus de place, les menuiseries posées d'office sur ce mur sont rangées côte à côte, à intervalles égaux ;
    // jamais si le client a placé lui-même quelque chose sur ce mur, ni sur la façade d'un garage (porte de garage)
    var poses = {}; walls.forEach(function (w) { poses[w] = []; });
    var tasser = function (w, m, pl) {
      if (gW && w === 'face') return false;
      var lot = poses[w].concat([{ m: m, pl: pl }]); if (lot.some(function (e) { return !e.pl.auto || e.m.key === ACTIF; })) return false;
      var lg = lot.map(function (e) { var s = span(e.m, e.pl, 0); return s[1] - s[0]; }), reste = len(w) - lg.reduce(function (a, b) { return a + b; }, 0);
      if (reste < 0) return false;
      lot.sort(function (a, b) { return (a.m.type === 'porte' ? 0 : 1) - (b.m.type === 'porte' ? 0 : 1); }); // la porte d'abord, à gauche
      lg = lot.map(function (e) { var s = span(e.m, e.pl, 0); return s[1] - s[0]; });
      var gap = reste / (lot.length + 1), x = 0; used[w] = [];
      lot.forEach(function (e, k) { x += gap; var s0 = span(e.m, e.pl, 0), c = x - s0[0]; e.pl.wall = w; e.pl.pos = Math.round(c / len(w) * 1000) / 10; used[w].push(span(e.m, e.pl, c)); x += lg[k]; });
      poses[w] = lot; return true;
    };
    list.slice().sort(function (a, b) { return rang(a) - rang(b); }).forEach(function (m) {
      var pl = PLACE[m.key] || (PLACE[m.key] = { wall: walls[0], pos: 50, rail: 'gauche', auto: true });
      if (walls.indexOf(pl.wall) < 0) pl.wall = walls[0];
      var essais = [pl.wall].concat(walls.filter(function (w) { return w !== pl.wall; }));
      for (var i = 0; i < essais.length; i++) {
        var w = essais[i], L = len(w), c0 = i === 0 ? pl.pos / 100 * L : L / 2;
        for (var dl = 0; dl <= L; dl += 2) {
          var cs = dl ? [c0 + dl, c0 - dl] : [c0];
          for (var j = 0; j < cs.length; j++) {
            var sp = span(m, pl, cs[j]);
            if (libre(w, sp)) {
              poses[w].push({ m: m, pl: pl });
              if (m.key === ACTIF && i > 0) NOTE_PLACE = (m.siteLabel || m.label) + ' : pas assez de place sur ' + WLAB[pl.wall] + (E.isSliding(m) && !E.isDoubleM(m) ? ' (course de la coulissante comprise)' : '') + ', elle est placée sur ' + WLAB[w] + '.';
              used[w].push(sp); pl.wall = w; pl.pos = Math.round(cs[j] / L * 1000) / 10; return;
            }
          }
        }
        if (i === 0 && pl.auto && tasser(w, m, pl)) return; // sur son mur, en rangeant les autres posées d'office
      }
      SANS_PLACE.push(m.siteLabel || m.label);
    });
  }

  // ── Cotes du site (mêmes formules que le configurateur) ──
  function siteDims(s) {
    var o = {};
    if (CFG.kind === 'carport') {
      var ados = s.ados !== 'non';
      o.L = r2(s.Lr - (ados ? 0.2 : 0.4)); o.P = r2(s.Pr - (ados ? 0.2 : 0.4));
      o.intL = r2(o.L - s.sec * (ados ? 1 : 2)); o.intP = r2(o.P - s.sec * (ados ? 1 : 2));
      o.hInt = s.hRehausse || 2.1;
      o.htL = s.Lr; o.htP = s.Pr;
      var espL = (s.espL === 6 || s.toit === '2PANS' || s.toit === '1PAN') ? 6 : 4, espP = s.espP === 6 ? 6 : 4;
      o.nCols = Math.ceil(s.Lr / espL) + (ados ? 0 : 1); o.nRows = Math.ceil(s.Pr / espP) + 1; o.nPosts = o.nCols * o.nRows;
      o.ov = ados ? { L: s.ados === 'gauche' ? 0 : 0.2, R: s.ados === 'droite' ? 0 : 0.2, F: 0.1, B: 0.1 } : { L: 0.2, R: 0.2, F: 0.2, B: 0.2 };
      return o;
    }
    var madrier = s.sys !== 'ossature', tp = s.toit === 'TOIT_PLAT';
    o.L = tp && madrier ? r2(s.Lr - 0.17) : s.Lr; o.P = tp && madrier ? r2(s.Pr - 0.17) : s.Pr;
    var wt = s.sys === 'madrier28' ? 0.028 : s.sys === 'madrier45' ? 0.045 : 0.07;
    o.intL = r2(o.L - 2 * wt); o.intP = r2(o.P - 2 * wt);
    var eL = s.ext.gauche + s.ext.droite, eP = s.ext.face + s.ext.fond;
    var ht = function (base, e) {
      if (tp) return r2((madrier ? base + e - 0.17 + 0.2 : base + e + 0.2) + 0.056);
      if (s.toit === '1PAN' || s.toit === '2PANS') return r2(base + e + 0.2 + 0.056);
      return r2(base + e); // QUADRO
    };
    o.htL = ht(s.Lr, eL); o.htP = ht(s.Pr, eP);
    // Formule du site (hauteur_interieur) : la règle QUADRO s'applique avant celle de l'ossature (le QUADRO ne pose pas la question du système)
    var base = s.toit === 'QUADRO' ? 2.12 : (s.sys === 'ossature' ? 2 : 2.08);
    var nReh = s.reh || 0;
    o.hInt = r2((CFG.kind === 'garage' ? (nReh + 2) * 0.13 : nReh * 0.13) + base);
    var stdL = Math.max(0, (o.htL - o.L - eL) / 2), stdP = Math.max(0, (o.htP - o.P - eP) / 2);
    o.ov = { L: stdL + s.ext.gauche, R: stdL + s.ext.droite, F: stdP + s.ext.face, B: stdP + s.ext.fond };
    return o;
  }

  // ── Lecture complète → état du moteur ──
  var LAST = null;
  function read() {
    var s = { Lr: dim(M.lar), Pr: dim(M.pro) };
    if (!s.Lr || !s.Pr) return null;
    var toitC = first(M.toit); s.toit = toitC ? T.toit(toitC.label) : (CFG.kind === 'carport' ? '2PANS' : '2PANS');
    var oc = first(M.orient); s.orient = (oc && T.orient(oc.label)) || 'droite';
    var pc = first(M.pente); s.pente = (pc && T.pente(pc.label)) || '18';
    var cfg = { 'f-rendu': 'real', 'f-lar': String(Math.round(s.Lr * 100)), 'f-pro': String(Math.round(s.Pr * 100)), 'f-toit': s.toit, 'f-orient': s.orient,
      'f-pente': s.pente, 'f-df': '0', 'f-db': '0', 'f-dl': '0', 'f-dr': '0', 'f-gout': 'non', 'f-plan': 'non', 'f-iso': 'non', 'f-reh': '0',
      'f-couv': 'bac', 'f-bard': 'sr_vert', 'f-ext-ferm': 'non', 'f-ext-plan': 'non', 'f-clos': 'aucune', 'f-ados': 'non', 'f-pot': '0.12', 'f-esp': '4',
      'f-pgtype': 'PGM', 'f-pglw': '237', 'f-pglh': '200', 'f-sys': 'madrier28', 'f-clos-type': '', 'f-bandeau': '', 'f-espL': '' };
    var cv = first(M.couv); if (cv) cfg['f-couv'] = T.couv(cv.label);
    var CHOIX = { couv: !!cv }; // options réellement choisies : les autres gardent la valeur par défaut du dessin
    // Sous-face vue d'en dessous (carport) : planchettes, OSB (EPDM), feutre anti-condensation ou bac acier nu
    // (règle d'Antony, 13/10/2026 : le shingle a toujours sa sous-face en planchettes de pin autoclave ; le bac acier seul montre la charpente et les tôles)
    cfg['f-sousface'] = cv ? (/planchette|shingle/i.test(cv.label) ? 'planchette' : /OSB/i.test(cv.label) ? 'osb' : /feutre/i.test(cv.label) ? 'feutre' : 'non') : '';
    var gt = first(M.gout); if (gt && /^oui/i.test(gt.label)) cfg['f-gout'] = 'oui';
    ST.ext = {};
    if (CFG.kind === 'carport') {
      var ad = first(M.ados); s.ados = ad && /adoss/i.test(ad.label) ? adosSide : 'non'; cfg['f-ados'] = s.ados;
      var po = first(M.pot); s.sec = po ? T.pot(po.label) : 0.12; cfg['f-pot'] = String(s.sec); CHOIX.pot = !!po; CHOIX.ados = !!ad;
      cfg['f-potalu'] = po && /alu/i.test(po.label) ? 'oui' : 'non'; // poteau alu ou bois capoté alu : noir
      var eL = first(M.espL), eP = first(M.espP); s.espL = eL && /6/.test(eL.label) ? 6 : 4; s.espP = eP && /6/.test(eP.label) ? 6 : 4;
      cfg['f-esp'] = String(s.espP); cfg['f-espL'] = String(s.espL);
      if (yes(M.reh.q)) { for (var i = 0; i < M.reh.n.length; i++) { var h = num(M.reh.n[i]); if (h) { s.hRehausse = h; break; } } }
      if (yes(M.clos.q)) {
        var sides = choices(M.clos.sides).map(function (c) { return c.label.toLowerCase(); }).filter(function (x) { return x === 'gauche' || x === 'droite' || x === 'fond'; });
        if (sides.length) cfg['f-clos'] = sides.join('+');
        var ty = first(M.clos.type); cfg['f-clos-type'] = ty ? T.remplissage(ty.label) : '';
      }
      var bd = first(M.bandeau); if (bd) cfg['f-bandeau'] = T.bandeau(bd.label);
      // Pieds de poteaux : plots béton, pieds galva à visser (réglables ou non), à sceller ; sinon platine
      var sp = first(M.supp);
      // plots béton seuls, pieds galva seuls, ou les deux (« Plots béton + pieds galva à sceller »… choix d'Antony du 13/10/2026)
      cfg['f-supp'] = !sp || /^non/i.test(sp.label) ? 'non' : /r[ée]glable/i.test(sp.label) ? 'reglable' : /scell/i.test(sp.label) ? 'scelle' : /visser/i.test(sp.label) ? 'visser' : /b[ée]ton/i.test(sp.label) ? 'plot' : 'visser';
      cfg['f-plot'] = sp && /b[ée]ton/i.test(sp.label) ? 'oui' : 'non';
      s.ext = { face: 0, fond: 0, gauche: 0, droite: 0 };
    } else {
      var sy = first(M.sys), ep = first(M.ep);
      // Le QUADRO est toujours en ossature bois (le site ne pose pas la question : système constructif = 2 dans ses formules)
      s.sys = s.toit === 'QUADRO' || (sy && /ossature/i.test(sy.label)) ? 'ossature' : (ep && /45/.test(ep.label) ? 'madrier45' : 'madrier28');
      cfg['f-sys'] = s.sys; CHOIX.sys = !!sy || s.toit === 'QUADRO';
      var bd2 = first(M.bard); if (bd2) cfg['f-bard'] = T.bard(bd2.label); CHOIX.bard = !!bd2;
      s.reh = yes(M.reh.q) ? (num(M.reh.n) || 0) : 0; cfg['f-reh'] = String(s.reh);
      var pl = first(M.plan); cfg['f-plan'] = pl ? T.plan(pl.label) : 'non';
      // Pignon (classique / biseauté), profilés alu d'angle, soubassement parpaing (+20 cm)
      var pg = first(M.pign); cfg['f-pignon'] = pg && /biseau/i.test(pg.label) ? 'biseaute' : 'classique';
      cfg['f-profu'] = yes(M.profu[0]) ? 'oui' : 'non';
      cfg['f-soub'] = yes(M.soub[0]) ? 'oui' : 'non';
      // Intérieur de l'ossature (vue 3D) : pare-pluie, isolation entre montants et finition intérieure, isolation de toiture
      var ppc = M.pp && first(M.pp); cfg['f-pp'] = ppc && /^oui/i.test(ppc.label) ? 'oui' : 'non';
      var isc = M.isom && first(M.isom), isl = isc ? isc.label : '';
      cfg['f-isom'] = !isc || /^non/i.test(isl) ? 'non' : /OSB/i.test(isl) ? 'osb' : /contreplaqu|peupl/i.test(isl) ? 'cp' : /sapin/i.test(isl) ? 'sapin' : 'laine';
      var itc = M.isot && first(M.isot); cfg['f-isot'] = itc && !/^non/i.test(itc.label) ? 'oui' : 'non';
      s.ext = { face: 0, fond: 0, gauche: 0, droite: 0 };
      if (yes(M.ext.q)) {
        ['face', 'fond', 'gauche', 'droite'].forEach(function (k) { s.ext[k] = num(M.ext.m[k]) || 0; });
        var typeR = first(M.ext.type), anyR = false;
        ['face', 'fond', 'gauche', 'droite'].forEach(function (k) {
          if (!s.ext[k] || !yes(M.ext.rq[k])) return;
          var cs = choices(M.ext.rs[k]).map(function (c) { return c.label.toLowerCase(); });
          // flancs a / b et bout c, comme dans le générateur
          var flanks = (k === 'droite' || k === 'gauche') ? ['face', 'fond'] : ['gauche', 'droite'];
          ST.ext[k] = { a: cs.indexOf(flanks[0]) >= 0, b: cs.indexOf(flanks[1]) >= 0, c: cs.indexOf(k) >= 0 };
          anyR = true;
        });
        if (anyR) cfg['f-ext-ferm'] = typeR ? (T.remplissage(typeR.label) === 'ajouree' ? 'ajouree' : 'pleine') : 'pleine';
        if (M.pext && yes(M.pext.q)) cfg['f-ext-plan'] = 'oui';
      }
    }
    ST.type = CFG.kind; ST.cfg = cfg; ST.site = null;
    // dimensions de base pour placer les menuiseries
    s.site = siteDims(s); ST.site = s.site;
    var d = E.calcDims();
    var men = readMenus(d, cfg), gW = 0;
    if (men.gdoor) { cfg['f-pgtype'] = men.gdoor.code; gW = 237; }
    var keys = {};
    men.menus.forEach(function (m) { keys[m.key] = 1; });
    Object.keys(PLACE).forEach(function (k) { if (!keys[k]) delete PLACE[k]; });
    // garage : la porte de garage est toujours dessinée au milieu de la façade, sa place est toujours réservée
    var gRes = CFG.kind === 'garage' ? (gW || parseFloat(cfg['f-pglw']) || 237) : 0;
    autoPlace(men.menus, d, gRes);
    separer(men.menus, d, gRes);
    // Hauteur des fenêtres (règle d'Antony) : haut à 8 cm sous le haut du mur, réglable par le client ; une fenêtre placée sous la course
    // d'une porte coulissante du même mur passe sous le rail (posé au-dessus de la porte, sur toute la course)
    var wallLen = function (w) { return (w === 'face' || w === 'fond') ? d.L : d.P; };
    var PL0 = men.menus.map(function (m) { return PLACE[m.key] || { wall: 'face', pos: 50, rail: 'gauche' }; });
    var hMur = Math.round(d.hInt * 100);
    ST.menus = men.menus.map(function (m, i) {
      var pl = PL0[i], seuil = 0, sousRail = false, seuilMax = 0;
      if (m.type === 'fenetre') {
        var haut = hMur - 8, c = pl.pos / 100 * wallLen(pl.wall) * 100, a = c - m.lw / 2, b = c + m.lw / 2;
        men.menus.forEach(function (o, j) {
          if (j === i || PL0[j].wall !== pl.wall || o.type === 'fenetre' || !E.isSliding(o)) return;
          var dc = PL0[j].pos / 100 * wallLen(pl.wall) * 100, lw = o.lw, r = PL0[j].rail || 'gauche', ra, rb;
          if (E.isDoubleM(o)) { ra = dc - lw; rb = dc + lw; } else if (r === 'droite') { ra = dc - lw / 2; rb = dc + 1.5 * lw; } else { ra = dc - 1.5 * lw; rb = dc + lw / 2; }
          if (b > ra && a < rb && o.lh - 3 < haut) { haut = o.lh - 3; sousRail = true; }
        });
        seuilMax = Math.max(0, hMur - 2 - m.lh);
        seuil = Math.max(0, Math.min(seuilMax, sousRail ? haut - m.lh : Math.max(20, Math.min(100, haut - m.lh))));
        if (pl.seuil != null) seuil = Math.max(0, Math.min(seuilMax, pl.seuil));
      }
      return { id: i + 1, key: m.key, preset: m.preset, label: m.label, siteLabel: m.siteLabel, type: m.type, lw: m.lw, lh: m.lh, img: m.img, opt: m.opt,
        wall: pl.wall, pos: pl.pos, rail: pl.rail || 'gauche', seuil: seuil, seuilMax: seuilMax, sousRail: sousRail, code: m.code };
    });
    LAST = { s: s, d: d, gdoor: men.gdoor, choix: CHOIX };
    return LAST;
  }

  // ── Panneau ──
  var P = null, VIEW = 'face', VIEWS = [['face', 'Façade'], ['gauche', 'Gauche'], ['droite', 'Droite'], ['fond', 'Fond'], ['plan', 'Plan']];
  var NOUN = { abri: 'abri', garage: 'garage', carport: 'carport' }[CFG.kind];
  var DOCK = window.matchMedia('(max-width: 899.98px), (max-width: 1099.98px) and (orientation: portrait)');
  function build() {
    var sum = form.closest('.summary') || form.parentNode;
    document.body.classList.add('cer-plan-on', 'cer-page'); // cer-page : aussi posé par le serveur (body_class) ; cer-hero-on seulement si le nouveau titre est là
    if (document.querySelector('.cer-hero')) document.body.classList.add('cer-hero-on');
    sum.classList.add('cer-plan-grid');
    P = document.createElement('aside');
    P.className = 'cer-plan';
    P.innerHTML =
      '<div class="cer-plan__in">' +
      '<div class="cer-plan__prix" hidden><span>Prix de votre ' + NOUN + '</span><strong></strong></div>' +
      '<div class="cer-plan__head"><div class="cer-plan__heading"><span class="cer-plan__kicker">Votre ' + NOUN + ' sur mesure</span><span class="cer-plan__title"><span class="cer-l">Le plan se dessine avec vos choix</span><span class="cer-s">Votre ' + NOUN + ' en direct</span></span></div>' +
      '<button type="button" class="cer-plan__expand">Agrandir</button><button type="button" class="cer-plan__close" aria-label="Réduire">×</button></div>' +
      // onglets + dessin : bloc qui reste en haut du plein écran (téléphone) pendant qu'on règle les menuiseries juste dessous
      '<div class="cer-plan__vis">' +
      '<div class="cer-plan__tabs" role="tablist">' + VIEWS.map(function (v) { return '<button type="button" role="tab" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>' +
      '<div class="cer-plan__stage"><svg id="cer-sv-main" xmlns="http://www.w3.org/2000/svg"></svg><div class="cer-plan__empty"><svg viewBox="0 0 200 120" aria-hidden="true"><path d="M30 104V54L100 18l70 36v50" fill="none" stroke="#b8b59c" stroke-width="2" stroke-dasharray="5 4"/><path d="M20 58 100 16l80 42" fill="none" stroke="#b8b59c" stroke-width="2.5"/><rect x="86" y="66" width="28" height="38" fill="none" stroke="#b8b59c" stroke-width="2" stroke-dasharray="5 4"/><path d="M10 104h180" stroke="#b8b59c" stroke-width="2"/></svg>Choisissez la largeur et la profondeur : votre ' + NOUN + ' se dessine ici, à l\u2019échelle, puis à chaque choix.</div></div>' +
      '</div>' +
      '<div class="cer-plan__warn"></div>' +
      '<details class="cer-plan__place"><summary>Placer mes portes et fenêtres</summary><div class="cer-plan__places"></div></details>' +
      '<dl class="cer-plan__dims"></dl>' +
      '<div class="cer-plan__real"></div>' +
      '<details class="cer-plan__detail"><summary>Détail de votre configuration</summary><div class="cer-plan__lignes"></div></details>' +
      '<p class="cer-plan__note">Dessin à l\'échelle d\'après votre configuration. Les plans définitifs sont validés avec votre conseiller Abri Cerisier.</p>' +
      '</div>';
    sum.appendChild(P);
    var fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'cer-plan-fab'; fab.textContent = 'Voir mon ' + NOUN;
    document.body.appendChild(fab);
    // Tablette / téléphone : ancré en bas ; × replie en bouton (ou quitte le plein écran) ; « Agrandir » ouvre le plein écran
    var B = document.body;
    fab.addEventListener('click', function () { B.classList.remove('cer-plan-min'); memo(''); draw(); });
    var openPlace = function () { if (ST.menus.length) P.querySelector('.cer-plan__place').open = true; };
    P.querySelector('.cer-plan__expand').addEventListener('click', function () { B.classList.add('cer-plan-open'); P.querySelector('.cer-plan__detail').open = true; openPlace(); draw(); });
    P.querySelector('.cer-plan__close').addEventListener('click', function () {
      if (B.classList.contains('cer-plan-open')) { B.classList.remove('cer-plan-open'); }
      else { B.classList.add('cer-plan-min'); memo('min'); }
    });
    B.classList.add('cer-plan-min'); // replié tant que rien n'est dessiné
    // téléphone / tablette portrait : un appui sur le dessin l'ouvre en plein écran
    var openFull = function () { if (DOCK.matches && !B.classList.contains('cer-plan-open')) { B.classList.add('cer-plan-open'); P.querySelector('.cer-plan__detail').open = true; openPlace(); draw(); } };
    P.querySelector('.cer-plan__stage').addEventListener('click', openFull);
    P.querySelector('.cer-plan__prix').addEventListener('click', openFull);
    // place réservée en bas de page = hauteur réelle du visuel ancré (le bouton « Ajouter au panier » reste accessible)
    var pad = function () { B.style.paddingBottom = (DOCK.matches && !B.classList.contains('cer-plan-min') && !B.classList.contains('cer-plan-open')) ? (P.querySelector('.cer-plan__in').offsetHeight + 16) + 'px' : ''; };
    if (window.ResizeObserver) new ResizeObserver(pad).observe(P.querySelector('.cer-plan__in'));
    new MutationObserver(pad).observe(B, { attributes: true, attributeFilter: ['class'] });
    if (DOCK.addEventListener) DOCK.addEventListener('change', pad);
    P.querySelector('.cer-plan__tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b) return; VIEW = b.getAttribute('data-v'); draw();
    });
    glisser(P.querySelector('#cer-sv-main'));
    P.querySelector('.cer-plan__places').addEventListener('change', onPlace);
    P.querySelector('.cer-plan__real').addEventListener('click', onReal);
    P.querySelector('.cer-plan__places').addEventListener('input', onPlace);
  }
  function memo(v) { try { sessionStorage.setItem('cerPlanDock', v); } catch (e) { } }
  function memoGet() { try { return sessionStorage.getItem('cerPlanDock') || ''; } catch (e) { return ''; } }
  var shownOnce = false;
  function onPlace(e) {
    var row = e.target.closest('[data-k]'); if (!row) return;
    var k = row.getAttribute('data-k'), pl = PLACE[k] || {};
    pl.auto = false; ACTIF = k;
    pl.wall = row.querySelector('.w').value; pl.pos = parseInt(row.querySelector('.p').value, 10) || 50;
    var r = row.querySelector('.r'); if (r) pl.rail = r.value;
    var h = row.querySelector('.h');
    if (h && e.target === h) { // hauteur de la fenêtre réglée par le client
      pl.seuil = parseInt(h.value, 10) || 0;
      var m = ST.menus.filter(function (x) { return x.key === k; })[0], hv = row.querySelector('.hv');
      if (m && hv) hv.textContent = hauteurTxt(pl.seuil, m.lh);
    }
    PLACE[k] = pl;
    schedule(e.type === 'input' ? 0 : 0, true);
  }
  function hauteurTxt(seuil, lh) { return 'allège ' + seuil + ' cm · haut à ' + fr((seuil + lh) / 100) + ' m'; }
  function renderPlaces() {
    var box = P.querySelector('.cer-plan__places');
    if (!ST.menus.length) { box.innerHTML = '<p class="cer-plan__hint">Ajoutez des menuiseries dans le configurateur : elles se placent ici automatiquement, vous pourrez les déplacer.</p>'; return; }
    var walls = ST.type === 'carport' ? E.closList() : ['face', 'gauche', 'droite', 'fond'];
    var WL = { face: 'Façade', gauche: 'Côté gauche', droite: 'Côté droit', fond: 'Fond' };
    var open = box.querySelector(':focus');
    if (open) return; // ne pas reconstruire pendant une saisie
    box.innerHTML = '<p class="cer-plan__hint">Astuce : faites glisser une porte ou une fenêtre directement sur le dessin (façades ou plan), au doigt ou à la souris.</p>' + ST.menus.map(function (m) {
      return '<div class="cer-plan__pl" data-k="' + m.key + '"><div class="n">' + (m.siteLabel || m.label) + '</div>' +
        '<label>Mur <select class="w">' + walls.map(function (w) { return '<option value="' + w + '"' + (w === m.wall ? ' selected' : '') + '>' + WL[w] + '</option>'; }).join('') + '</select></label>' +
        '<label>Position <input class="p" type="range" min="5" max="95" value="' + m.pos + '"></label>' +
        (E.isSliding(m) && !E.isDoubleM(m) ? '<label>Coulisse <select class="r"><option value="gauche"' + (m.rail !== 'droite' ? ' selected' : '') + '>vers la gauche</option><option value="droite"' + (m.rail === 'droite' ? ' selected' : '') + '>vers la droite</option></select></label>' : '') +
        (m.type === 'fenetre' ? '<label>Hauteur <input class="h" type="range" min="0" max="' + m.seuilMax + '" step="1" value="' + m.seuil + '"></label>' +
          '<div class="hv">' + hauteurTxt(m.seuil, m.lh) + '</div>' + (m.sousRail ? '<div class="hr">Placée sous le rail de la porte coulissante.</div>' : '') : '') +
        '</div>';
    }).join('');
  }
  function dimsList(L) {
    var d = L.d, s = L.s, rows;
    if (CFG.kind === 'carport') {
      rows = [['Dimensions hors tout', fr(d.htL) + ' × ' + fr(d.htP) + ' m'], ['Emprise des poteaux', fr(d.L) + ' × ' + fr(d.P) + ' m'],
        ['Passage entre poteaux', fr(d.intL) + ' × ' + fr(d.intP) + ' m'], ['Hauteur sous ferme', fr(d.hInt) + ' m'],
        ['Hauteur au faîtage', fr(d.hExt + d.rH) + ' m'], ['Surface couverte', fr(d.htL * d.htP) + ' m²'], ['Poteaux', d.nPosts + ' (' + Math.round(s.sec * 100) + ' × ' + Math.round(s.sec * 100) + ' cm)']];
    } else {
      rows = [['Dimensions extérieures', fr(d.L) + ' × ' + fr(d.P) + ' m'], ['Dimensions intérieures', fr(d.intL) + ' × ' + fr(d.intP) + ' m'],
        ['Surface intérieure', fr(d.intL * d.intP) + ' m²'], ['Hauteur intérieure', fr(d.hInt) + ' m'],
        d.rH > 0 ? ['Hauteur au faîtage', fr(d.hExt + d.rH + (d.base || 0)) + ' m'] : null, ['Emprise toiture (hors tout)', fr(d.htL) + ' × ' + fr(d.htP) + ' m']].filter(Boolean);
    }
    return rows;
  }
  // ── Réalisations : la vraie photo la plus proche de la configuration ──
  // Chaque photo a été décrite image par image (audit du 09/10/2026) avec les valeurs du configurateur : toiture, système,
  // bardage et teinte, couverture, portes et fenêtres, extension, gouttière, porte de garage, poteaux et bandeau du carport, taille.
  var TEINTE = { sr_vert: ['vert', 'miel'], sr_vert_v: ['vert', 'miel'], ps_vert_ajoure: ['vert', 'miel'], sr_brun: ['brun'], ayous125: ['ayous'], ayous_alea: ['ayous', 'brun'], srn_gris: ['gris'], douglas_noir: ['noir'], dibond: ['noir', 'gris'] };
  var SENS = { sr_vert: 'h', sr_brun: 'h', ayous125: 'h', ayous_alea: 'v', srn_gris: 'v', douglas_noir: 'v', dibond: 'v', sr_vert_v: 'v', ps_vert_ajoure: 'v', madrier: 'h' };
  var PGTYPE = { PGM: 'metal', PGPH: 'bois_vert_h', PGPV: 'bois_vert_v', PGBH: 'brun_h', PGG: 'gris_ajoure', PGN: 'noir_ajoure', PGAH: 'ayous_h', PGAV: 'ayous_alea' };
  var TX = {
    toit: { '1PAN': 'toit 1 pan', '2PANS': 'toit 2 pans', TOIT_PLAT: 'toit plat', QUADRO: 'QUADRO' },
    bard: { sr_vert: 'bardage autoclave vert', sr_brun: 'bardage autoclave brun', ayous125: 'bardage Ayous', ayous_alea: 'Ayous vertical', srn_gris: 'bardage gris', douglas_noir: 'Douglas noir', dibond: 'Dibond' },
    couv: { bac: 'bac acier', shingle_n: 'shingle noir', shingle_b: 'shingle brun', shingle_v: 'shingle vert', tuile_g: 'tuiles acier grises', tuile_r: 'tuiles acier rouges' },
    porte: { z: 'porte classique', mortaisee: 'porte classique vitrée', contemporaine: 'porte contemporaine', bardee: 'porte bardée', porte_fenetre: 'porte-fenêtre', coulissante: 'porte coulissante', alu: 'menuiserie alu' },
    fen: { classique: 'fenêtre classique', contemporaine: 'fenêtre contemporaine', hublot: 'hublot', bandeau: 'fenêtre bandeau', verticale: 'fenêtre verticale' }
  };
  // Portes et fenêtres choisies, décrites comme les photos : [largeur, style, vitrage] et [style, matière]
  function menuSig(menus) {
    var PR = {}; (E.MPRESETS || []).forEach(function (p) { PR[p.id] = p; });
    var po = [], fe = [];
    (menus || []).forEach(function (m) {
      var cat = ((PR[m.preset] || {}).cat || '').toLowerCase(), l = (m.label || '').toLowerCase(), alu = /alu|pvc/.test(cat);
      if (m.type === 'fenetre') {
        fe.push([/hublot/.test(l) ? 'hublot' : /contemporaine/.test(cat) || alu ? (m.lw >= 150 && m.lh <= 60 ? 'bandeau' : m.lh >= 150 && m.lw <= 60 ? 'verticale' : 'contemporaine') : 'classique', alu ? 'alu' : 'bois']);
      } else {
        var st = alu ? 'alu' : /coulissant/.test(cat) ? 'coulissante' : /bard[ée]e/.test(l) ? 'bardee' : /contemporaine/.test(cat) ? 'contemporaine'
          : /porte-fen/.test(l) ? 'porte_fenetre' : /mortais|courchevel/.test(l) ? 'mortaisee' : 'z';
        po.push([m.lw >= 130 ? 'double' : m.lw >= 100 ? 'tierce' : 'simple', st, /pleine/.test(l) ? 'pleine' : /semi|2\/4/.test(l) ? 'semi' : /vitr/.test(l) ? 'vitree' : 'pleine']);
      }
    });
    return { po: po, fe: fe };
  }
  var TAILLE = { petit: 4, moyen: 7.5, grand: 15, tres_grand: 25 };
  function realScore(r, s, cfg, sig, why, ch) {
    if (r.k !== CFG.kind) return -99;
    ch = ch || {};
    var sc = 0, add = function (n, t) { sc += n; if (t) why.push(t); };
    // toiture : premier critère (QUADRO et toit plat restent voisins)
    if (r.t === s.toit) add(10, TX.toit[s.toit]);
    else if ({ QUADRO: 1, TOIT_PLAT: 1 }[r.t] && { QUADRO: 1, TOIT_PLAT: 1 }[s.toit]) sc += 3;
    else sc -= 8;
    if (CFG.kind === 'carport') {
      var cp = r.cp || {}, alu = cfg['f-potalu'] === 'oui';
      if (ch.pot && cp.pot && cp.pot !== '?') { if ((cp.pot !== 'bois') === alu) add(4, alu ? 'poteaux alu' : 'poteaux bois'); else sc -= 3; }
      var ad = !!cfg['f-ados'] && cfg['f-ados'] !== 'non';
      if (ch.ados && typeof cp.ados === 'boolean') { if (cp.ados === ad) add(2, ad ? 'adossé' : ''); else sc -= 2; }
      var bd = cfg['f-bandeau'] || '';
      if (bd && cp.bandeau && cp.bandeau !== '?') { if (cp.bandeau === bd) add(4, 'même bandeau'); else if ((cp.bandeau === 'bac_bandeau') === (bd === 'bac_bandeau')) sc += 1; else sc -= 1; }
      var clos = !!cfg['f-clos'] && cfg['f-clos'] !== 'aucune';
      if (cp.fermeture && cp.fermeture !== '?') { if ((cp.fermeture !== 'aucune') === clos) add(2, clos ? 'côté fermé' : ''); else sc -= 2; }
    } else {
      var sys = /^madrier/.test(cfg['f-sys'] || '') ? 'madrier' : 'ossature', b = sys === 'madrier' ? 'madrier' : (cfg['f-bard'] || 'sr_vert');
      if (ch.sys) { if (r.s === sys) add(6, sys === 'madrier' ? 'madrier' : 'ossature bois'); else if (r.s) sc -= 5; }
      if (ch.bard && sys === 'ossature' && r.b && r.b !== '?') {
        if (r.b === b) add(6, TX.bard[b]); else if ((TEINTE[b] || []).indexOf(r.te) >= 0) add(2, 'même teinte de bois'); else sc -= 2;
      }
      if ((ch.bard || sys === 'madrier') && r.bd && SENS[b]) sc += r.bd === SENS[b] ? 1 : -1;
      // portes et fenêtres
      var po = sig.po, fe = sig.fe, rp = r.po || [], rf = r.fe || [];
      if (po.length && rp.length) {
        var st = po[0][1], rs = rp.map(function (x) { return x[1]; }), classic = { z: 1, mortaisee: 1 };
        if (rs.indexOf(st) >= 0) add(4, TX.porte[st]); else if (classic[st] && rs.some(function (x) { return classic[x]; })) sc += 1.5; else sc -= 1.5;
        var dbl = po.some(function (x) { return x[0] === 'double'; }), rdbl = rp.some(function (x) { return x[0] === 'double'; });
        if (dbl === rdbl) add(2, dbl ? 'porte double' : ''); else sc -= 1;
        if (rp.some(function (x) { return x[1] === st && x[2] === po[0][2]; })) sc += 1;
      } else if (!po.length !== !rp.length) sc -= 1;
      if (fe.length && rf.length) {
        var fs = fe[0][0];
        if (rf.some(function (x) { return x[0] === fs; })) add(2, TX.fen[fs]); else sc += 0.5;
        if (Math.abs(fe.length - rf.length) <= 1) sc += 1;
      } else if (!fe.length !== !rf.length) sc -= 1.5;
      var aluC = po.some(function (x) { return x[1] === 'alu'; }) || fe.some(function (x) { return x[1] === 'alu'; });
      var aluR = rp.some(function (x) { return x[1] === 'alu'; }) || rf.some(function (x) { return x[1] === 'alu'; });
      if (aluC || aluR) sc += aluC === aluR ? 1.5 : -1.5;
      // extension de toiture
      var ex = s.ext || {}, hasExt = ['face', 'fond', 'gauche', 'droite'].some(function (k) { return ex[k] > 0.5; });
      if (r.ex) {
        if (hasExt) {
          add(5, 'extension de toit');
          var ferm = cfg['f-ext-ferm'] || 'non';
          if (r.ex.f && r.ex.f !== '?') sc += ((r.ex.f === 'ouverte') === (ferm === 'non')) ? 1 : -0.5;
          if (typeof r.ex.pl === 'boolean') sc += r.ex.pl === (cfg['f-ext-plan'] === 'oui') ? 0.5 : 0;
        } else sc -= 3;
      } else if (hasExt) sc -= 3;
      if (CFG.kind === 'garage' && r.pg) { var pgc = PGTYPE[cfg['f-pgtype']]; if (pgc && r.pg === pgc) add(4, 'même porte de garage'); else if (pgc) sc -= 1; }
    }
    // couverture, quand on la voit
    if (ch.couv && r.cv && r.cv !== 'invisible' && r.cv !== '?') {
      var cv = cfg['f-couv'] || 'bac';
      if (r.cv === cv) add(3, TX.couv[cv]); else if (r.cv.slice(0, 4) === cv.slice(0, 4)) sc += 1; else sc -= 1;
    }
    if (typeof r.g === 'boolean') sc += r.g === (cfg['f-gout'] === 'oui') ? 0.5 : 0;
    // taille : surface au sol comparée
    var a1 = s.Lr * s.Pr, a2 = r.L && r.P ? r.L * r.P : TAILLE[r.ta] || 0;
    if (a1 && a2) { var ratio = Math.min(a1, a2) / Math.max(a1, a2); sc += (r.L ? 3 : 1.5) * ratio; if (ratio > 0.75) why.push('taille proche'); }
    sc += r.q === 'bonne' ? 1 : r.q === 'faible' ? -2 : 0;
    if (r.v === 'partielle') sc -= 5; // vue partielle ou de l'arrière : seulement à défaut d'une vue d'ensemble
    return sc;
  }
  // Trois ouvrages différents : deux photos voisines dans la médiathèque avec la même description sont deux vues du même ouvrage
  function memeOuvrage(a, b) {
    if (a.gr && a.gr === b.gr) return true; // même fichier, prises de vue qui se suivent ou quasi-doublon
    if (a.u && b.u) return a.u === b.u;
    return Math.abs(a.i - b.i) <= 3 && a.t === b.t && a.b === b.b && a.te === b.te && !a.ex === !b.ex;
  }
  function distincts(list, n) {
    var out = [];
    for (var k = 0; k < list.length && out.length < n; k++) {
      if (!out.some(function (o) { return memeOuvrage(o.r, list[k].r); })) out.push(list[k]);
    }
    return out;
  }
  function communs(why) {
    var seen = {}; return why.filter(function (w) { if (!w || seen[w]) return false; seen[w] = 1; return true; }).slice(0, 5).join(' · ');
  }
  function realisations() {
    var box = P && P.querySelector('.cer-plan__real'); if (!box || !LAST) return;
    var s = LAST.s, cfg = ST.cfg || {}, sig = menuSig(ST.menus);
    var list = REAL.map(function (r) { var why = []; return { r: r, sc: realScore(r, s, cfg, sig, why, LAST.choix), why: communs(why) }; })
      .filter(function (x) { return x.sc >= 8; }).sort(function (a, b) { return b.sc - a.sc; });
    list = distincts(list, 3);
    var key = list.map(function (x) { return x.r.p; }).join('|');
    if (box.getAttribute('data-k') === key) return;
    box.setAttribute('data-k', key); box._list = list;
    if (!list.length) { box.innerHTML = ''; return; }
    var r0 = list[0].r;
    box.innerHTML = '<div class="cer-plan__realh"><span>En vrai</span>Une réalisation proche de votre projet</div>' +
      '<figure class="cer-plan__realmain"><button type="button" class="z" aria-label="Agrandir la photo"><img loading="lazy" src="' + r0.p + '" alt="' + r0.c + '"></button><figcaption>' + r0.c + '</figcaption></figure>' +
      '<p class="cer-plan__realw"' + (list[0].why ? '' : ' hidden') + '>En commun avec votre projet : <span>' + list[0].why + '</span></p>' +
      (list.length > 1 ? '<div class="cer-plan__realth">' + list.map(function (x, i) { return '<button type="button" data-i="' + i + '"' + (i ? '' : ' class="on"') + ' aria-label="' + x.r.c + '"><img loading="lazy" src="' + x.r.p + '" alt=""></button>'; }).join('') + '</div>' : '') +
      '<p class="cer-plan__realn">Photo d\'un modèle posé, proche de votre configuration (non contractuelle). <a href="' + (r0.u || '#') + '" target="_blank" rel="noopener"' + (r0.u ? '' : ' hidden') + '>Voir ce modèle</a></p>';
  }
  function onReal(e) {
    var box = e.currentTarget, list = box._list || [], th = e.target.closest('.cer-plan__realth button');
    if (th) {
      var it = list[+th.getAttribute('data-i')], r = it.r;
      box.querySelector('.cer-plan__realmain img').src = r.p; box.querySelector('.cer-plan__realmain figcaption').textContent = r.c;
      var w = box.querySelector('.cer-plan__realw'); if (w) { w.hidden = !it.why; w.querySelector('span').textContent = it.why; }
      var ln = box.querySelector('.cer-plan__realn a'); ln.href = r.u || '#'; ln.hidden = !r.u;
      Array.prototype.forEach.call(box.querySelectorAll('.cer-plan__realth button'), function (b) { b.classList.toggle('on', b === th); });
      return;
    }
    if (e.target.closest('.cer-plan__realmain .z')) { // agrandissement plein écran
      var lb = document.createElement('div'); lb.className = 'cer-lb';
      lb.innerHTML = '<img src="' + box.querySelector('.cer-plan__realmain img').src + '" alt=""><p>' + box.querySelector('figcaption').textContent + '</p><button type="button" aria-label="Fermer">×</button>';
      lb.addEventListener('click', function () { lb.remove(); }); document.body.appendChild(lb);
    }
  }

  // ── Habillage du formulaire du site (version test) : titres d'étape, prix en pastilles, boutons − / + sur les dimensions ──
  var money0 = function (v) { return v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; };
  function habiller() {
    if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-label span'), function (sp) { // puces « • » retirées
      var n = sp.firstChild; if (n && n.nodeType === 3 && /^\s*[•·]\s*/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/^\s*[•·]\s*/, '');
    });
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-section.TITRE, .wapf-section.TITRE2'), function (sec) { // titre d'étape = 1re question visible
      var first = null;
      Array.prototype.forEach.call(sec.querySelectorAll('.wapf-field-container > .wapf-field-label'), function (l) {
        l.classList.remove('cer-step-h');
        if (!first && l.offsetParent !== null && !l.closest('.cerisier-toggle') && l.textContent.trim()) first = l;
      });
      if (first) first.classList.add('cer-step-h');
    });
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-pricing-hint'), function (h) { // « (+480,00 €) » → pastille « +480 € » / « Inclus »
      var tx = h.textContent; if (h.getAttribute('data-cer') === tx) return;
      var v = numTxt(tx), nt = isNaN(v) ? tx : (v === 0 ? 'Inclus' : (v > 0 ? '+' : '−') + money0(Math.abs(v)));
      h.textContent = nt; h.setAttribute('data-cer', nt); h.classList.add('cer-pill'); h.classList.toggle('cer-pill--0', v === 0);
    });
    Array.prototype.forEach.call(form.querySelectorAll('.cerisier-toggle .wapf-swatch--text span'), function (sp) { // guides : simple lien
      var n = sp.firstChild; if (n && n.nodeType === 3 && /▼|guide|Comparer/i.test(n.nodeValue)) n.nodeValue = window.matchMedia('(max-width: 767.98px)').matches ? 'Comparer' : 'Comparer les options';
    });
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-add-clone'), function (b) { // « ajouter une menuiserie » → majuscule
      if (/^\s*ajouter une menuiserie\s*$/.test(b.textContent)) b.textContent = 'Ajouter une menuiserie';
    });
    [M.lar && M.lar.sel, M.pro && M.pro.sel].forEach(function (fid) { // dimensions : − / + autour de la liste
      if (!fid) return;
      var sel = form.querySelector('select[name="' + nm(fid) + '"]'); if (!sel || sel.parentNode.classList.contains('cer-stepper')) return;
      var w = document.createElement('div'); w.className = 'cer-stepper'; sel.parentNode.insertBefore(w, sel);
      var mk = function (d, txt) { var b = document.createElement('button'); b.type = 'button'; b.className = 'cer-stepper__b'; b.textContent = txt; b.setAttribute('aria-label', d < 0 ? 'Diminuer' : 'Augmenter');
        b.addEventListener('click', function () { var i = Math.min(sel.options.length - 1, Math.max(1, (sel.selectedIndex || 0) + d)); if (i === sel.selectedIndex) return; sel.selectedIndex = i;
          if (window.jQuery) window.jQuery(sel).trigger('change'); else sel.dispatchEvent(new Event('change', { bubbles: true })); });
        return b; };
      w.appendChild(mk(-1, '−')); w.appendChild(sel); w.appendChild(mk(1, '+'));
    });
  }
  var PREV_TOT = null;
  function deltaPrix(tot) { // variation du prix à chaque choix : « +480 € » pendant 2 s
    if (PREV_TOT != null && !isNaN(tot) && Math.abs(tot - PREV_TOT) >= 0.01 && PREV_TOT > 0) {
      var box = P.querySelector('.cer-plan__prix'), d = tot - PREV_TOT, el = document.createElement('span');
      el.className = 'cer-plan__delta ' + (d > 0 ? 'up' : 'down'); el.textContent = (d > 0 ? '+' : '−') + money0(Math.abs(d));
      box.appendChild(el); setTimeout(function () { el.classList.add('out'); }, 1800); setTimeout(function () { el.remove(); }, 2400);
    }
    if (!isNaN(tot) && tot > 0) PREV_TOT = tot;
  }

  function trace(svg, L) {
    svg.setAttribute('data-v', VIEW === 'plan' ? 'plan' : 'vue');
    svg.removeAttribute('data-mf'); svg.removeAttribute('data-pf');
    ST.scaleBar = true;                                   // barre d'échelle sur chaque vue
    ST.scale = E.commonScale(L.d, 380, 280);              // les quatre élévations à la même échelle
    ST.planScale = null;
    if (VIEW === 'plan') { svg.setAttribute('viewBox', '0 0 480 340'); E.drawPlan(svg, L.d, 480, 340); }
    else { svg.setAttribute('viewBox', '0 0 380 280'); E.drawElev(svg, L.d, VIEW, 380, 280); }
    poignees(svg);
  }
  // ── Portes et fenêtres déplacées sur le dessin (demande d'Antony, 13/10/2026) : souris ou doigt, par pas de 10 cm ──
  // Façades : glisser le long du mur (une fenêtre glissée vers le haut ou le bas change de hauteur, par pas de 5 cm).
  // Plan : glisser d'un mur à l'autre. Les règles de place (10 cm des angles, jamais l'une sur l'autre) restent celles de separer().
  var GLIS = null, SANS_CLIC = false, rafG = 0;
  var murs = function () { return ST.type === 'carport' ? E.closList() : ['face', 'gauche', 'droite', 'fond']; };
  var murCm = function (w) { var d = LAST.d; return ((w === 'face' || w === 'fond') ? d.L : d.P) * 100; };
  // centre (cm depuis l'angle gauche vu de dehors) → position en %, bord gauche calé sur 10 cm, à 10 cm au moins des angles
  function caler(w, c, lw) {
    var Lc = murCm(w), e = Math.round((c - lw / 2) / 10) * 10;
    e = Math.max(10, Math.min(Lc - 10 - lw, e));
    return Math.round((e + lw / 2) / Lc * 1000) / 10;
  }
  function poignees(svg) {
    if (!LAST || !ST.menus.length) return;
    var NS = 'http://www.w3.org/2000/svg', mf = svg.getAttribute('data-mf'), pf = svg.getAttribute('data-pf'), d = LAST.d;
    var hit = function (m, x, y, w, h) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', Math.max(0, w)); r.setAttribute('height', Math.max(0, h)); r.setAttribute('rx', 2);
      r.setAttribute('class', 'cer-mh' + (GLIS && GLIS.k === m.key ? ' on' : '')); r.setAttribute('data-k', m.key);
      var tl = document.createElementNS(NS, 'title'); tl.textContent = (m.siteLabel || m.label) + ' : faites glisser pour la déplacer'; r.appendChild(tl);
      svg.appendChild(r);
    };
    if (VIEW === 'plan' && pf) {
      var f = JSON.parse(pf);
      var along = function (w, t) { return w === 'face' ? [f.wx + t * f.dw, f.wy + f.dp] : w === 'fond' ? [f.wx + (1 - t) * f.dw, f.wy] : w === 'gauche' ? [f.wx, f.wy + (1 - t) * f.dp] : [f.wx + f.dw, f.wy + t * f.dp]; };
      ST.menus.forEach(function (m) {
        var half = m.lw / 2 / murCm(m.wall), t = m.pos / 100, a = along(m.wall, t - half), b = along(m.wall, t + half), hz = m.wall === 'face' || m.wall === 'fond';
        hit(m, Math.min(a[0], b[0]) - (hz ? 0 : 11), Math.min(a[1], b[1]) - (hz ? 11 : 0), hz ? Math.abs(b[0] - a[0]) : 22, hz ? 22 : Math.abs(b[1] - a[1]));
      });
    } else if (mf) {
      var g = JSON.parse(mf);
      ST.menus.filter(function (m) { return m.wall === VIEW; }).forEach(function (m) {
        var w = m.lw / 100 * g.sc, h = m.lh / 100 * g.sc;
        hit(m, g.x0 + m.pos / 100 * g.w - w / 2, g.gnd - h - (m.seuil || 0) / 100 * g.sc, w, h);
      });
    }
  }
  var peutGlisser = function () { return !(DOCK.matches && !document.body.classList.contains('cer-plan-open')); }; // téléphone replié : un appui ouvre d'abord le plein écran
  function svgPt(svg, e) { var m = svg.getScreenCTM(); if (!m) return null; var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(m.inverse()); }
  function glisser(svg) {
    svg.addEventListener('pointerdown', function (e) {
      var h = e.target.closest && e.target.closest('.cer-mh');
      if (!h || !LAST || !peutGlisser() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var k = h.getAttribute('data-k'), m = ST.menus.filter(function (x) { return x.key === k; })[0], p = svgPt(svg, e);
      if (!m || !p) return;
      e.preventDefault(); e.stopPropagation();
      GLIS = { k: k, m: m, id: e.pointerId, x0: p.x, y0: p.y, pos0: m.pos, seuil0: m.seuil || 0, axe: null, bouge: false,
        f: JSON.parse(svg.getAttribute(VIEW === 'plan' ? 'data-pf' : 'data-mf') || 'null'), plan: VIEW === 'plan', mur: VIEW };
      if (!GLIS.f) { GLIS = null; return; }
      try { svg.setPointerCapture(e.pointerId); } catch (x) { }
      document.body.classList.add('cer-glisse'); indiceVu();
    });
    svg.addEventListener('pointermove', function (e) {
      if (!GLIS || e.pointerId !== GLIS.id) return;
      var p = svgPt(svg, e); if (!p) return;
      var dx = p.x - GLIS.x0, dy = p.y - GLIS.y0, f = GLIS.f, m = GLIS.m;
      if (!GLIS.axe) { if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; GLIS.axe = GLIS.plan || m.type !== 'fenetre' || Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'; }
      GLIS.bouge = true; e.preventDefault();
      var pl = PLACE[GLIS.k] || (PLACE[GLIS.k] = { wall: m.wall, pos: m.pos, rail: m.rail || 'gauche' });
      pl.auto = false; ACTIF = GLIS.k;
      if (GLIS.plan) { // le mur le plus proche du doigt, parmi ceux qui peuvent recevoir une menuiserie
        var best = null;
        murs().forEach(function (w) {
          var hz = w === 'face' || w === 'fond', dist = hz ? Math.abs(p.y - (w === 'face' ? f.wy + f.dp : f.wy)) : Math.abs(p.x - (w === 'gauche' ? f.wx : f.wx + f.dw));
          var t = w === 'face' ? (p.x - f.wx) / f.dw : w === 'fond' ? 1 - (p.x - f.wx) / f.dw : w === 'gauche' ? 1 - (p.y - f.wy) / f.dp : (p.y - f.wy) / f.dp;
          if (t < -0.15 || t > 1.15) dist += 1e3; // hors du mur
          if (!best || dist < best.d) best = { w: w, d: dist, t: Math.max(0, Math.min(1, t)) };
        });
        if (!best) return;
        pl.wall = best.w; pl.pos = caler(best.w, best.t * murCm(best.w), m.lw);
      } else if (GLIS.axe === 'x') {
        pl.wall = GLIS.mur; pl.pos = caler(GLIS.mur, GLIS.pos0 / 100 * murCm(GLIS.mur) + dx / f.w * murCm(GLIS.mur), m.lw);
      } else { // fenêtre : hauteur d'allège
        var s = Math.round((GLIS.seuil0 - dy / f.sc * 100) / 5) * 5;
        pl.seuil = Math.max(0, Math.min(m.seuilMax || 0, s));
      }
      if (!rafG) rafG = requestAnimationFrame(function () { rafG = 0; if (!GLIS) return; try { read(); trace(svg, LAST); } catch (x) { } });
    });
    var fin = function (e) {
      if (!GLIS || e.pointerId !== GLIS.id) return;
      var b = GLIS.bouge; GLIS = null;
      try { svg.releasePointerCapture(e.pointerId); } catch (x) { }
      document.body.classList.remove('cer-glisse');
      if (b) { SANS_CLIC = true; setTimeout(function () { SANS_CLIC = false; }, 50); schedule(0, true); }
    };
    svg.addEventListener('pointerup', fin); svg.addEventListener('pointercancel', fin);
    // iPhone : un doigt posé sur une menuiserie ne fait pas défiler la page
    svg.addEventListener('touchstart', function (e) { if (e.target.closest && e.target.closest('.cer-mh') && peutGlisser()) e.preventDefault(); }, { passive: false });
    svg.addEventListener('click', function (e) { if (SANS_CLIC) { e.stopPropagation(); e.preventDefault(); } }, true);
  }
  // Indication animée (main qui glisse) : la première fois qu'une menuiserie apparaît sur le dessin ; un rappel 45 s plus tard si rien n'a été déplacé
  var indT = 0, indAt = 0, indN = (function () { try { return parseInt(sessionStorage.getItem('cerIndice') || '0', 10) || 0; } catch (e) { return 0; } })();
  function indiceVu() { indN = 9; try { sessionStorage.setItem('cerIndice', '9'); } catch (e) { } var x = P && P.querySelector('.cer-indice'); if (x) x.remove(); }
  function indice() {
    if (indN >= 2 || (indN === 1 && Date.now() - indAt < 45000) || GLIS || !P || !peutGlisser() || document.body.classList.contains('cer-plan-min') || P.querySelector('.cer-indice')) return;
    var st = P.querySelector('.cer-plan__stage'), h = st.querySelector('.cer-mh'); if (!h) return;
    var rs = st.getBoundingClientRect(), rh = h.getBoundingClientRect(); if (!rs.width || !rh.width || rh.top < 0 || rh.bottom > window.innerHeight) return; // seulement si le client la voit
    indN++; indAt = Date.now(); try { sessionStorage.setItem('cerIndice', String(indN)); } catch (e) { }
    var m = ST.menus.filter(function (x) { return x.key === h.getAttribute('data-k'); })[0] || {};
    var el = document.createElement('div'); el.className = 'cer-indice';
    el.style.left = (rh.left - rs.left + rh.width / 2) + 'px'; el.style.top = (rh.top - rs.top + rh.height / 2) + 'px';
    el.innerHTML = '<svg class="cer-indice__main" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L4 15.6a1.5 1.5 0 0 1 2.3-1.9L9 16" fill="#fff" stroke="#3c3d2a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="cer-indice__txt">Faites glisser ' + (m.type === 'fenetre' ? 'la fenêtre' : 'la porte') + ' pour la déplacer</span>';
    st.appendChild(el);
    clearTimeout(indT); indT = setTimeout(function () { el.classList.add('fin'); setTimeout(function () { el.remove(); }, 400); }, 4800);
  }
  function draw() {
    if (!P) return;
    var L = LAST, svg = P.querySelector('#cer-sv-main'), empty = P.querySelector('.cer-plan__empty');
    document.body.classList.toggle('cer-sans-dims', !L); // panier, 3D et « Voir mon abri » attendent les dimensions
    Array.prototype.forEach.call(P.querySelectorAll('.cer-plan__tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === VIEW); });
    if (!L) { svg.style.display = 'none'; empty.style.display = ''; P.querySelector('.cer-plan__dims').innerHTML = ''; try { polish(); } catch (e) { if (window.console) console.warn('[Cerisier prix]', e); } return; } // prix tenu à jour même sans dessin (jamais un ancien prix)
    svg.style.display = ''; empty.style.display = 'none';
    if (!shownOnce) { shownOnce = true; if (memoGet() !== 'min') document.body.classList.remove('cer-plan-min'); }
    trace(svg, L);
    P.querySelector('.cer-plan__dims').innerHTML = dimsList(L).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
    realisations();
    var W = E.menuWarnings(L.d).filter(function (w) { return !/pas de prix/.test(w); });
    // configuration hors norme (demande d'Antony, 13/10/2026) : au-delà de la hauteur au faîtage réglée dans l'admin (Réglages → Fiche Technique)
    var hMax = parseFloat(CFG.kind === 'carport' ? CFG.alerteHCp : CFG.alerteH) || 0, dd = L.d, plat = dd.toit === 'TOIT_PLAT' && !dd.isQuadro && CFG.kind !== 'carport';
    var hT = (dd.hExt || 0) + (plat && E.flatTopH ? E.flatTopH(dd) : (dd.rH || 0)) + (dd.base || 0);
    if (hMax > 0 && hT > hMax + 0.005) W.unshift('Configuration hors standard (' + hT.toFixed(2).replace('.', ',') + ' m au faîtage) : vous pouvez la commander, mais elle passera par notre bureau d\u2019études, qui se réserve le droit de l\u2019adapter si elle n\u2019est pas réalisable techniquement.');
    if (NOTE_PLACE) W.unshift(NOTE_PLACE);
    if (SANS_PLACE.length) W.unshift('Plus de place sur les murs pour : ' + SANS_PLACE.join(', ') + '. Agrandissez l\u2019abri ou retirez une menuiserie.');
    P.querySelector('.cer-plan__warn').innerHTML = W.map(function (w) { return '<p>' + w.replace(/Ouverture (\d+)/g, function (_, n) { var m = ST.menus[n - 1]; return m ? (m.siteLabel || m.label) : 'Ouverture ' + n; }) + '</p>'; }).join('');
    renderPlaces();
    polish();
    try { indice(); } catch (e) { }
  }
  // Prix et détail de la configuration lus dans le configurateur du site (ses blocs du haut sont masqués)
  var money = function (v) { return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; };
  // Montant affiché par le site → nombre : « 1 234,50 € », « (+168,00 €) », et le total brut des calculs WAPF « 8730.288 € »
  // (point décimal, 3 décimales). Le séparateur décimal est le DERNIER signe ; un point seul n'est jamais un séparateur de milliers
  // (le 09/10/2026, « 8730.288 » était lu 8 730 288 € : prix de carport à plusieurs millions dans le panneau).
  var numTxt = function (t) {
    var s = String(t || '').replace(/[^\d,.-]/g, ''), c = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (c >= 0) s = s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
    else if (p >= 0 && s.split('.').length > 2) s = s.replace(/\./g, '');
    var v = parseFloat(s); return isNaN(v) ? NaN : v;
  };
  var LABELS = [
    [/^Largeur \(m\)/i, 'Largeur', 'Dimensions'], [/^Profondeur \(m\)/i, 'Profondeur', 'Dimensions'],
    [/^Largeur sur-mesure/i, 'Largeur sur mesure', 'Dimensions'], [/^profondeur sur-mesure/i, 'Profondeur sur mesure', 'Dimensions'],
    [/implantation/i, 'Implantation', 'Structure'], [/type de toiture/i, 'Toiture', 'Toiture'], [/orientation/i, 'Sens de la pente', 'Toiture'],
    [/degr[ée] de pente/i, 'Pente', 'Toiture'], [/Bandeau/i, 'Bandeau', 'Toiture'], [/couverture/i, 'Couverture', 'Toiture'], [/isolation de toiture/i, 'Isolation de toiture', 'Toiture'],
    [/goutti[èe]re/i, 'Gouttière', 'Toiture'], [/syst[èe]me constructif/i, 'Construction', 'Structure'], [/[ée]paisseur des madriers/i, 'Madriers', 'Structure'],
    [/profil[eé]? "U"/i, 'Profil « U » de finition', 'Structure'], [/type de pignon/i, 'Pignon', 'Structure'], [/bardage souhaitez/i, 'Bardage', 'Structure'],
    [/pare-pluie/i, 'Pare-pluie', 'Structure'], [/poteaux souhaitez/i, 'Poteaux', 'Structure'], [/Espacement.*largeur/i, 'Espacement des poteaux (largeur)', 'Structure'],
    [/Espacement.*profondeur/i, 'Espacement des poteaux (profondeur)', 'Structure'], [/support de poteaux/i, 'Supports de poteaux', 'Structure'],
    [/^Rehausse/i, 'Rehausses', 'Structure'], [/plancher sur/i, 'Plancher', 'Options'], [/isolation entre les montants/i, 'Isolation des murs', 'Options'],
    [/^(Fond|Gauche|Droite|Face) \(/i, null, 'Extension'], [/^Remplissage$/i, 'Côtés fermés', 'Extension'], [/Type de remplissage|type de remplissage souhaitez/i, 'Fermeture', 'Extension'],
    [/quels? c[ôo]t[ée]s?.*fermeture/i, 'Côtés fermés', 'Fermetures'], [/plancher ext[ée]rieur \?/i, 'Plancher extérieur', 'Options'], [/^Largeur en m/i, 'Plancher extérieur, largeur', 'Options'],
    [/^Profondeur en m/i, 'Plancher extérieur, profondeur', 'Options'], [/soubassement/i, 'Soubassement', 'Options'], [/livraison/i, 'Livraison', 'Livraison et pose'],
    [/pose en R[ée]gion/i, 'Pose', 'Livraison et pose'], [/Porte de garage/i, 'Porte de garage', 'Menuiseries'],
    [/^(Fen[êe]tre|Porte|Coulissant|Baie)/i, 'Menuiserie', 'Menuiseries'], [/^Option (fen[êe]tre|porte)/i, 'Option', 'Menuiseries']
  ];
  var SKIP = /Aide au choix|Afficher le d[ée]tail|^info|souhaitez-vous (une extension|rehausser|un remplissage|fermer)|^Type$|^Mati[èe]re$|^$/i;
  // Écriture homogène des valeurs du site (OUI → Oui, 28mm → 28 mm, Pente de toit 18° → 18°, 2 PANS → 2 pans)
  function nice(v) {
    v = String(v).replace(/\s+/g, ' ').trim();
    if (/^(OUI|NON)$/.test(v)) return v.charAt(0) + v.slice(1).toLowerCase();
    if (/^(1 PAN|2 PANS|TOIT PLAT|QUADRO)$/.test(v)) return v === 'QUADRO' ? 'QUADRO' : v.charAt(0) + v.slice(1).toLowerCase();
    v = v.replace(/^Pente de toit\s*/i, '').replace(/(\d)\s*mm\b/g, '$1 mm').replace(/(\d)\s*cm\b/g, '$1 cm');
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  function detailRows() {
    var rows = [];
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-container'), function (c) {
      if (c.classList.contains('wapf-hide') || c.closest('.wapf-hide') || c.closest('.blocdimpr, .blocdimpr1')) return;
      if (/wapf-field-(calc|p|section)\b/.test(c.className)) return;
      var labEl = c.querySelector(':scope > .wapf-field-label'), lab = labEl ? labEl.textContent.replace(/[••]/g, '').replace(/\(\+\.\.\.\)/, '').replace(/\s+/g, ' ').trim() : '';
      if (SKIP.test(lab)) return;
      var m = null; for (var i = 0; i < LABELS.length; i++) { if (LABELS[i][0].test(lab)) { m = LABELS[i]; break; } }
      if (!m) return;
      var vals = [], price = 0;
      Array.prototype.forEach.call(c.querySelectorAll('input:checked, select, input[type=number]'), function (e) {
        if (e.type === 'hidden' || e.disabled) return;
        if (e.tagName === 'SELECT') { var o = e.options[e.selectedIndex]; if (o && o.value) vals.push(o.text.replace(/\(\+[^)]*\)/, '').trim()); return; }
        if (e.type === 'number') { if (e.value !== '' && parseFloat(e.value) !== 0) vals.push(e.value.replace('.', ',')); return; }
        vals.push((e.getAttribute('data-wapf-label') || '').trim());
        var lb = e.closest('label') || e.closest('.wapf-swatch') || e.parentElement, h = lb && lb.querySelector('.wapf-pricing-hint');
        var pv = h ? numTxt(h.textContent) : NaN; if (!isNaN(pv)) price += pv;
      });
      vals = vals.filter(function (v) { return v && !/^non$/i.test(v); });
      if (!vals.length) return;
      if (!price) { // champ numérique : le prix s'affiche dans l'indication du libellé
        var lh = labEl && labEl.querySelector('.wapf-pricing-hint'), lv = lh ? numTxt(lh.textContent) : NaN;
        if (!isNaN(lv)) price = lv;
      }
      var key = m[1] || ('Extension ' + lab.replace(/\s*\(.*$/, '').toLowerCase());
      var v = vals.map(nice).join(', ');
      if (/^(Largeur|Profondeur)$/.test(key) || /^Extension /.test(key) || /^Plancher extérieur, /.test(key)) v += ' m';
      if (key === 'Rehausses') v += ' × 13 cm';
      rows.push({ g: m[2], k: key, v: v, p: price });
    });
    var ORDER = ['Dimensions', 'Structure', 'Toiture', 'Menuiseries', 'Extension', 'Fermetures', 'Options', 'Livraison et pose'];
    return rows.map(function (r, i) { r.i = i; return r; }).sort(function (a, b) { return (ORDER.indexOf(a.g) - ORDER.indexOf(b.g)) || (a.i - b.i); });
  }
  // Haut de page (maquette validée par Antony le 13/10/2026) : étape 1 marquée « Commencez ici », schéma largeur / profondeur, aide sous le panier
  function depart() {
    var s1 = form.querySelector('.wapf-section.TITRE'); if (!s1 || s1.classList.contains('cer-depart')) return;
    s1.classList.add('cer-depart');
    var ici = document.createElement('span'); ici.className = 'cer-ici'; ici.textContent = 'Commencez ici'; s1.appendChild(ici);
    Array.prototype.forEach.call(s1.querySelectorAll(':scope > .wapf-section'), function (d) { d.classList.add('cer-dim'); });
    var cp = CFG.kind === 'carport', txt = cp ? 'La <b>largeur</b> est le côté par lequel on entre ; la <b>profondeur</b> va de l\u2019avant vers l\u2019arrière.'
      : 'La <b>largeur</b> est le côté de la façade, celui de la ' + (CFG.kind === 'garage' ? 'porte de garage' : 'porte') + ' ; la <b>profondeur</b> va de l\u2019avant vers l\u2019arrière.';
    var sch = document.createElement('div'); sch.className = 'cer-schema';
    sch.innerHTML = '<svg viewBox="0 0 150 92" aria-hidden="true"><rect x="34" y="12" width="82" height="52" rx="2" fill="#f3f1ea" stroke="#515136" stroke-width="2"/>' + (cp ? '' : '<rect x="66" y="61" width="18" height="6" fill="#515136"/>') +
      '<path d="M34 80h82M34 76v8M116 76v8" stroke="#a5a38b" stroke-width="1.5"/><text x="75" y="91" font-size="10" text-anchor="middle" fill="#55574a" font-family="Jost,Arial">Largeur (' + (cp ? 'entrée' : 'façade') + ')</text>' +
      '<path d="M128 12v52M124 12h8M124 64h8" stroke="#a5a38b" stroke-width="1.5"/><text x="140" y="42" font-size="10" fill="#55574a" font-family="Jost,Arial" transform="rotate(90 140 42)" text-anchor="middle">Profondeur</text>' +
      '<text x="75" y="42" font-size="10" text-anchor="middle" fill="#7a7863" font-family="Jost,Arial">vu de dessus</text></svg><span>' + txt + '</span>';
    var titre = s1.querySelector(':scope > .wapf-field-p:not(.cer-vg-cache)');
    if (titre) titre.insertAdjacentElement('afterend', sch); else s1.insertBefore(sch, s1.firstChild);
    var a = document.createElement('p'); a.className = 'cer-aide-panier'; a.textContent = 'Choisissez d\u2019abord la largeur et la profondeur'; form.insertAdjacentElement('afterend', a);
  }
  // sections WAPF dont tous les champs sont masqués (ex. titre d'étape suivant, vide au départ) : pas de cadre vide
  function vides() {
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-section'), function (s) {
      var vis = Array.prototype.some.call(s.querySelectorAll('.wapf-field-container'), function (c) { return !c.closest('.wapf-hide') && getComputedStyle(c).display !== 'none'; });
      s.classList.toggle('cer-vide', !vis);
    });
  }
  function polish() {
    try { depart(); vides(); } catch (e) { if (window.console) console.warn('[Cerisier haut de page]', e); }
    var tot = numTxt((form.querySelector('.blocdimpr1 .wapf-calc-text, .field-453ead0 .wapf-calc-text, .field-d0abad4 .wapf-calc-text') || {}).textContent);
    var base = numTxt((form.querySelector('.field-4a1fc24 .wapf-calc-text, .field-b53e07d .wapf-calc-text, .field-d0aafc5 .wapf-calc-text') || {}).textContent);
    var box = P.querySelector('.cer-plan__prix');
    // Saisie hors des bornes du champ (ex. profondeur sur-mesure sous 2 m, sans prix dans les grilles) : le panier la refuse,
    // donc aucun prix affiché ; on dit quoi corriger.
    var hors = Array.prototype.filter.call(form.querySelectorAll('input[type=number]'), function (i) {
      var c = i.closest('.wapf-field-container');
      return c && !c.classList.contains('wapf-hide') && !c.closest('.wapf-hide') && i.value !== '' && i.validity && (i.validity.rangeUnderflow || i.validity.rangeOverflow);
    });
    if (hors.length) {
      var i0 = hors[0], lab = ((i0.closest('.wapf-field-container').querySelector('.wapf-field-label') || {}).textContent || '').replace(/\s+/g, ' ').trim();
      var enM = /\(m\)|\ben m\b|poteaux/i.test(lab), bas = i0.validity.rangeUnderflow;
      var msg = (lab.replace(/\s*\(m\)\s*/i, ' ').replace(/\s+en m\s*$/i, '').trim() || 'Dimension') + ' : ' + String(+(bas ? i0.min : i0.max)).replace('.', ',') + (enM ? ' m' : '') + (bas ? ' minimum' : ' maximum');
      box.hidden = false; var st = box.querySelector('strong'); st.textContent = msg; st.className = 'cer-plan__borne';
      var p = document.createElement('p'); p.className = 'cer-plan__hint'; p.textContent = msg + '. Corrigez la valeur pour voir le prix.';
      var lg = P.querySelector('.cer-plan__lignes'); lg.innerHTML = ''; lg.appendChild(p);
      PREV_TOT = null; return;
    }
    box.querySelector('strong').className = '';
    if (tot > 200000) { if (window.console) console.warn('[Cerisier] total improbable, non affiché :', tot); tot = NaN; } // garde-fou : au-delà de toute grille du site
    if (!isNaN(tot) && tot > 0) { box.hidden = false; box.querySelector('strong').innerHTML = money(tot) + '<small>TTC</small>'; } else box.hidden = true;
    deltaPrix(tot);
    var rows = detailRows(), html = '', g = '';
    if (!isNaN(base) && base > 0 && LAST) html += '<div class="g">Votre ' + NOUN + '</div><div class="l"><span class="k">Modèle de base</span><span class="v">' + fr(LAST.s.Lr) + ' × ' + fr(LAST.s.Pr) + ' m</span><span class="p">' + money(base) + '</span></div>';
    rows.forEach(function (r) {
      if (r.g !== g) { g = r.g; html += '<div class="g">' + g + '</div>'; }
      html += '<div class="l"><span class="k">' + r.k + '</span><span class="v">' + r.v + '</span><span class="p">' + (r.p ? '+ ' + money(r.p) : '') + '</span></div>';
    });
    // Contrôle : base + options = total du site ; un écart restant est affiché tel quel (jamais de total qui ne tombe pas juste)
    if (!isNaN(tot) && tot > 0 && !isNaN(base)) {
      var ecart = Math.round((tot - base - rows.reduce(function (a, r) { return a + (r.p || 0); }, 0)) * 100) / 100;
      if (Math.abs(ecart) >= 0.01) html += '<div class="l"><span class="k">Autres éléments de la configuration</span><span class="v">calculés par le configurateur</span><span class="p">' + (ecart > 0 ? '+\u00a0' : '−\u00a0') + money(Math.abs(ecart)) + '</span></div>';
    }
    if (!isNaN(tot) && tot > 0) html += '<div class="tot"><span>Total TTC</span><span>' + money(tot) + '</span></div>';
    P.querySelector('.cer-plan__lignes').innerHTML = html || '<p class="cer-plan__hint">Le détail apparaît au fil de vos choix.</p>';
  }


  // ── Images jointes au panier (vues dessinées, rendues en JPEG) ──
  function svgToJpeg(svg, w, h) {
    return new Promise(function (resolve) {
      var c = svg.cloneNode(true);
      c.setAttribute('width', w); c.setAttribute('height', h);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var src = new XMLSerializer().serializeToString(c);
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL('image/jpeg', 0.9)); } catch (e) { resolve(''); }
      };
      img.onerror = function () { resolve(''); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    });
  }
  var OFF = null;
  function offscreen() {
    if (OFF) return OFF;
    OFF = document.createElement('div');
    OFF.style.cssText = 'position:absolute;left:-10000px;top:0;width:10px;height:10px;overflow:hidden';
    OFF.innerHTML = ['plan', 'face', 'gauche', 'droite', 'fond'].map(function (v) { return '<svg id="cer-off-' + v + '" xmlns="http://www.w3.org/2000/svg"></svg>'; }).join('');
    document.body.appendChild(OFF);
    return OFF;
  }
  var IMG_STATE = { sig: '', busy: null };
  // vues 3D du devis : faites à l'ajout au panier seulement (la 3D n'est jamais chargée d'avance), 12 s au plus, sinon devis sans elles
  var V3 = { sig: '', urls: null, refus: '' };
  function ajout3d() { if (V3.urls) V3.urls.forEach(function (u, i) { var x = document.createElement('input'); x.type = 'hidden'; x.name = 'cer_plan[vues][3d' + (i + 1) + ']'; x.value = u; form.appendChild(x); }); }
  function vues3d(sig, bouton) {
    if (V3.sig === sig || V3.refus === sig || !window.CER_3D || !window.CER_3D.vue3d) return Promise.resolve();
    var lib = bouton && bouton.textContent; if (bouton) bouton.textContent = 'Préparation des vues 3D…';
    var charge = window.CerVue3D ? Promise.resolve(window.CerVue3D) : new Promise(function (res, rej) { var s = document.createElement('script'); s.src = window.CER_3D.vue3d; s.onload = function () { window.CerVue3D ? res(window.CerVue3D) : rej(); }; s.onerror = rej; document.head.appendChild(s); });
    var fait = charge.then(function (V) { return V.vuesDevis ? V.vuesDevis() : null; });
    return Promise.race([fait, new Promise(function (res) { setTimeout(function () { res('delai'); }, 12000); })]).then(function (r) {
      if (Array.isArray(r) && r.length) { V3.sig = sig; V3.urls = r; Array.prototype.forEach.call(form.querySelectorAll('input[name^="cer_plan[vues][3d"]'), function (e) { e.remove(); }); ajout3d(); }
      else V3.refus = sig;
    }, function () { V3.refus = sig; }).then(function () { if (bouton) bouton.textContent = lib; });
  }
  function signature() { return JSON.stringify([ST.cfg, ST.menus.map(function (m) { return [m.preset, m.wall, m.pos, m.rail, m.opt, m.seuil]; }), ST.ext, ST.site]); }
  function attach() {
    if (!LAST) return Promise.resolve(false);
    var sig = signature();
    if (sig === IMG_STATE.sig && form.querySelector('input[name="cer_plan[config]"]')) return Promise.resolve(true);
    if (IMG_STATE.busy) return IMG_STATE.busy;
    offscreen();
    var jobs = [], d = LAST.d, scales = {};
    ST.scaleBar = true; ST.scale = E.commonScale(d, 380, 280); ST.planScale = null;
    ['plan', 'face', 'gauche', 'droite', 'fond'].forEach(function (v) {
      var svg = document.getElementById('cer-off-' + v);
      if (v === 'plan') { svg.setAttribute('viewBox', '0 0 480 340'); E.drawPlan(svg, d, 480, 340); jobs.push(svgToJpeg(svg, 1440, 1020).then(function (u) { return [v, u]; })); }
      else { svg.setAttribute('viewBox', '0 0 380 280'); E.drawElev(svg, d, v, 380, 280); jobs.push(svgToJpeg(svg, 1330, 980).then(function (u) { return [v, u]; })); }
      scales[v] = parseFloat(svg.getAttribute('data-sc')) || null; // unités du dessin par mètre : impression à l'échelle dans le devis
    });
    IMG_STATE.busy = Promise.all(jobs).then(function (res) {
      Array.prototype.forEach.call(form.querySelectorAll('input[name^="cer_plan["]'), function (e) { e.remove(); });
      var add = function (n, v) { var i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; form.appendChild(i); };
      res.forEach(function (r) { if (r[1]) add('cer_plan[vues][' + r[0] + ']', r[1]); });
      if (V3.sig === sig) ajout3d(); // vues 3D déjà faites pour cette configuration
      add('cer_plan[config]', JSON.stringify({
        v: CFG.version || '', kind: CFG.kind, cfg: ST.cfg, ext: ST.ext, site: ST.site,
        menus: ST.menus.map(function (m) { return { preset: m.preset, label: m.siteLabel || m.label, code: m.code, type: m.type, lw: m.lw, lh: m.lh, wall: m.wall, pos: m.pos, seuil: m.seuil, rail: m.rail, opt: m.opt }; }),
        gdoor: LAST.gdoor, dims: dimsList(LAST), warnings: E.menuWarnings(d),
        scales: scales, vb: { elev: [380, 280], plan: [480, 340] }, d: { L: d.L, P: d.P, htL: d.htL, htP: d.htP, intL: d.intL, intP: d.intP, hInt: d.hInt, hExt: d.hExt, rH: d.rH, soub: d.base || 0, pente: d.pente, toit: d.toit }
      }));
      IMG_STATE.sig = sig; IMG_STATE.busy = null;
      return true;
    });
    return IMG_STATE.busy;
  }

  // ── Mise à jour (après chaque choix, avec un léger délai) ──
  var tmr = null, imgTmr = null;
  // Questions masquées par les conditions du formulaire : leurs saisies sont effacées. Le serveur les ignore au panier, alors que le
  // formulaire continuait de les compter dans le prix affiché (ex. extension saisie puis « NON » : surface de toiture et pose gonflées,
  // garage 7,5 × 3 affiché 9 659 € au lieu de 8 196,50 €). Les listes déroulantes ne comptent pas et restent telles quelles.
  var purges = 0; // au plus 3 passes de suite (si le formulaire remettait une valeur par défaut, pas de boucle)
  function purgeMasques() {
    var fait = false;
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-container'), function (c) {
      if (!c.classList.contains('wapf-hide') && !c.closest('.wapf-hide')) return;
      garder(c);
      Array.prototype.forEach.call(c.querySelectorAll('input'), function (i) {
        if (i.type === 'hidden' || i.type === 'button' || i.type === 'submit') return;
        if (i.type === 'radio' || i.type === 'checkbox') {
          if (!i.checked) return;
          i.checked = false; var sw = i.closest('.wapf-swatch, label'); if (sw) sw.classList.remove('wapf-checked');
          i.dispatchEvent(new Event('change', { bubbles: true })); fait = true;
        } else if (i.value !== '') {
          i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); fait = true;
        }
      });
    });
    return fait;
  }
  // ── Choix gardés quand on change une option en amont (Antony, 13/10/2026 : passer d'ossature à madrier « fout le bordel ») ──
  // La réponse d'une question masquée par les conditions est notée avant d'être effacée. Quand la question revient, ou que sa jumelle
  // de l'autre système apparaît (« Porte classique ossature » / « Porte classique », « Hublot 91cm sur ossature » / « Hublot 91cm »),
  // la même réponse est recochée. Une question obligatoire nouvelle qui bloque la suite (épaisseur des madriers, pignon) reçoit le choix
  // le moins cher, signalé au client. Un modèle qui n'existe pas dans l'autre système reste à choisir, avec un mot pour le dire.
  var GARDE = {}, GARDE_L = {}, CASCADE = false, reprises = 0, VUS = null; // VUS : questions visibles au passage précédent
  var normQ = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(\+[^)]*\)/g, ' ')
      .replace(/\b(sur\s+)?(l'\s*)?(ossature(\s+bois)?|madriers?)\b/g, ' ').replace(/[^a-z0-9,]+/g, ' ').trim();
  };
  var cleQ = function (c) {
    var i = c.querySelector('input:not([type=hidden]), select'), m = i && /_clone_\d+/.exec(i.name || '');
    return { nom: i ? String(i.name).replace(/\[\]$/, '') : '', lab: normQ((c.querySelector('.wapf-field-label') || {}).textContent) + (m ? m[0] : '') };
  };
  function garder(c) {
    var ins = c.querySelectorAll('input[type=radio]:checked, input[type=checkbox]:checked'), nb = c.querySelector('input[type=number], input[type=text]'), v = null;
    if (ins.length) v = { choix: Array.prototype.map.call(ins, function (i) { return i.getAttribute('data-wapf-label') || ''; }) };
    else if (nb && nb.value !== '') v = { val: nb.value };
    if (!v) return;
    var k = cleQ(c); if (k.nom) GARDE[k.nom] = v; if (k.lab) GARDE_L[k.lab] = v; CASCADE = true;
  }
  function reprendre() {
    var fait = false, vues = [], cachees = [];
    var vide = function (c) {
      var ins = c.querySelectorAll('input[type=radio], input[type=checkbox]'), nb = c.querySelector('input[type=number], input[type=text]');
      return ins.length ? !Array.prototype.some.call(ins, function (i) { return i.checked; }) : (!!nb && nb.value === '');
    };
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-container'), function (c) {
      if (/wapf-field-(calc|p|section)\b/.test(c.className) || !c.querySelector('input[type=radio], input[type=checkbox], input[type=number], input[type=text]')) return;
      (c.classList.contains('wapf-hide') || c.closest('.wapf-hide') ? cachees : vues).push(c);
    });
    var avant = VUS; VUS = {}; vues.forEach(function (c) { VUS[cleQ(c).nom] = 1; });
    vues.forEach(function (c) {
      if (!vide(c)) {
        // question qui réapparaît avec un choix par défaut du site (pente 14° du 1 pan après un 25° en 2 pans) : le choix du client l'emporte
        var k0 = cleQ(c), g0 = avant && !avant[k0.nom] && (GARDE[k0.nom] || GARDE_L[k0.lab]);
        if (!g0 || !g0.choix) return;
        var r0 = Array.prototype.filter.call(c.querySelectorAll('input[type=radio]'), function (i) { return g0.choix.some(function (l) { return normQ(l) === normQ(i.getAttribute('data-wapf-label')); }); })[0];
        delete GARDE[k0.nom]; delete GARDE_L[k0.lab];
        if (r0 && !r0.checked) { cocher(r0); fait = true; }
        return;
      }
      var ins = Array.prototype.slice.call(c.querySelectorAll('input[type=radio], input[type=checkbox]')), nb = c.querySelector('input[type=number], input[type=text]');
      var k = cleQ(c), g = GARDE[k.nom] || GARDE_L[k.lab];
      if (g) {
        delete GARDE[k.nom]; delete GARDE_L[k.lab];
        if (g.val != null && nb) { saisir(nb, g.val); fait = true; return; }
        var pris = ins.filter(function (i) { return (g.choix || []).some(function (l) { return normQ(l) === normQ(i.getAttribute('data-wapf-label')); }); });
        if (pris.length) { pris.forEach(cocher); fait = true; return; }
        // modèle absent de cette version : le plus proche (mêmes mots et mêmes cotes), sinon le client choisit
        var p2 = ins[0] && ins[0].type === 'radio' ? proche(ins, (g.choix || [])[0]) : null;
        if (p2) { cocher(p2); mot(c, 'Votre modèle précédent n\u2019existe pas dans cette version : nous avons pris le plus proche, « ' + (p2.getAttribute('data-wapf-label') || '').trim() + ' ». Modifiez-le si besoin.'); fait = true; return; }
        if (ins.length) mot(c, 'Votre choix précédent n\u2019existe pas dans cette version : choisissez à nouveau ici.');
        return;
      }
    });
    if (fait || !CASCADE) return fait;
    // question nouvelle (obligatoire ou non : l'épaisseur des madriers ne l'est pas mais conditionne tout le reste) qui ferme le formulaire alors que des réponses du client attendent derrière elle (épaisseur des
    // madriers après « Madrier ») : le choix le moins cher, pour que la suite revienne. Jamais ailleurs : une question que le client
    // n'a pas encore abordée n'est pas cochée à sa place.
    var c = vues[vues.length - 1];
    if (!c || !vide(c) || GARDE[cleQ(c).nom] || GARDE_L[cleQ(c).lab]) return false;
    var ins = Array.prototype.slice.call(c.querySelectorAll('input[type=radio]')); if (!ins.length) return false;
    // une vraie réponse attend derrière (pas seulement les « Non » cochés d'office par nos dessins)
    var vraie = function (g) { return g && (g.choix ? g.choix.some(function (l) { return !/^non\b/i.test(String(l).trim()); }) : (g.val !== '' && parseFloat(g.val) !== 0)); };
    var attend = cachees.some(function (h) { return vraie(GARDE[cleQ(h).nom]) && (c.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING); });
    if (!attend) return false;
    var prix = function (i) { var v = numTxt(pastilleDe(c, i)); return isNaN(v) ? 0 : v; };
    cocher(ins.slice().sort(function (a, b) { return prix(a) - prix(b); })[0]);
    mot(c, 'Choisi d\u2019office pour garder la suite de votre configuration : modifiez-le si besoin.');
    return true;
  }
  var MOTS_VIDES = /^(porte|fenetre|en|de|du|des|cm|m|l|h|x|avec|et|la|le|les|pour|sur|a)$/;
  var jetons = function (s) { return normQ(s).replace(/(\d)\s*x\s*(\d)/g, '$1 $2').split(' ').filter(function (w) { return w && !MOTS_VIDES.test(w); }); };
  function proche(ins, lab) {
    if (!lab) return null;
    var J = jetons(lab), best = null, bs = 0;
    ins.forEach(function (i) {
      var K = jetons(i.getAttribute('data-wapf-label')), s = 0;
      J.forEach(function (w) { if (K.indexOf(w) >= 0) s += /\d/.test(w) ? 2 : 1; });
      if (s > bs) { bs = s; best = i; }
    });
    return bs >= 2 ? best : null;
  }
  function mot(c, txt) {
    var al = c.querySelector('.cer-repris'); if (!al) { al = document.createElement('p'); al.className = 'cer-vg-alerte cer-repris'; c.insertBefore(al, c.firstChild); }
    al.textContent = txt; clearTimeout(al._t); al._t = setTimeout(function () { al.remove(); }, 12000);
  }
  function schedule(ms, keepPlace) {
    clearTimeout(tmr);
    tmr = setTimeout(function () {
      try { if (purges < 3 && purgeMasques()) { purges++; schedule(150, keepPlace); return; } } catch (e) { if (window.console) console.warn('[Cerisier masqués]', e); }
      purges = 0;
      // réponses en attente : recochées dès que leur question revient (à chaque passage, pas seulement juste après un effacement ;
      // le passage tient aussi à jour la liste des questions visibles)
      try { if (reprises < 15 && reprendre()) { reprises++; schedule(60, keepPlace); return; } } catch (e) { if (window.console) console.warn('[Cerisier reprise]', e); }
      reprises = 0; CASCADE = false;
      try { read(); } catch (e) { LAST = null; if (window.console) console.warn('[Cerisier plan]', e); }
      draw();
      try { habiller(); } catch (e) { if (window.console) console.warn('[Cerisier habillage]', e); }
      try { vignettes(); } catch (e) { if (window.console) console.warn('[Cerisier vignettes]', e); }
      clearTimeout(imgTmr);
      imgTmr = setTimeout(function () { attach(); }, 1500);
    }, reprises > 0 ? Math.min(ms == null ? 120 : ms, 60) : (ms == null ? 120 : ms)); // pendant une reprise, le formulaire réagit tout de suite : pas d'attente
  }

  // ── Vignettes (validées par Antony le 13/10/2026, mail à Bérénice du même jour) : extension de toiture, hauteur des murs,
  //    barre de progression, message du toit plat au bon moment. Les champs du site restent la seule source des prix :
  //    les vignettes ne font que les remplir ; ils sont cachés (classe cer-vg-cache), jamais retirés ni effacés. ──
  var cont = function (fid) { return fid ? form.querySelector('.wapf-field-container[for="' + fid + '"]') : null; };
  var masqueWapf = function (c) { return !c || c.classList.contains('wapf-hide') || !!c.closest('.wapf-hide'); };
  var radioLab = function (fid, re, type) { var c = cont(fid); return c ? Array.prototype.filter.call(c.querySelectorAll('input[type=' + (type || 'radio') + ']'), function (i) { return re.test(i.getAttribute('data-wapf-label') || ''); })[0] : null; };
  var cocher = function (i) { if (!i || i.checked) return; (i.closest('label') || i).click(); if (!i.checked) i.click(); };
  var saisir = function (i, v) { if (!i) return; i.value = String(v); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); };
  var cacher = function (el, on) { if (el) el.classList.toggle('cer-vg-cache', on !== false); };
  var nombre = function (c) { return c ? c.querySelector('input[type=number]') : null; };
  var valeur = function (i) { var v = i ? parseFloat(String(i.value).replace(',', '.')) : 0; return isNaN(v) ? 0 : v; };
  var pastilleDe = function (c, i) { var h = i ? (i.closest('label') || i.parentElement).querySelector('.wapf-pricing-hint') : c && c.querySelector('.wapf-pricing-hint'); return h ? h.textContent.trim() : ''; };
  var titreQ = function (c, txt) { var l = c && c.querySelector('.wapf-field-label'); if (!l) return; var w = document.createTreeWalker(l, NodeFilter.SHOW_TEXT), t;
    while ((t = w.nextNode())) { if (t.nodeValue.trim() && !(t.parentElement && t.parentElement.closest('.wapf-pricing-hint'))) { if (t.nodeValue !== txt) t.nodeValue = txt; return; } } };
  var mt = function (v) { return v.toFixed(2).replace('.', ',') + ' m'; };
  // prix d'un champ « formule » pour une valeur donnée, calculé par WAPF lui-même (même calcul que le prix affiché)
  function prixFx(inp, n) {
    try {
      var $ = window.jQuery, U = window.WAPF && WAPF.Util, Pr = window.WAPF && WAPF.Pricing; if (!$ || !U || !Pr || !inp) return null;
      var $a = $(inp); if ($a.data('wapfPricetype') !== 'fx') return null;
      var $r = $a.parents().filter(function () { return !!$(this).data('$totals'); }).first(); if (!$r.length) return null;
      var fx = String($a.data('wapfPrice') || '0'), h = U.getQty($r), pb = U.currentProductPrice($r), f = ($r.data('optionsTotal') || 0) / h;
      var e = U.replaceFx(fx, h, pb, n, $r, f); e = U.evalVars(Pr.variables, e, n, h, pb, $a, $r, f);
      return Pr.addTax(U.parseFx(e, $r, true, $a), $r.data('tax') || 1);
    } catch (er) { return null; }
  }
  // dessin du moteur pour une variante de la configuration en cours (débords, fermetures, rehausses), sans cotes ni textes
  var CUR = { ext: { face: 0, fond: 0, gauche: 0, droite: 0 }, reh: 0, hcp: 0 };
  function picto(o) {
    var sv = { cfg: ST.cfg, ext: ST.ext, scale: ST.scale, planScale: ST.planScale, scaleBar: ST.scaleBar, site: ST.site, picto: ST.picto, pr: ST.pictoReh, pp: ST.pictoPerson, pv: ST.pictoVehicule };
    try {
      ST.cfg = Object.assign({}, sv.cfg, o.cfg || {}); ST.ext = o.ext || {}; if (o.nreh != null) ST.cfg['f-reh'] = String(o.nreh);
      if (sv.site) {
        var s0 = sv.site, s1 = Object.assign({}, s0), c = CUR.ext;
        if (s0.ov && o.ov) { var e = Object.assign({ face: 0, fond: 0, gauche: 0, droite: 0 }, o.ov);
          s1.ov = { L: s0.ov.L - c.gauche + e.gauche, R: s0.ov.R - c.droite + e.droite, F: s0.ov.F - c.face + e.face, B: s0.ov.B - c.fond + e.fond };
          if (s0.htL != null) s1.htL = r2(s0.htL - c.gauche - c.droite + e.gauche + e.droite);
          if (s0.htP != null) s1.htP = r2(s0.htP - c.face - c.fond + e.face + e.fond); }
        if (o.nreh != null && s0.hInt != null) s1.hInt = r2(s0.hInt + (o.nreh - CUR.reh) * 0.13);
        if (o.hSite != null) s1.hInt = o.hSite; // carport : hauteur sous ferme donnée
        ST.site = s1;
      }
      ST.picto = true; ST.pictoReh = o.reh || 0; ST.pictoPerson = o.person || false; ST.pictoVehicule = o.veh || null; ST.scale = o.scale || null; ST.planScale = null; ST.scaleBar = false;
      var d = E.calcDims();
      if (o.fit) return E.elevFit(d, o.view, o.w, o.h);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 ' + o.w + ' ' + o.h); svg.setAttribute('width', '100%'); svg.setAttribute('aria-hidden', 'true');
      if (o.view === 'plan') E.drawPlan(svg, d, o.w, o.h); else E.drawElev(svg, d, o.view, o.w, o.h);
      return o.hInt ? d.hInt : svg.outerHTML;
    } catch (er) { return ''; } finally {
      ST.cfg = sv.cfg; ST.ext = sv.ext; ST.scale = sv.scale; ST.planScale = sv.planScale; ST.scaleBar = sv.scaleBar; ST.site = sv.site; ST.picto = sv.picto; ST.pictoReh = sv.pr; ST.pictoPerson = sv.pp; ST.pictoVehicule = sv.pv;
    }
  }
  var bloc = function (q, cle) { // conteneur des vignettes, juste sous le titre de la question
    var b = q.querySelector('.cer-vg[data-vg="' + cle + '"]');
    if (!b) { b = document.createElement('div'); b.className = 'cer-vg'; b.setAttribute('data-vg', cle); var l = q.querySelector('.wapf-field-label'); l.parentNode.insertBefore(b, l.nextSibling); }
    return b;
  };
  var carte = function (attrs, on, pic, titre, sous, pill) {
    return '<button type="button" class="cer-vg__c' + (on ? ' on' : '') + '" ' + attrs + '><span class="cer-vg__pic">' + pic + '</span><b>' + titre + '</b>' + (sous ? '<small>' + sous + '</small>' : '') + (pill ? '<span class="cer-pill' + (/^Inclus/.test(pill) ? ' cer-pill--0' : '') + '">' + pill + '</span>' : '') + '</button>';
  };
  var NOM = { abri: 'L’abri', garage: 'Le garage' };
  // 1. Extension de toiture : oui / non, profondeur de chaque côté, côtés fermés vus de dessus
  // Règle d'Antony (13/10/2026) : une extension dans la pente (côté égout) garde au moins 1 m de poteau ;
  // profondeur au plus, par pas de 0,5 m (débord standard compris). Infini sur les autres côtés et les toits plats.
  function extMax(k) {
    var E = window.CerPlan; if (!E || !E.calcDims || CFG.kind === 'carport') return Infinity;
    var d = E.calcDims(); if (!d || d.isFlat) return Infinity;
    var desc = d.toit === '2PANS' ? (k === 'gauche' || k === 'droite') : d.toit === '1PAN' ? k === d.orient : false, t = Math.tan(d.penteRad || 0);
    if (!desc || t <= 0) return Infinity;
    var std = { face: 0.20, fond: 0.10, gauche: 0.20, droite: 0.20 }[k] || 0.2;
    var m = ((d.base || 0) + d.hExt - 1.0) / t - std; // hauteur au-dessus d'1 m de poteau, divisée par la pente
    return Math.max(0, Math.floor(m * 2 + 1e-6) / 2);
  }
  function vgExtension() {
    var X = M.ext, q = X && cont(X.q); if (!q) return;
    var b = q.querySelector('.cer-vg[data-vg="ext"]');
    if (masqueWapf(q) || !LAST) { if (b) b.remove(); return; }
    var non = radioLab(X.q, /^non/i), oui = radioLab(X.q, /^oui/i); if (!non || !oui) return;
    if (!oui.checked && !non.checked) { cocher(non); return; } // « Non » coché pour de vrai (question obligatoire cachée par les dessins, sinon panier refusé)
    var K = ['face', 'gauche', 'droite', 'fond'], NOMS = { face: 'Devant', gauche: 'À gauche', droite: 'À droite', fond: 'Derrière' };
    var inp = {}; K.forEach(function (k) { inp[k] = nombre(cont(X.m[k])); });
    K.forEach(function (k) { CUR.ext[k] = oui.checked ? valeur(inp[k]) : 0; });
    var MX = {}, rabot = []; K.forEach(function (k) { MX[k] = extMax(k);
      if (CUR.ext[k] > MX[k] + 1e-6 && inp[k]) { rabot.push(k); saisir(inp[k], MX[k] >= 0.5 ? MX[k] : ''); CUR.ext[k] = MX[k] >= 0.5 ? MX[k] : 0; } });
    // champs d'origine cachés : boutons oui/non, quatre cases, image, questions de remplissage
    cacher(q.querySelector('.wapf-field-input')); cacher(q.querySelector('.wapf-field-description'));
    K.forEach(function (k) { cacher(cont(X.m[k])); cacher(cont(X.rq[k])); cacher(cont(X.rs[k])); });
    var all = Array.prototype.slice.call(form.querySelectorAll('.wapf-field-container')), i0 = all.indexOf(q), iMax = Math.max.apply(null, K.map(function (k) { return all.indexOf(cont(X.m[k])); }));
    all.slice(i0 + 1, iMax).forEach(function (c) { if (c.classList.contains('wapf-field-img') || c.querySelector('img') && !c.querySelector('input')) cacher(c); });
    titreQ(q, 'Voulez-vous prolonger le toit ?');
    // côtés fermés : cases du site (noms absolus Gauche / Face / Droite / Fond) dans l'ordre flanc, bout, flanc
    var COTES = { gauche: [['Face', 'Avant'], ['Gauche', 'Côté'], ['Fond', 'Arrière']], droite: [['Face', 'Avant'], ['Droite', 'Côté'], ['Fond', 'Arrière']],
      face: [['Gauche', 'Gauche'], ['Face', 'Devant'], ['Droite', 'Droite']], fond: [['Gauche', 'Gauche'], ['Fond', 'Derrière'], ['Droite', 'Droite']] };
    var CLE = { gauche: { Face: 'a', Gauche: 'c', Fond: 'b' }, droite: { Face: 'a', Droite: 'c', Fond: 'b' }, face: { Gauche: 'a', Face: 'c', Droite: 'b' }, fond: { Gauche: 'a', Fond: 'c', Droite: 'b' } };
    var cases = {}; K.forEach(function (k) { cases[k] = {}; COTES[k].forEach(function (c) { cases[k][c[0]] = radioLab(X.rs[k], new RegExp('^' + c[0] + '$', 'i'), 'checkbox'); }); });
    // question « fermer cette extension ? » (obligatoire pour le site, cachée ici) : « Non » tant que le client ne ferme aucun côté
    K.forEach(function (k) { var rq = cont(X.rq[k]); if (!rq || masqueWapf(rq) || !(CUR.ext[k] > 0)) return;
      var o2 = radioLab(X.rq[k], /^oui/i), n2 = radioLab(X.rq[k], /^non/i); if (n2 && o2 && !o2.checked && !n2.checked) cocher(n2); });
    var sig = JSON.stringify([oui.checked, non.checked, CUR.ext, K.map(function (k) { return [pastilleDe(cont(X.m[k])), COTES[k].map(function (c) { var x = cases[k][c[0]]; return x ? [x.checked, pastilleDe(null, x)] : 0; })]; }),
      ST.cfg && [ST.cfg['f-toit'], ST.cfg['f-orient'], ST.cfg['f-sys'], ST.cfg['f-bard'], ST.cfg['f-couv'], ST.cfg['f-lar'], ST.cfg['f-pro'], ST.cfg['f-reh'], ST.cfg['f-pente']], (ST.menus || []).length, MX, rabot]);
    if (b && b._sig === sig) return;
    b = bloc(q, 'ext'); b._sig = sig;
    var sans = { 'f-ext-ferm': 'non' }, Z = { face: 0, fond: 0, gauche: 0, droite: 0 }, ex = K.some(function (k) { return CUR.ext[k] > 0; }) ? Object.assign({}, CUR.ext) : { gauche: 1.5 }; // « Oui » : l'extension déjà choisie, sinon une à gauche
    var sc0 = picto({ cfg: sans, ov: ex, view: 'face', w: 360, h: 230, fit: true });
    var html = '<div class="cer-vg__g2">' + carte('data-vg-ext="non"', non.checked, picto({ cfg: sans, ov: Z, view: 'face', w: 360, h: 230, scale: sc0 }), 'Non', NOM[CFG.kind] + ' seul', '') +
      carte('data-vg-ext="oui"', oui.checked, picto({ cfg: sans, ov: ex, view: 'face', w: 360, h: 230, scale: sc0 }), 'Oui', 'terrasse couverte, bûcher, vélos…', '') + '</div>';
    if (oui.checked) {
      var vue = { face: 'gauche', fond: 'gauche', gauche: 'face', droite: 'face' };
      html += '<p class="cer-vg__h">De quel côté, et sur quelle profondeur ?</p><div class="cer-vg__g4">' + K.map(function (k) {
        var m = CUR.ext[k], pill = m ? pastilleDe(cont(X.m[k])) : '', o = {}; o[k] = m || 1.5;
        return '<div class="cer-vg__c' + (m ? ' on' : '') + '" data-vg-cote="' + k + '"><span class="cer-vg__pic">' + picto({ cfg: sans, ov: o, view: vue[k], w: 260, h: 190 }) + '</span><b>' + NOMS[k] + '</b>' +
          '<span class="cer-vg__st"><button type="button" data-vg-pas="-1" aria-label="Moins profond">−</button><input class="cer-vg__in" type="text" inputmode="decimal" data-vg-in="' + k + '" value="' + (m ? fr(m) : '0') + '" aria-label="Profondeur en mètres (ou en centimètres)"> m<button type="button" data-vg-pas="1" aria-label="Plus profond">+</button></span>' +
          (pill ? '<span class="cer-pill' + (/^Inclus/.test(pill) ? ' cer-pill--0' : '') + '">' + pill + '</span>' : '') +
          (MX[k] < Infinity ? '<small class="cer-vg__max">' + (MX[k] >= 0.5 ? mt(MX[k]) + ' au plus, pour garder 1 m de poteau' : 'Pente trop forte : ajoutez une rehausse') + '</small>' : '') + '</div>';
      }).join('') + '</div>';
      if (rabot.length) html += '<p class="cer-vg-alerte">' + rabot.map(function (k) { return 'Extension ' + NOMS[k].toLowerCase() + ' ramenée à ' + (MX[k] >= 0.5 ? mt(MX[k]) : '0 m'); }).join(', ') +
        ' : au-delà, le toit descendrait à moins d\u20191 m du sol au bout de l\u2019extension. Pour une extension plus profonde, ajoutez une rehausse (hauteur des murs).</p>';
      var ferm = K.filter(function (k) { return CUR.ext[k] > 0 && cont(X.rq[k]); });
      if (ferm.length) {
        html += '<p class="cer-vg__h">Fermer des côtés ? <span>(touchez pour fermer, vu de dessus)</span></p>';
        ferm.forEach(function (k) {
          html += '<p class="cer-vg__s">Extension ' + NOMS[k].toLowerCase() + ' · ' + mt(CUR.ext[k]) + '</p><div class="cer-vg__g3" data-ferm>' + COTES[k].map(function (c) {
            var x = cases[k][c[0]], on = !!(x && x.checked), e2 = {}, o2 = {}; e2[k] = {}; e2[k][CLE[k][c[0]]] = 1; o2[k] = CUR.ext[k];
            var pill = x ? pastilleDe(null, x) : '';
            return carte('data-vg-ferm="' + k + '" data-vg-case="' + c[0] + '"', on, picto({ cfg: { 'f-ext-ferm': 'pleine' }, ov: o2, ext: e2, view: 'plan', w: 300, h: 220 }), c[1], '', pill);
          }).join('') + '</div>';
        });
      }
    }
    b.innerHTML = html;
    if (!b._ev) { b._ev = true;
      // profondeur tapée : « 1,10 » ou « 1.1 » en mètres, « 110 » en centimètres ; bornée au maximum du site et au mètre de poteau
      b.addEventListener('change', function (e) { var f = e.target.closest('[data-vg-in]'); if (!f) return;
        var k = f.getAttribute('data-vg-in'), i = nombre(cont(X.m[k])), v = parseFloat(String(f.value).replace(',', '.').replace(/[^\d.]/g, ''));
        if (isNaN(v)) v = 0; if (v > 10) v = v / 100; v = Math.round(v * 100) / 100;
        var mx = Math.min(i && parseFloat(i.max) || 5, extMax(k)); if (v > mx) v = mx >= 0.5 ? mx : 0; if (v > 0 && v < 0.3) v = 0.3;
        saisir(i, v > 0 ? v : ''); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-vg-in]')) { e.preventDefault(); e.target.blur(); } });
      b.addEventListener('click', function (e) {
      if (e.target.closest('[data-vg-in]')) return; // saisie au clavier : pas de 1 m d'office
      var t = e.target.closest('button');
      if (!t) { // clic sur un côté encore à 0 : 1 m d'office, puis − / + pour régler
        var cc = e.target.closest('[data-vg-cote]'); if (!cc) return; var kc = cc.getAttribute('data-vg-cote');
        if (!(CUR.ext[kc] > 0) && extMax(kc) >= 0.5) saisir(nombre(cont(X.m[kc])), Math.min(1, extMax(kc))); return; }
      e.preventDefault();
      if (t.getAttribute('data-vg-ext')) { cocher(t.getAttribute('data-vg-ext') === 'oui' ? oui : non); return; }
      var pas = t.getAttribute('data-vg-pas');
      if (pas) { var k = t.closest('[data-vg-cote]').getAttribute('data-vg-cote'), v = CUR.ext[k], d = +pas, i = nombre(cont(X.m[k])), mx = i && parseFloat(i.max) || 5;
        var nv = d > 0 ? (v < 1 ? 1 : Math.min(mx, Math.floor(v * 2 + 1e-9) / 2 + 0.5)) : (v <= 1 ? 0 : Math.ceil(v * 2 - 1e-9) / 2 - 0.5);
        if (d > 0) { var lim = extMax(k); if (lim < 0.5) return; nv = Math.min(nv, lim); } // 1 m de poteau au moins
        saisir(i, nv ? nv : ''); return; }
      var fk = t.getAttribute('data-vg-ferm');
      if (fk) { var cb = radioLab(X.rs[fk], new RegExp('^' + t.getAttribute('data-vg-case') + '$', 'i'), 'checkbox'), rqO = radioLab(X.rq[fk], /^oui/i), rqN = radioLab(X.rq[fk], /^non/i);
        if (!cb) return; if (!cb.checked) { cocher(rqO); cb.click(); }
        else { cb.click(); var reste = Array.prototype.some.call(cont(X.rs[fk]).querySelectorAll('input[type=checkbox]'), function (x) { return x.checked; }); if (!reste) cocher(rqN); } }
    }); }
  }
  // 2. Hauteur des murs : chaque hauteur dessinée (rehausses en orange, silhouette de 1,75 m), avec son prix
  function vgHauteur() {
    var R = M.reh, q = R && typeof R.n === 'string' && cont(R.q); if (!q) return;
    var b = q.querySelector('.cer-vg[data-vg="reh"]');
    if (masqueWapf(q) || !LAST) { if (b) b.remove(); return; }
    var non = radioLab(R.q, /^non/i), oui = radioLab(R.q, /^oui/i), nc = cont(R.n), n = nombre(nc); if (!non || !oui || !n) return;
    // hauteur standard cochée pour de vrai (13/10/2026) : la carte « standard » paraissait choisie alors que le bouton du site ne l'était pas ;
    // la question est obligatoire, le panier était refusé sans rien afficher, et il fallait recliquer pour voir la suite
    if (!oui.checked && !non.checked) { cocher(non); return; }
    var k0 = oui.checked ? Math.round(valeur(n)) : 0, mx = parseInt(n.max, 10) || 8, rien = !oui.checked && !non.checked; CUR.reh = k0; // rien : pas de carte présélectionnée
    cacher(q.querySelector('.wapf-field-input')); cacher(q.querySelector('.wapf-field-description')); cacher(nc);
    titreQ(q, 'Quelle hauteur de murs souhaitez-vous ?');
    var prix = []; for (var k = 0; k <= mx; k++) prix.push(k ? prixFx(n, k) : 0);
    var sig = JSON.stringify([k0, rien, prix, ST.cfg && [ST.cfg['f-toit'], ST.cfg['f-orient'], ST.cfg['f-sys'], ST.cfg['f-bard'], ST.cfg['f-lar'], ST.cfg['f-pro'], ST.cfg['f-pente'], ST.cfg['f-couv']], CUR.ext, (ST.menus || []).length]);
    if (b && b._sig === sig) return;
    b = bloc(q, 'reh'); b._sig = sig;
    var sans = { 'f-ext-ferm': 'non' }, Z = { face: 0, fond: 0, gauche: 0, droite: 0 }, W = 260, H = 230;
    var sc = picto({ cfg: sans, ov: Z, nreh: mx, view: 'face', w: W, h: H, fit: true }), h0 = picto({ cfg: sans, ov: Z, nreh: 0, view: 'face', w: W, h: H, hInt: true });
    var plus = k0 >= 5 ? k0 : 5, choix = [[0, 'standard'], [1, '1 rehausse'], [2, '2 rehausses'], [3, '3 rehausses'], [4, '4 rehausses'], [plus, plus + ' rehausses']];
    b.innerHTML = '<div class="cer-vg__g3">' + choix.map(function (c, i) {
      var kk = c[0], dernier = i === 5, on = !rien && (dernier ? k0 >= 5 : k0 === kk);
      var pill = kk ? (prix[kk] != null ? '+' + money0(prix[kk]) : '') : 'Inclus';
      return '<div class="cer-vg__c' + (on ? ' on' : '') + '" data-vg-k="' + kk + '"><span class="cer-vg__pic">' + picto({ cfg: sans, ov: Z, nreh: kk, view: 'face', w: W, h: H, scale: sc, reh: kk, person: 0.82 }) + '</span>' +
        '<b>' + (typeof h0 === 'number' ? mt(h0 + 0.13 * kk) : c[1]) + '</b><small>' + c[1] + '</small>' +
        (dernier ? '<span class="cer-vg__st"><button type="button" data-vg-plus="-1" aria-label="Une rehausse de moins">−</button><span>' + plus + '</span><button type="button" data-vg-plus="1" aria-label="Une rehausse de plus">+</button></span>' : '') +
        (pill ? '<span class="cer-pill' + (kk ? '' : ' cer-pill--0') + '">' + pill + '</span>' : '') + '</div>';
    }).join('') + '</div><p class="cer-vg__leg"><u class="r"></u>rehausses ajoutées (13 cm chacune)<u class="p"></u>personne de 1,75 m · hauteur intérieure sous les murs</p>';
    if (!b._ev) { b._ev = true; b.addEventListener('click', function (e) {
      var pl = e.target.closest('[data-vg-plus]'), c = e.target.closest('[data-vg-k]'); if (!c) return; e.preventDefault();
      var kk = +c.getAttribute('data-vg-k'); if (pl) kk = Math.max(5, Math.min(mx, kk + +pl.getAttribute('data-vg-plus')));
      if (!kk) { cocher(non); return; }
      cocher(oui); saisir(nombre(cont(R.n)), kk);
    }); }
  }
  // 3 bis. Hauteur du carport (demande d'Antony, 13/10/2026 : « la rehausse du carport comme sur les abris ») : hauteur sous ferme
  //    en cartes, chacune avec un véhicule à l'échelle et son prix lu dans le champ du site, plus une hauteur au centimètre.
  //    Les prix suivent les paliers du site (2,10 m inclus ; jusqu'à 2,50 m ; 3,70 m ; 4,80 m).
  var HCP = [[2.1, 'standard · voiture', 'voiture'], [2.5, 'utilitaire, SUV avec coffre', 'utilitaire'], [3, 'fourgon aménagé', 'fourgon'], [3.7, 'camping-car', 'campingcar'], [4.8, 'engin agricole, poids lourd', 'engin']];
  function vgHauteurCp() {
    var R = M.reh, q = R && cont(R.q); if (!q) return;
    var b = q.querySelector('.cer-vg[data-vg="hcp"]');
    if (masqueWapf(q) || !LAST) { if (b) b.remove(); return; }
    var non = radioLab(R.q, /^non/i), oui = radioLab(R.q, /^oui/i); if (!non || !oui) return;
    if (!oui.checked && !non.checked) { cocher(non); return; } // question obligatoire : le standard est vraiment coché (leçon du 13/10)
    // champ de la hauteur : celui du type de poteau (12 × 12, 14 × 14, 12 × 12 capoté alu)
    var po = first(M.pot), ix = po && /alu/i.test(po.label) ? 2 : po && /14/.test(po.label) ? 1 : 0;
    var nc = R.n.map(cont).filter(function (c) { return c && !masqueWapf(c); })[0] || cont(R.n[ix]), n = nombre(nc); if (!n) return;
    var lo = parseFloat(n.min) || 2.1, hi = parseFloat(n.max) || 4.8;
    // poteau changé (12 × 12 → 14 × 14…) : le champ de hauteur n'est plus le même et arrive vide ou à 2,10 m ; la hauteur choisie suit
    var fid = nc.getAttribute('for'), change = CUR.hcpF && CUR.hcpF !== fid; CUR.hcpF = fid;
    if (oui.checked && CUR.hcp > lo && (n.value === '' || (change && Math.abs(valeur(n) - CUR.hcp) > 0.004))) { saisir(n, CUR.hcp); return; }
    var h0 = oui.checked && valeur(n) > lo ? Math.round(valeur(n) * 100) / 100 : lo; CUR.hcp = h0;
    cacher(q.querySelector('.wapf-field-input')); cacher(q.querySelector('.wapf-field-description')); R.n.forEach(function (f) { cacher(cont(f)); });
    titreQ(q, 'Quelle hauteur de passage souhaitez-vous ?');
    var prix = HCP.map(function (c) { return c[0] > lo ? prixFx(n, c[0]) : 0; }), libre = !HCP.some(function (c) { return Math.abs(c[0] - h0) < 0.005; });
    var sig = JSON.stringify([h0, prix, libre && prixFx(n, h0), ST.cfg && [ST.cfg['f-toit'], ST.cfg['f-pente'], ST.cfg['f-lar'], ST.cfg['f-pro'], ST.cfg['f-pot'], ST.cfg['f-ados'], ST.cfg['f-bandeau'], ST.cfg['f-couv']]]);
    if (b && b._sig === sig) return;
    var foc = b && b.querySelector('.cer-vg__in:focus'); if (foc) return; // pas de reconstruction pendant la saisie
    b = bloc(q, 'hcp'); b._sig = sig;
    var W = 260, H = 230, sans = { 'f-clos': 'aucune' }, sc = picto({ cfg: sans, hSite: hi, view: 'face', w: W, h: H, fit: true });
    var pill = function (v) { return v == null ? '' : v > 0.004 ? '+' + money0(Math.round(v * 100) / 100) : 'Inclus'; };
    b.innerHTML = '<div class="cer-vg__g3">' + HCP.map(function (c, i) {
      return '<div class="cer-vg__c' + (!libre && Math.abs(c[0] - h0) < 0.005 ? ' on' : '') + '" data-vg-h="' + c[0] + '"><span class="cer-vg__pic">' + picto({ cfg: sans, hSite: c[0], view: 'face', w: W, h: H, scale: sc, veh: c[2] }) + '</span>' +
        '<b>' + mt(c[0]) + '</b><small>' + c[1] + '</small>' + (pill(prix[i]) ? '<span class="cer-pill' + (prix[i] > 0 ? '' : ' cer-pill--0') + '">' + pill(prix[i]) + '</span>' : '') + '</div>';
    }).join('') +
      '<div class="cer-vg__c cer-vg__c--libre' + (libre ? ' on' : '') + '" data-vg-h="libre"><span class="cer-vg__pic">' + picto({ cfg: sans, hSite: h0, view: 'face', w: W, h: H, scale: sc }) + '</span>' +
        '<b>Sur mesure</b><small>de ' + mt(lo) + ' à ' + mt(hi) + '</small><span class="cer-vg__st"><input class="cer-vg__in" type="text" inputmode="decimal" data-vg-hin value="' + fr(h0) + '" aria-label="Hauteur sous ferme en mètres (ou en centimètres)"> m</span>' +
        (libre && h0 > lo ? '<span class="cer-pill">' + pill(prixFx(n, h0)) + '</span>' : '') + '</div>' +
      '</div><p class="cer-vg__leg">Hauteur sous ferme : le passage libre sous la charpente, au milieu. Véhicules à l\u2019échelle : voiture 1,50 m, utilitaire 2,30 m, fourgon aménagé 2,80 m, camping-car 3,30 m.</p>';
    if (!b._ev) { b._ev = true;
      var poser = function (v) {
        var po2 = first(M.pot), ix2 = po2 && /alu/i.test(po2.label) ? 2 : po2 && /14/.test(po2.label) ? 1 : 0;
        if (!(v > lo + 0.001)) { CUR.hcp = lo; cocher(non); return; }
        CUR.hcp = v; cocher(oui);
        var n2 = nombre(R.n.map(cont).filter(function (c) { return c && !masqueWapf(c); })[0] || cont(R.n[ix2])); if (n2) saisir(n2, v);
      };
      b.addEventListener('click', function (e) {
        var c = e.target.closest('[data-vg-h]'); if (!c || e.target.closest('[data-vg-hin]')) return; e.preventDefault();
        var v = c.getAttribute('data-vg-h');
        if (v === 'libre') { var inp = c.querySelector('[data-vg-hin]'); if (inp) { inp.focus(); inp.select(); } return; }
        poser(parseFloat(v));
      });
      b.addEventListener('change', function (e) {
        var f = e.target.closest('[data-vg-hin]'); if (!f) return;
        var v = parseFloat(String(f.value).replace(',', '.').replace(/[^\d.]/g, '')); if (isNaN(v)) return;
        if (v > 10) v = v / 100; // saisie en centimètres
        v = Math.round(Math.max(lo, Math.min(hi, v)) * 100) / 100; f.value = fr(v); f.blur(); poser(v);
      });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-vg-hin]')) { e.preventDefault(); e.target.blur(); } });
    }
  }
  // 4. Toit plat en madriers : le message des 20 cm seulement pour ces clients, avec leurs dimensions hors tout
  function vgToitPlat() {
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-p'), function (c) { if (/toit plat/i.test(c.textContent) && /majorer/i.test(c.textContent)) cacher(c); });
    var ref = cont(M.sys && M.sys[0]) || cont(M.toit && M.toit[0]); if (!ref) return;
    var el = form.querySelector('.cer-vg-tp');
    var montrer = ST.cfg && ST.cfg['f-toit'] === 'TOIT_PLAT' && /^madrier/.test(ST.cfg['f-sys'] || '') && !masqueWapf(ref);
    if (!montrer) { if (el) el.remove(); return; }
    var L0 = (parseFloat(ST.cfg['f-lar']) || 0) / 100, P0 = (parseFloat(ST.cfg['f-pro']) || 0) / 100;
    // cotes données par Bérénice le 13/10/2026 : en madriers toit plat (28 et 45 mm), l'extérieur du bardage fait 17 cm de moins que la dimension choisie
    var txt = 'Toit plat en madriers : votre ' + (CFG.kind === 'garage' ? 'garage' : 'abri') + ' de ' + fr(L0) + ' × ' + fr(P0) + ' m mesure <b>' + fr(L0 - 0.17) + ' × ' + fr(P0 - 0.17) + ' m</b> à l\u2019extérieur du bardage ; les madriers dépassent de 10 cm à chaque angle.';
    if (!el) { el = document.createElement('p'); el.className = 'cer-vg-tp'; ref.parentNode.insertBefore(el, ref.nextSibling); }
    if (el.innerHTML !== txt) el.innerHTML = txt;
  }
  // 3. Barre de progression : étapes du formulaire, faites cochées, reste visible en haut
  var COURT = [[/dimension/i, 'Dimensions'], [/type de toiture/i, 'Toit'], [/syst.me constructif/i, 'Murs'], [/bardage/i, 'Murs'], [/menuiserie|porte|fen.tre/i, 'Ouvertures'],
    [/hauteur de murs|rehausser|hauteur/i, 'Hauteur'], [/plancher ext/i, 'Terrasse'], [/plancher/i, 'Plancher'], [/prolonger le toit|extension/i, 'Extension'], [/couverture/i, 'Couverture'],
    [/poteau/i, 'Poteaux'], [/fermeture/i, 'Fermetures'], [/isolation/i, 'Isolation'], [/gouttière|goutti/i, 'Gouttière'], [/livraison/i, 'Livraison'], [/pose|montage/i, 'Pose']];
  function vgProgression() {
    var etapes = [];
    Array.prototype.forEach.call(form.querySelectorAll('.cer-step-h'), function (h) {
      var sec = h.closest('.wapf-section'); if (!sec || sec.closest('.wapf-hide') || !h.offsetParent) return;
      var t = h.textContent.replace(/\s+/g, ' ').trim(), n = (COURT.filter(function (r) { return r[0].test(t); })[0] || [0, t.split(/[?:]/)[0].slice(0, 14)])[1];
      var fait = Array.prototype.every.call(sec.querySelectorAll('.wapf-field-container.wapf-required'), function (c) {
        if (masqueWapf(c)) return true; var ins = c.querySelectorAll('input[type=radio],input[type=checkbox]'), sl = c.querySelector('select');
        if (ins.length) return Array.prototype.some.call(ins, function (i) { return i.checked; });
        if (sl) return !!sl.value; var nb = c.querySelector('input[type=number],input[type=text]'); return !nb || nb.value !== ''; });
      var last = etapes[etapes.length - 1];
      if (last && last.n === n) { last.fait = last.fait && fait; last.secs.push(sec); } else etapes.push({ n: n, fait: fait, secs: [sec] });
    });
    var bar = form.querySelector('.cer-prog');
    if (etapes.length < 3) { if (bar) bar.remove(); return; }
    var cur = 0; while (cur < etapes.length - 1 && etapes[cur].fait) cur++;
    var faites = etapes.filter(function (e) { return e.fait; }).length, N = etapes.length;
    var sig = JSON.stringify([cur, etapes.map(function (e) { return e.n + (e.fait ? 1 : 0); })]);
    if (!bar) { bar = document.createElement('div'); bar.className = 'cer-prog'; form.insertBefore(bar, form.firstChild);
      var hd = Array.prototype.filter.call(document.querySelectorAll('header, .site-header, #masthead'), function (h) { var p2 = getComputedStyle(h).position; return (p2 === 'fixed' || p2 === 'sticky') && h.offsetHeight < 200; })[0];
      if (hd) document.documentElement.style.setProperty('--cer-prog-top', hd.offsetHeight + 'px'); // sous l'en-tête fixe du thème
      bar.addEventListener('click', function (e) { var s2 = e.target.closest('[data-i]'); if (!s2 || !bar._et) return; var sec = bar._et[+s2.getAttribute('data-i')].secs[0];
        window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - 24, behavior: 'smooth' }); }); }
    bar._et = etapes; if (bar._sig === sig) return; bar._sig = sig;
    bar.innerHTML = '<div class="t"><b>Étape ' + (cur + 1) + ' sur ' + N + ' · ' + etapes[cur].n + '</b><span>' + Math.round(faites / N * 100) + ' % fait</span></div>' +
      '<div class="bar">' + etapes.map(function (e, i) { return '<i class="' + (e.fait ? 'd' : i === cur ? 'c' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="n">' + etapes.map(function (e, i) { return '<span data-i="' + i + '" class="' + (e.fait ? 'd' : i === cur ? 'c' : '') + '">' + (e.fait ? '✓ ' : '') + e.n + '</span>'; }).join('') + '</div>';
  }
  // 5. Menuiseries bois assorties au bardage (règle d'Antony, 13/10/2026 ; réglage « Menuiseries bois assorties au bardage ») :
  //    une porte ou une fenêtre en autoclave d'une autre teinte que le bardage n'est plus proposée ; alu, PVC et modèles sans teinte restent.
  //    Si la menuiserie cochée n'est plus de la bonne teinte (bardage changé, ou choix par défaut du site), elle passe au même modèle dans la bonne teinte.
  var TEINTES = [['vert', /autoclave vert/i, 'autoclave vert'], ['brun', /autoclave brun/i, 'autoclave brun'], ['gris', /autoclave gris/i, 'autoclave gris'], ['noir', /autoclave noir|douglas noir/i, 'autoclave noir'], ['ayous', /ayous/i, 'ayous']];
  var teinteDe = function (l) { if (/\balu\b|pvc|capotage/i.test(l)) return null; for (var i = 0; i < TEINTES.length; i++) if (TEINTES[i][1].test(l)) return TEINTES[i]; return null; };
  var norme = function (l) { return String(l || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  // modèle sans sa teinte, mots dans n'importe quel ordre : « acidifié 110x186 cm autoclave vert » = « acidifié ayous 110x186 cm »
  var modele = function (l) { return norme(l).replace(/autoclave (vert|brun|gris|noir)|douglas noir|ayous/g, ' ').replace(/(\d)\s+cm\b/g, '$1cm').split(' ').filter(Boolean).sort().join(' '); };
  function vgAssortis() {
    if (CFG.assortis === false || !M.men || !ST.cfg) return;
    var sys = ST.cfg['f-sys'] || '', b = ST.cfg['f-bard'] || '';
    var cible = /^madrier/.test(sys) && ST.cfg['f-toit'] !== 'QUADRO' ? 'vert' : { sr_vert: 'vert', sr_brun: 'brun', srn_gris: 'gris', douglas_noir: 'noir', ayous125: 'ayous', ayous_alea: 'ayous' }[b];
    var T = cible && TEINTES.filter(function (t) { return t[0] === cible; })[0], seul = null;
    Array.prototype.forEach.call(form.querySelectorAll('.wapf-field-container'), function (c) {
      if ((M.men.specific || []).indexOf(c.getAttribute('for')) < 0) return;
      var ins = Array.prototype.slice.call(c.querySelectorAll('input[type=radio]'));
      ins.forEach(function (i) {
        var l = i.getAttribute('data-wapf-label') || '', t = teinteDe(l), autre = !!(T && t && t[0] !== T[0]), sw = i.closest('.wapf-swatch') || i.closest('label');
        if (autre && i.checked && !masqueWapf(c)) { // même modèle dans la teinte du bardage
          var vise = modele(l), eq = ins.filter(function (x) { var lx = x.getAttribute('data-wapf-label') || '', tx = teinteDe(lx); return tx && tx[0] === T[0] && modele(lx) === vise; })[0];
          if (eq) { cocher(eq); autre = true; } else { autre = false; seul = l; } // pas d'équivalent : choix laissé visible, avec un message
        }
        if (sw) cacher(sw, autre && !i.checked);
      });
      // ce modèle n'existe pas dans la teinte du bardage : on ne décoche rien en douce, on le dit au client
      var al = c.querySelector('.cer-vg-alerte');
      if (seul && !al) { al = document.createElement('p'); al.className = 'cer-vg-alerte'; c.appendChild(al); }
      if (al) { if (seul) al.textContent = 'Ce modèle n\u2019existe pas en ' + T[2] + '. Pour un abri d\u2019une seule teinte, choisissez un modèle en ' + T[2] + ', en alu ou en PVC.'; al.hidden = !seul; }
      seul = null;
    });
  }
  function vignettes() {
    if (CFG.kind !== 'carport') { vgExtension(); vgHauteur(); vgToitPlat(); vgAssortis(); }
    else vgHauteurCp();
    vgProgression();
  }

  function init() {
    form = document.querySelector('form.cart');
    if (!form || !form.querySelector('.wapf-wrapper, .wapf-field-group')) return;
    build();
    form.addEventListener('change', function (e) { // saisie hors bornes : message du navigateur tout de suite, pas seulement au clic « Ajouter au panier »
      var t = e.target; if (e.isTrusted && t && t.type === 'number' && t.validity && (t.validity.rangeUnderflow || t.validity.rangeOverflow) && t.reportValidity) t.reportValidity();
      schedule();
    });
    form.addEventListener('input', function () { schedule(250); });
    // question obligatoire restée sans réponse et cachée par nos dessins : le navigateur bloquait l'ajout au panier en montrant une bulle
    // sur un bouton invisible ; on amène le client à la question, avec un message
    form.addEventListener('invalid', function (e) {
      var c = e.target.closest && e.target.closest('.wapf-field-container'); if (!c) return; e.preventDefault(); if (form._cerInv) return;
      form._cerInv = true; setTimeout(function () { form._cerInv = false; }, 600);
      var lab = ((c.querySelector('.wapf-field-label') || {}).textContent || '').replace(/[•\s]+/g, ' ').trim();
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var al = c.querySelector('.cer-oblig'); if (!al) { al = document.createElement('p'); al.className = 'cer-vg-alerte cer-oblig'; c.insertBefore(al, c.firstChild); }
      al.textContent = lab ? 'Il manque une réponse pour ajouter au panier : « ' + lab + ' »' : 'Il manque une réponse ici pour ajouter au panier.'; clearTimeout(al._t); al._t = setTimeout(function () { al.remove(); }, 9000);
    }, true);
    form.addEventListener('click', function (e) { if (e.target.closest('.wapf-add-clone, .wapf-del-clone, .wapf-swatch, label')) schedule(200); });
    new MutationObserver(function () { schedule(300); }).observe(form, { childList: true, subtree: true });
    // Ajout au panier : les vues doivent être jointes et à jour
    form.addEventListener('submit', function (e) {
      if (!LAST) return;
      var sg = signature(), v3ok = V3.sig === sg || V3.refus === sg || !window.CER_3D;
      if (sg === IMG_STATE.sig && form.querySelector('input[name="cer_plan[config]"]') && v3ok) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var sub = e.submitter;
      attach().then(function () { return vues3d(sg, sub); }).then(function () { if (form.requestSubmit) form.requestSubmit(sub || undefined); else form.submit(); });
    }, true);
    schedule(0);
  }
  window.CerConfigurateur = { read: function () { return read(); }, attach: attach, draw: draw, state: function () { return LAST; }, place: PLACE,
    setAdosSide: function (s) { adosSide = s; schedule(0); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
